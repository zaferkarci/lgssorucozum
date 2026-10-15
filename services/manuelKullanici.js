// v4.17.24-1: YONETICI MANUEL KULLANICI EKLEME
//   Admin paneli > Kullanicilar > "Manuel kullanici ekle". Kullanici adi kurallari ve yan
//   etkiler (Kurum, kuruma katilma istegi, veli/kurumsal referans kodu) /kayit-yap ile aynidir.
//   Ilk sifre SISTEM tarafindan uretilen rastgele 6 haneli rakamdir (crypto.randomInt);
//   hesap "sifreDegistirmeli" ile acilir: kullanici ilk giriste /sifre-belirle ekraninda
//   kendi sifresini belirlemeden baska sayfa acamaz.
//   Sifre yalniz bcrypt ozeti olarak saklanir; acik hali yalniz bu fonksiyonun donusunde
//   (yonetici ekranina TEK SEFER gosterilmek uzere) bulunur, log/URL/veritabaninda yoktur.
'use strict';
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Kullanici = require('../models/Kullanici');

const SALT_ROUNDS = 10; // routes/auth.js ile ayni
const ROLLER = ['ogrenci', 'ogretmen', 'veli', 'kurumsal'];

function model(ad) { try { return require('../models/' + ad); } catch (e) { return null; } }
const rxKacis = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Yeni kullanici adiyla artik kaydi olan (kullanici silinmis olsa bile) koleksiyonlar:
// eski bir kullanicinin puan/takip/oyun verisi yeni hesaba karismasin (kullaniciAdiDegistir ile ayni liste)
const CAKISMA = [
    ['CevapKaydi', 'kullaniciAdi'], ['TakipIliski', 'ogretmenAdi'], ['TakipIliski', 'ogrenciAdi'],
    ['OyunOyuncu', 'kullaniciAdi'], ['TamOgrenme', 'kullaniciAdi'], ['KurumUyelikIstek', 'kullaniciAdi']
];

// 6 haneli rastgele rakam; basinda 0 yok; tahmin edilmesi kolay kaliplar elenir
//   (111111, 123456, 654321, 121212, 123123 ...)
function altiHaneliSifreUret() {
    for (;;) {
        const s = String(crypto.randomInt(100000, 1000000));
        if (/^(\d)\1{5}$/.test(s)) continue;
        if ('0123456789'.includes(s) || '9876543210'.includes(s)) continue;
        if (/^(\d\d)\1\1$/.test(s) || /^(\d\d\d)\1$/.test(s)) continue;
        return s;
    }
}

const metin = (v, en) => String(v == null ? '' : v).trim().slice(0, en);

