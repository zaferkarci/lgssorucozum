// services/tamOgrenme.js — v4.17.0
// TAM OGRENME: 1. unite 1. konudan baslayarak, her konuyu hedef soru sayisi ve
// basari esigiyle tamamlatan calisma modu.
//
// Kurallar (admin ayarlarindan):
//   tam_ogrenme_soru  -> konu basina hedef soru sayisi (0 = ozellik PASIF)
//   tam_ogrenme_esik  -> basari esigi, yuzde (varsayilan 85)
//
// Bir konu "tamamlandi" sayilir:  cevapSayisi >= hedefSoru  VE  basari >= esik
//   (basari, o konudaki TUM cevaplar uzerinden hesaplanir — analiz/zayif konu dahil)
//   Istisna: konuda yayindaki soru sayisi hedefin altindaysa ve ogrenci o konudaki
//   TUM sorulari cozmusse, konu tamamlanmis sayilir (sonsuz dongu olmasin).
//
// Sira: ilk TAMAMLANMAMIS konu hedeftir. Tekrar turunda eski bir konu esigin
// altina duserse, sirada once geldigi icin otomatik olarak yeniden hedef olur.

const Unite = require('../models/Unite');
const KonuIzin = require('../models/KonuIzin');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const Ayar = require('../models/Ayar');
const TamOgrenme = require('../models/TamOgrenme');

// Admin ayarlarini oku
async function ayarlariOku() {
    let hedefSoru = 10, esik = 85;
    try {
        const a = await Ayar.findOne({ anahtar: 'tam_ogrenme_soru' }).lean();
        if (a && typeof a.deger === 'number' && a.deger >= 0) hedefSoru = Math.floor(a.deger);
        const b = await Ayar.findOne({ anahtar: 'tam_ogrenme_esik' }).lean();
        if (b && typeof b.deger === 'number' && b.deger >= 1) esik = Math.floor(b.deger);
    } catch (e) { /* varsayilanlar */ }
    return { hedefSoru, esik, aktif: hedefSoru > 0 };
}

// Sirali konu listesi: [{ unite, konu }] — kapali konular haric
async function konuListesi(sinif, ders) {
    const uniteler = await Unite.find({ sinif: String(sinif), ders })
        .sort({ sira: 1, uniteNo: 1 }).lean();
    const kapaliKayitlar = await KonuIzin.find({ sinif: String(sinif), ders, acik: false }).lean();
    const kapali = new Set(kapaliKayitlar.map(k => (k.unite || '') + '||' + (k.konu || '')));

    const liste = [];
    uniteler.forEach(u => {
        (u.konular || []).forEach(kn => {
            if (!kn) return;
            if (kapali.has((u.uniteAdi || '') + '||' + kn)) return;
            liste.push({ unite: u.uniteAdi || '', konu: kn });
        });
    });
    return liste;
}

// Her konu icin: cevapSayisi, dogru, basari%, yayindaki soru sayisi, cozulen soru id'leri
async function konuDurumlari(k, ders, ayar) {
    const sinif = String(k.sinif);
    const liste = await konuListesi(sinif, ders);

    const sorular = await Soru.find({ sinif, ders, durum: 'yayinda' }, 'unite konu').lean();
    const soruBilgi = new Map(sorular.map(s => [String(s._id), { unite: s.unite || '', konu: s.konu || '' }]));

    // konu anahtarina gore yayindaki soru sayisi
    const yayindaSayi = {};
    sorular.forEach(s => {
        const key = (s.unite || '') + '||' + (s.konu || '');
        yayindaSayi[key] = (yayindaSayi[key] || 0) + 1;
    });

    const baslangic = k.sonSinifAtlamaTarihi || new Date(0);
    const cevaplar = await CevapKaydi.find(
        { kullaniciAdi: k.kullaniciAdi, tarih: { $gte: baslangic } },
        'soruId dogruMu'
    ).lean();

    const istat = {};
    const cozulen = new Set();
    cevaplar.forEach(c => {
        const sb = soruBilgi.get(String(c.soruId));
        if (!sb) return;
        cozulen.add(String(c.soruId));
        const key = sb.unite + '||' + sb.konu;
        if (!istat[key]) istat[key] = { toplam: 0, dogru: 0 };
        istat[key].toplam++;
        if (c.dogruMu) istat[key].dogru++;
    });

    return liste.map(x => {
        const key = x.unite + '||' + x.konu;
        const st = istat[key] || { toplam: 0, dogru: 0 };
        const mevcut = yayindaSayi[key] || 0;
        const basari = st.toplam > 0 ? Math.round((st.dogru / st.toplam) * 100) : 0;
        // Soru sayisi hedefin altindaysa: tum sorular cozulduyse tamamlanmis say
        const soruYetersiz = mevcut > 0 && mevcut < ayar.hedefSoru;
        const hepsiCozuldu = mevcut > 0 && st.toplam >= mevcut;
        const yeterliSoru = st.toplam >= ayar.hedefSoru;
        const tamamlandi = mevcut === 0
            ? true
            : ((yeterliSoru || (soruYetersiz && hepsiCozuldu)) && basari >= ayar.esik);
        return {
            unite: x.unite, konu: x.konu,
            cevap: st.toplam, dogru: st.dogru, basari,
            yayindaSoru: mevcut, tamamlandi,
            soruKaldiMi: mevcut > 0
        };
    });
}

