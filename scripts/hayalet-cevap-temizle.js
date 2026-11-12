// scripts/hayalet-cevap-temizle.js
// v4.17.36: TEK SEFERLIK — cift / hayalet dokunmayla olusmus cevap kayitlarini bulur ve (istenirse) siler.
//
//   Iki tur:
//     CIFT     : ayni ogrenci AYNI soruya 2,5 sn icinde iki kez cevap kaydi -> ikinci kayit fazladan (puan/istatistik iki kez sayiliyor)
//     HAYALET  : bir cevaptan 2,5 sn icinde, BASKA bir soruya en fazla 2 sn'lik cevap -> ogrenci o soruyu gormeden
//                telefonun ikinci dokunusu isaretlemis ("kendi kendine isaretlendi")
//   v4.17.36'dan itibaren site bu tur istekleri zaten yazmiyor; bu komut eski kayitlari temizler.
//
//   Kullanim (proje klasorunde):
//     node scripts/hayalet-cevap-temizle.js            -> YALNIZ LISTELER (son 120 gun), hicbir sey degismez
//     node scripts/hayalet-cevap-temizle.js --gun=365  -> daha uzun donem
//     node scripts/hayalet-cevap-temizle.js --uygula   -> listelenen FAZLADAN kayitlari siler
//
//   Silinen hayalet cevabin sorusu ogrenciye yeniden gelir (gormeden isaretlenmisti). Puanlar, soru istatistikleri ve
//   cozulen sayilari bir sonraki gece hesabinda (05:10) yeniden hesaplanir.

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');

const arg = process.argv.slice(2);
const UYGULA = arg.includes('--uygula');
const _g = Number(((arg.find(a => a.startsWith('--gun=')) || '').split('=')[1]) || 120);
const GUN = Number.isFinite(_g) && _g > 0 ? _g : 120;
const ARALIK_MS = 2500;
const HAYALET_SURE = 2;

function tr(t) { return new Date(new Date(t).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '); }

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);
    const bas = new Date(Date.now() - GUN * 86400000);
    const l = await CevapKaydi.find({ tarih: { $gte: bas } }, 'kullaniciAdi soruId sure dogruMu tarih').sort({ kullaniciAdi: 1, tarih: 1 }).lean();
    const no = {};
    (await Soru.find({ _id: { $in: [...new Set(l.map(c => String(c.soruId)))] } }, 'soruNo').lean()).forEach(s => { no[String(s._id)] = s.soruNo; });

    const silinecek = [];
    console.log('HAYALET / CIFT CEVAP TARAMASI ' + (UYGULA ? '(UYGULA)' : '(yalniz listeler, hicbir sey degismez)') + ' — son ' + GUN + ' gun, ' + l.length + ' cevap');
    console.log('\nTUR       KULLANICI            TARIH(TR)         ONCEKI (soru sure sonuc)  ->  SILINECEK (soru sure sonuc)  ARA');
    for (let i = 1; i < l.length; i++) {
        const a = l[i - 1], b = l[i];
        if (a.kullaniciAdi !== b.kullaniciAdi) continue;
        const ara = new Date(b.tarih) - new Date(a.tarih);
        if (ara < 0 || ara >= ARALIK_MS) continue;
        const ayni = String(a.soruId) === String(b.soruId);
        let tur = '';
        if (ayni) tur = 'CIFT';
        else if ((b.sure || 0) <= HAYALET_SURE) tur = 'HAYALET';
        if (!tur) continue;
        silinecek.push(b._id);
        console.log(tur.padEnd(9) + ' ' + String(b.kullaniciAdi).padEnd(20) + ' ' + tr(a.tarih) + '   ' +
            String(no[String(a.soruId)] || '?').padStart(5) + ' ' + String(a.sure).padStart(4) + ' ' + (a.dogruMu ? 'D' : 'Y') + '               ->  ' +
            String(no[String(b.soruId)] || '?').padStart(5) + ' ' + String(b.sure).padStart(4) + ' ' + (b.dogruMu ? 'D' : 'Y') + '             ' + (ara / 1000).toFixed(1) + ' sn');
    }
    console.log('\nOZET: silinecek fazladan kayit ' + silinecek.length);
    if (!UYGULA) {
        console.log('(Yalniz listelendi; veritabaninda hicbir sey degismedi. Silmek icin ayni komutu --uygula ile calistirin.)');
        await mongoose.disconnect();
        return;
    }
    const r = silinecek.length ? await CevapKaydi.deleteMany({ _id: { $in: silinecek } }) : { deletedCount: 0 };
    console.log('UYGULANDI: ' + r.deletedCount + ' kayit silindi. Puanlar ve istatistikler sabah 05:10\'daki gece hesabinda guncellenir.');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