// girdi: { kullaniciAdi, rol, email, sinif, sube, il, ilce, okul }
// donus: { ok:true, kullanici:{kullaniciAdi, rol, sinif, sube, il, ilce, okul, email}, sifre } | { ok:false, hata }
async function kullaniciOlustur(girdi) {
    girdi = girdi || {};
    const kullaniciAdi = String(girdi.kullaniciAdi == null ? '' : girdi.kullaniciAdi).trim();
    const rol = String(girdi.rol || '').trim();
    if (!ROLLER.includes(rol)) return { ok: false, hata: 'Geçerli bir rol seçin.' };

    // 1) Kullanici adi: format + kufur (kayitla ayni kurallar)
    const { kullaniciAdiKontrol, referansKoduUret } = require('../routes/auth');
    const adHata = kullaniciAdiKontrol(kullaniciAdi);
    if (adHata) return { ok: false, hata: adHata };
    const YasakliKelime = model('YasakliKelime');
    if (YasakliKelime) {
        try {
            const y = await YasakliKelime.findOne({ kelime: kullaniciAdi.toLowerCase() }).lean();
            if (y) return { ok: false, hata: 'Bu kullanıcı adı kullanılamaz.' };
        } catch (e) { /* kontrol atlanir */ }
    }

    // 2) Benzersizlik: ayni ad, buyuk/kucuk harf farki, baska kullanicinin eski adi, eski kayitlar
    const rx = new RegExp('^' + rxKacis(kullaniciAdi) + '$', 'i');
    const varMi = await Kullanici.findOne({ kullaniciAdi: rx }, 'kullaniciAdi').lean();
    if (varMi) {
        return { ok: false, hata: varMi.kullaniciAdi === kullaniciAdi
            ? 'Bu kullanıcı adı alınmış.'
            : '"' + varMi.kullaniciAdi + '" adı zaten var (büyük/küçük harf farkı).' };
    }
    const eskiAd = await Kullanici.findOne({ eskiAdlar: rx }, 'kullaniciAdi').lean();
    if (eskiAd) return { ok: false, hata: 'Bu ad daha önce başka bir kullanıcıya aitti ("' + eskiAd.kullaniciAdi + '" olarak değiştirildi). Başka bir ad seçin.' };
    for (const [m, alan] of CAKISMA) {
        const M = model(m); if (!M) continue;
        const n = await M.countDocuments({ [alan]: kullaniciAdi });
        if (n) return { ok: false, hata: 'Bu ada ait eski kayıtlar var (' + m + '). Başka bir ad seçin.' };
    }

    // 3) Diger alanlar
    const email = String(girdi.email == null ? '' : girdi.email).trim().toLowerCase(); // sifre sifirlama e-postayi kucuk harfle arar
    if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { ok: false, hata: 'E-posta adresi geçersiz görünüyor.' };
    const il = metin(girdi.il, 80), ilce = metin(girdi.ilce, 80), okul = metin(girdi.okul, 160);
    if (rol === 'kurumsal' && !okul) return { ok: false, hata: 'Kurumsal hesap için il, ilçe ve okul (kurum) seçilmeli.' };

    let sinif = null, sube = '';
    if (rol === 'ogrenci') {
        sinif = parseInt(girdi.sinif, 10);
        if (!Number.isInteger(sinif) || sinif < 1 || sinif > 13) return { ok: false, hata: 'Öğrenci için sınıf seçilmeli.' };
        sube = String(girdi.sube == null ? '' : girdi.sube).trim().toUpperCase();
        if (sube && !/^[A-Z]$/.test(sube)) return { ok: false, hata: 'Şube A-Z arası tek harf olmalı.' };
    }

    // 4) Hesabi olustur (kayit-yap ile ayni alanlar)
    const sifre = altiHaneliSifreUret();
    const veri = {
        kullaniciAdi, email,
        sifre: await bcrypt.hash(sifre, SALT_ROUNDS),
        il, ilce, okul, rol,
        sifreDegistirmeli: true // ilk giriste kendi sifresini belirlemeden baska sayfa acilmaz
    };
    if (rol === 'kurumsal') { veri.rolListesi = ['kurumsal', 'ogretmen']; veri.aktifRol = 'kurumsal'; }
    else { veri.rolListesi = [rol]; veri.aktifRol = rol; }
    if (rol === 'ogrenci') { veri.sinif = sinif; veri.sube = sube; }
    else if (rol === 'veli') { veri.sinif = null; veri.sube = ''; }

    let yeni;
    try {
        yeni = await new Kullanici(veri).save();
    } catch (e) {
        if (e && e.code === 11000) return { ok: false, hata: 'Bu kullanıcı adı alınmış.' };
        throw e;
    }

    // 5) Yan etkiler — /kayit-yap ile ayni; hicbiri hesabin olusmasini engellemez
    const Kurum = model('Kurum'), KurumUyelikIstek = model('KurumUyelikIstek');
    if (rol === 'kurumsal' && Kurum) {
        try {
            const yeniKurum = await new Kurum({ ad: okul, tip: 'okul', il, ilce, olusturanKullaniciAdi: kullaniciAdi }).save();
            yeni.yonettigiKurumId = yeniKurum._id;
            await yeni.save();
            if (KurumUyelikIstek) {
                try {
                    const mevcutUyeler = await Kullanici.find({
                        rol: { $in: ['ogretmen', 'ogrenci'] }, okul, il: il || '', ilce: ilce || '', bagliKurumId: null
                    }, 'kullaniciAdi rol').lean();
                    for (const u of mevcutUyeler) {
                        try { await new KurumUyelikIstek({ kullaniciAdi: u.kullaniciAdi, kullaniciRol: u.rol, kurumId: yeniKurum._id }).save(); }
                        catch (e) { if (e.code !== 11000) console.error('[kullanici-ekle] Toplu istek hatasi:', e.message); }
                    }
                } catch (e) { /* sessiz */ }
            }
        } catch (e) { console.error('[kullanici-ekle] Kurum olusturma hatasi:', e.message); }
    }
    if ((rol === 'ogretmen' || rol === 'ogrenci') && okul && Kurum && KurumUyelikIstek) {
        try {
            const eslesenKurum = await Kurum.findOne({ ad: okul, il: il || '', ilce: ilce || '' });
            if (eslesenKurum) await new KurumUyelikIstek({ kullaniciAdi, kullaniciRol: rol, kurumId: eslesenKurum._id }).save();
        } catch (e) { if (e.code !== 11000) console.error('[kullanici-ekle] Otomatik kurum istegi hatasi:', e.message); }
    }
    // kayit-yap: ogrenci ve ogretmen disindakiler (veli, kurumsal) 2 adet ogrenci davet kodu alir
    if (rol !== 'ogrenci' && rol !== 'ogretmen') {
        try { await referansKoduUret(kullaniciAdi, 2, 'ogrenci'); }
        catch (e) { console.error('[kullanici-ekle] Referans kodu hatasi:', e.message); }
    }

    return {
        ok: true,
        sifre,
        kullanici: { kullaniciAdi, rol, sinif: rol === 'ogrenci' ? sinif : null, sube, il, ilce, okul, email }
    };
}

module.exports = { kullaniciOlustur, altiHaneliSifreUret, ROLLER };