// Ogrencinin bu derste sirasi gelen konusu + ozet durum
async function durumHesapla(k, ders) {
    const ayar = await ayarlariOku();
    if (!ayar.aktif) return { aktif: false };

    const durumlar = await konuDurumlari(k, ders, ayar);
    if (!durumlar.length) return { aktif: true, ders, konuYok: true };

    const tamamlanan = durumlar.filter(d => d.tamamlandi);
    const hedef = durumlar.find(d => !d.tamamlandi) || null;

    return {
        aktif: true,
        ders,
        ayar,
        durumlar,
        tamamlananSayi: tamamlanan.length,
        toplamKonu: durumlar.length,
        hedef,                       // null ise ders bitmis
        bitti: !hedef
    };
}

// Siradaki sorunun cekilecegi konuyu belirle (tekrar turu dahil) ve durumu ilerlet.
//   Donus: { unite, konu, tekrarMi } | null
async function sonrakiKonu(k, ders) {
    const ayar = await ayarlariOku();
    if (!ayar.aktif) return null;

    const sinif = String(k.sinif);
    let st = await TamOgrenme.findOne({ kullaniciAdi: k.kullaniciAdi, sinif, ders });
    if (!st) {
        st = new TamOgrenme({ kullaniciAdi: k.kullaniciAdi, sinif, ders, blokSayac: 0, tekrarKuyrugu: [] });
    }

    const durumlar = await konuDurumlari(k, ders, ayar);
    if (!durumlar.length) return null;

    // 1) Tekrar kuyrugunda konu varsa once onu sor
    while (st.tekrarKuyrugu.length) {
        const key = st.tekrarKuyrugu[0];
        const [u, kn] = key.split('||');
        const d = durumlar.find(x => x.unite === u && x.konu === kn);
        if (d && d.soruKaldiMi) {
            st.tekrarKuyrugu.shift();
            st.guncelleme = new Date();
            await st.save();
            return { unite: u, konu: kn, tekrarMi: true };
        }
        st.tekrarKuyrugu.shift(); // gecersiz/soru kalmamis konuyu at
    }

    // 2) Sirasi gelen (ilk tamamlanmamis) konu
    const hedef = durumlar.find(d => !d.tamamlandi && d.soruKaldiMi);
    if (!hedef) { await st.save(); return null; } // ders bitmis

    st.blokSayac = (st.blokSayac || 0) + 1;
    // 3) Blok dolunca tekrar turu kur: tamamlanan her konudan 2'ser soru
    if (st.blokSayac >= ayar.hedefSoru) {
        st.blokSayac = 0;
        const kuyruk = [];
        durumlar.forEach(d => {
            if (d.tamamlandi && d.soruKaldiMi) {
                const key = d.unite + '||' + d.konu;
                kuyruk.push(key, key);
            }
        });
        st.tekrarKuyrugu = kuyruk;
    }
    st.guncelleme = new Date();
    await st.save();
    return { unite: hedef.unite, konu: hedef.konu, tekrarMi: false };
}

module.exports = { ayarlariOku, konuListesi, konuDurumlari, durumHesapla, sonrakiKonu };
