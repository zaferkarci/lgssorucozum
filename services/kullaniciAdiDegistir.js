// v4.17.21-1: YONETICI KULLANICI ADI DEGISTIRME
//   Kullanici adi pek cok koleksiyonda yabanci anahtar olarak tutulur; hepsi
//   birlikte guncellenir ki kullanicinin puanlari, takipleri, mesajlari, oyun
//   topraklari vb. kopmasin. Eski ad Kullanici.eskiAdlar'a eklenir (eski adla
//   dogru sifre girilirse giris yapilir ve yeni ad gosterilir).
//   Islem tekrar calistirilabilir: yarida kalirsa ayni eski->yeni ile tekrar
//   cagrildiginda kalan koleksiyonlari tamamlar.
const mongoose = require('mongoose');
const Kullanici = require('../models/Kullanici');

// [model, alan] — duz String alanlar
const ALANLAR = [
    ['CevapKaydi', 'kullaniciAdi'],
    ['TakipIliski', 'ogretmenAdi'],
    ['TakipIliski', 'ogrenciAdi'],
    ['Mesaj', 'kullaniciAdi'],
    ['ReferansKodu', 'olusturan'],
    ['ReferansKodu', 'kullanan'],
    ['ReferansKodu', 'oncekiOlusturan'],
    ['ReferansKodu', 'aileVeli'],
    ['OyunOyuncu', 'kullaniciAdi'],
    ['OyunHucre', 'sahip'],
    ['DuelloKayit', 'saldiranAd'],
    ['DuelloKayit', 'rakipAd'],
    ['DuelloKayit', 'kazananAd'],
    ['TamOgrenme', 'kullaniciAdi'],
    ['KurumUyelikIstek', 'kullaniciAdi'],
    ['KurumUyelikIstek', 'yanitlayan'],
    ['Kurum', 'olusturanKullaniciAdi'],
    ['PasswordReset', 'kullaniciAdi']
];
// [model, dizi alan] — String dizileri
const DIZILER = [
    ['Duyuru', 'hedefKullanicilar'],
    ['KurumSinif', 'atananOgretmenler']
];
// Yeni adla artik kaydi olan (kullanici silinmis olsa bile) koleksiyonlar: cakisma kontrolu
const CAKISMA = [
    ['CevapKaydi', 'kullaniciAdi'], ['TakipIliski', 'ogretmenAdi'], ['TakipIliski', 'ogrenciAdi'],
    ['OyunOyuncu', 'kullaniciAdi'], ['TamOgrenme', 'kullaniciAdi'], ['KurumUyelikIstek', 'kullaniciAdi']
];

function model(ad) { try { return require('../models/' + ad); } catch (e) { return null; } }
const rxKacis = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function kullaniciAdiDegistir(eski, yeni) {
    eski = String(eski || '').trim();
    yeni = String(yeni || '').trim();
    if (!eski || !yeni) return { ok: false, hata: 'Eski ve yeni kullanıcı adı gerekli.' };
    if (eski === yeni) return { ok: false, hata: 'Yeni ad eskisiyle aynı.' };

    // Format + kufur kontrolu (kayit ile ayni kurallar)
    const { kullaniciAdiKontrol } = require('../routes/auth');
    const hata = kullaniciAdiKontrol(yeni);
    if (hata) return { ok: false, hata };
    try {
        const YasakliKelime = model('YasakliKelime');
        if (YasakliKelime) {
            const y = await YasakliKelime.findOne({ kelime: yeni.toLowerCase() }).lean();
            if (y) return { ok: false, hata: 'Bu kullanıcı adı kullanılamaz.' };
        }
    } catch (e) { /* model yoksa atla */ }

    let devam = false; // yarida kalmis islemi tamamlama
    const kEski = await Kullanici.findOne({ kullaniciAdi: eski }, '_id').lean();
    const kYeni = await Kullanici.findOne({ kullaniciAdi: yeni }, '_id eskiAdlar').lean();
    if (kEski && kYeni) return { ok: false, hata: '"' + yeni + '" adı başka bir kullanıcıda.' };
    if (!kEski) {
        if (kYeni && (kYeni.eskiAdlar || []).includes(eski)) devam = true;
        else return { ok: false, hata: '"' + eski + '" adlı kullanıcı bulunamadı.' };
    }
    // Buyuk/kucuk harf farkiyla ayni ad baskasinda mi? (giriste karisiklik olmasin)
    if (!devam) {
        const benzer = await Kullanici.findOne({ kullaniciAdi: new RegExp('^' + rxKacis(yeni) + '$', 'i') }, 'kullaniciAdi').lean();
        if (benzer && benzer.kullaniciAdi !== eski) return { ok: false, hata: '"' + benzer.kullaniciAdi + '" adı zaten var (büyük/küçük harf farkı).' };
        for (const [m, alan] of CAKISMA) {
            const M = model(m); if (!M) continue;
            const n = await M.countDocuments({ [alan]: yeni });
            if (n) return { ok: false, hata: '"' + yeni + '" adına ait eski kayıtlar var (' + m + '). Başka bir ad seç.' };
        }
        // Once kullaniciyi guncelle: unique index adi "rezerve" eder
        await Kullanici.updateOne({ kullaniciAdi: eski }, { $set: { kullaniciAdi: yeni }, $addToSet: { eskiAdlar: eski } });
    }

    const ozet = { Kullanici: devam ? 0 : 1 };
    // Panel mesajlarinda adSoyad alani kullanici adini tasir
    const Mesaj = model('Mesaj');
    if (Mesaj) {
        const r = await Mesaj.updateMany({ adSoyad: eski, kullaniciAdi: { $in: [eski, yeni] } }, { $set: { adSoyad: yeni } });
        ozet['Mesaj.adSoyad'] = r.modifiedCount || 0;
    }
    for (const [m, alan] of ALANLAR) {
        const M = model(m); if (!M) continue;
        const r = await M.updateMany({ [alan]: eski }, { $set: { [alan]: yeni } });
        if (r.modifiedCount) ozet[m + '.' + alan] = (ozet[m + '.' + alan] || 0) + r.modifiedCount;
    }
    for (const [m, alan] of DIZILER) {
        const M = model(m); if (!M) continue;
        const docs = await M.find({ [alan]: eski }, alan).lean();
        for (const d of docs) {
            const arr = (d[alan] || []).map(x => (x === eski ? yeni : x));
            await M.updateOne({ _id: d._id }, { $set: { [alan]: arr } });
        }
        if (docs.length) ozet[m + '.' + alan] = docs.length;
    }
    // Acik oturumlari kapat: eski adla oturum artik gecersiz (kullanici yeniden giris yapar)
    try {
        const r = await mongoose.connection.db.collection('sessions').deleteMany({
            session: { $regex: '"kullaniciAdi":"' + rxKacis(eski) + '"' }
        });
        ozet.oturumKapatildi = r.deletedCount || 0;
    } catch (e) { ozet.oturumKapatildi = 'hata: ' + e.message; }

    console.log('[kullanici-adi-degistir] ' + eski + ' -> ' + yeni + (devam ? ' (devam)' : ''), JSON.stringify(ozet));
    return { ok: true, eski, yeni, devam, ozet };
}

module.exports = { kullaniciAdiDegistir };
