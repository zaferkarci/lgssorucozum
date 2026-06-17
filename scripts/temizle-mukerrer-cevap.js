// scripts/temizle-mukerrer-cevap.js
// v4.16.6: Tek seferlik mukerrer (cift-POST) CevapKaydi temizleme.
//
//   Sorun: Cift tiklama / formun iki kez POST edilmesi yuzunden ayni
//   (kullaniciAdi + soruId) icin saniyeler arayla 2+ kayit olusmus; bu da
//   "cozulen" sayisini, gunluk hedefi ve (dogru cevapta) puan/altini sisirir.
//
//   Bu script: her (kullaniciAdi, soruId) icin kayitlari tarihe gore siralar;
//   ilkini TUTAR, son tutulan kayittan <= 5 sn sonrasini MUKERRER sayip siler.
//   Gercek tekrar cozumu (dakikalar/saatler sonra) KORUNUR.
//
//   Kullanim:
//     node scripts/temizle-mukerrer-cevap.js           -> KURU CALISMA (rapor, silme YOK)
//     node scripts/temizle-mukerrer-cevap.js --uygula   -> GERCEKTEN siler
//
//   NOT: Silmeden sonra k.puan / dersPuanlari bir sure sisik kalabilir; gece
//   cron'u (kullaniciPuanHesapla) bunlari CevapKaydi'ndan yeniden kurdugu icin
//   ertesi gun otomatik duzelir. Acil ise cron'un puan adimini elle de
//   tetikleyebilirsiniz.

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const CevapKaydi = require('../models/CevapKaydi');

const PENCERE_MS = 5000; // 5 saniye
const UYGULA = process.argv.includes('--uygula');

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    await mongoose.connect(uri);
    console.log('MongoDB baglandi. Mod:', UYGULA ? 'UYGULA (silinecek)' : 'KURU CALISMA (rapor)');

    // Tum kayitlari grup+tarih sirali cek (hafif alanlar)
    const tum = await CevapKaydi.find({}, '_id kullaniciAdi soruId tarih dogruMu')
        .sort({ kullaniciAdi: 1, soruId: 1, tarih: 1 }).lean();

    const silinecek = [];
    let prevKey = null, sonTutulanTs = null;
    for (const r of tum) {
        const key = r.kullaniciAdi + '|' + String(r.soruId);
        const ts = r.tarih ? new Date(r.tarih).getTime() : 0;
        if (key === prevKey && sonTutulanTs != null && (ts - sonTutulanTs) <= PENCERE_MS) {
            // son tutulan kayittan <= 5 sn sonra -> cift-POST -> sil
            silinecek.push(r._id);
        } else {
            // yeni grup veya gercek tekrar cozum -> TUT
            prevKey = key;
            sonTutulanTs = ts;
        }
    }

    console.log('Toplam kayit       :', tum.length);
    console.log('Mukerrer (silinecek):', silinecek.length);

    if (silinecek.length && UYGULA) {
        const sonuc = await CevapKaydi.deleteMany({ _id: { $in: silinecek } });
        console.log('SILINDI            :', sonuc.deletedCount);
        console.log('Hatirlatma: puan/dersPuanlari gece cron\'unda CevapKaydi\'ndan yeniden kurulur.');
    } else if (silinecek.length) {
        console.log('(KURU CALISMA — hicbir sey silinmedi. Silmek icin: node scripts/temizle-mukerrer-cevap.js --uygula)');
        // Ornek birkac mukerrer kaydi goster
        console.log('Ornek silinecek _id\'ler:', silinecek.slice(0, 10).map(String));
    } else {
        console.log('Mukerrer kayit bulunamadi.');
    }

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
