// scripts/cevap-duzelt.js
// v4.17.31: TEK SEFERLIK DUZELTME — bir soruda iki sik ayni girildigi icin YANLIS sayilan cevaplari "dogru" yapar.
//
//   Ornek: 599 numarali soruda A ve D siklari ayni girilmis, dogru cevap D. A'yi isaretleyenler yanlis sayilmis.
//
//   Kullanim (proje klasorunde):
//     node scripts/cevap-duzelt.js 599 A                     -> YALNIZ LISTELER, hicbir sey degismez
//     node scripts/cevap-duzelt.js 599 A --adlar             -> ogrenci adlarini da yazar (varsayilan: ogr1, ogr2...)
//     node scripts/cevap-duzelt.js 599 A --kullanici=alpay   -> yalniz bu kullanicinin kayitlari
//     node scripts/cevap-duzelt.js 599 A --uygula            -> listelenen kayitlari "dogru" yapar
//
//   Ne yapar:
//     - Sorunun A siki ile dogru siki (ornekte D) metin ve gorsel olarak AYNI mi kontrol eder; ayni degilse durur
//       (gercekten farkli bir sikki dogru saymak istiyorsaniz --zorla ekleyin).
//     - O soruda A'yi secip yanlis sayilmis kayitlari bulur (secilen sik v4.17.24'ten beri kaydediliyor).
//     - --kullanici verildiyse ve kaydinda secilen sik yoksa (eski kayit), o kullanicinin bu sorudaki yanlis kaydi da
//       listeye alinir (siz o kisinin A'yi sectigini bildiginiz icin); bu durum listede ayrica belirtilir.
//     - --uygula ile bu kayitlarin dogruMu alani true yapilir. Puan, sorunun dogru sayisi ve zorlugu bir sonraki
//       gece hesabinda (05:10) normal formulle hesaplanir.
//     - "Gecilip tekrar cozulmus" (ikinciKezMi) kayitlarin puanini gece hesabi yeniden hesaplamaz, kayittaki puani kullanir.
//       Bu kayitlara bugunku formulle puanin 1/5'i yazilir (en az bir kez gecilmis sayilir; /cevap'taki kuralla ayni).
//     - Sorunun kendisine (siklar, dogru cevap) DOKUNMAZ. Ayni girilen siki admin panelinden ayrica duzeltin.

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');

const arg = process.argv.slice(2);
const UYGULA = arg.includes('--uygula');
const ADLAR = arg.includes('--adlar');
const ZORLA = arg.includes('--zorla');
const KULLANICI = ((arg.find(a => a.startsWith('--kullanici=')) || '').split('=')[1] || '').trim();
const yalin = arg.filter(a => !a.startsWith('--'));
const SORU_NO = Number(yalin[0]);
const HARF = String(yalin[1] || '').toUpperCase();
const HARFLER = ['A', 'B', 'C', 'D'];
const IDX = HARFLER.indexOf(HARF);

// cronJobs.js _cronPuan ile ayni formul (ikinciKezMi kayitlari icin)
function stdSapma(d) {
    if (!d || d.length < 2) return 0;
    const o = d.reduce((a, b) => a + b, 0) / d.length;
    return Math.sqrt(d.reduce((a, b) => a + Math.pow(b - o, 2), 0) / d.length);
}
function cronPuan(s, sure) {
    const T_ref = s.ortalamaSure || 60;
    const T_ogr = sure || T_ref;
    const T_min = 10;
    const T_ogr_eff = Math.max(T_ogr, T_min);
    const logHiz = Math.log2(1 + (T_ref / T_ogr_eff));
    const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
    const hizBileseni = logMax * Math.tanh(logHiz / logMax);
    const Z = (typeof s.zorlukKatsayisi === 'number') ? s.zorlukKatsayisi : 3;
    const GE = 0.02 + 0.08 * Math.min(stdSapma(s.cozumSureleriTum || []) / (T_ref || 1), 1);
    return Math.round(Math.max(Z * T_ref * hizBileseni * GE, 0) * 10000) / 10000;
}
function sikYazi(sk) {
    if (!sk) return '';
    return String(sk.metin || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function tarihYaz(t) {
    if (!t) return '-';
    return new Date(new Date(t).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '); // Istanbul
}

async function main() {
    if (!Number.isFinite(SORU_NO) || IDX < 0) {
        console.log('Kullanim: node scripts/cevap-duzelt.js <soruNo> <A|B|C|D> [--kullanici=ad] [--adlar] [--uygula]');
        process.exit(1);
    }
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);

    const s = await Soru.findOne({ soruNo: SORU_NO }).lean();
    if (!s) { console.log('Soru ' + SORU_NO + ' bulunamadi.'); await mongoose.disconnect(); return; }
    const dIdx = s.dogruCevapIndex;
    const sec = s.secenekler || [];
    console.log('SORU ' + SORU_NO + ' | ' + [s.sinif ? s.sinif + '. sinif' : '', s.ders, s.konu].filter(Boolean).join(' / '));
    sec.forEach((sk, i) => console.log('  ' + HARFLER[i] + ') ' + (sikYazi(sk) || '(metin yok)') + (sk && sk.gorsel ? '  [gorsel: ' + sk.gorsel + ']' : '') + (i === dIdx ? '   <- kayitli dogru cevap' : '')));
    if (IDX === dIdx) { console.log('\n' + HARF + ' zaten kayitli dogru cevap; duzeltilecek bir sey yok.'); await mongoose.disconnect(); return; }
    if (!sec[IDX]) { console.log('\nBu soruda ' + HARF + ' siki yok.'); await mongoose.disconnect(); return; }
    const ayni = sikYazi(sec[IDX]) === sikYazi(sec[dIdx]) && String(sec[IDX].gorsel || '') === String(sec[dIdx].gorsel || '');
    if (!ayni) {
        console.log('\nDIKKAT: ' + HARF + ' siki dogru sik (' + HARFLER[dIdx] + ') ile AYNI DEGIL.');
        if (!ZORLA) { console.log('Yine de ' + HARF + "'yi dogru saymak istiyorsaniz --zorla ekleyin. Hicbir sey degismedi."); await mongoose.disconnect(); return; }
        console.log('--zorla verildi; devam ediliyor.');
    } else {
        console.log('\n' + HARF + ' ve ' + HARFLER[dIdx] + ' siklari ayni (metin ve gorsel).');
    }

    const filtre = { soruId: s._id, dogruMu: { $ne: true } };
    if (KULLANICI) filtre.kullaniciAdi = KULLANICI;
    const yanlislar = await CevapKaydi.find(filtre).sort({ tarih: 1 }).lean();
    const hedef = [], belirsiz = [], baska = [];
    yanlislar.forEach(c => {
        if (c.secilenIndex === IDX) hedef.push({ c, not: '' });
        else if (c.secilenIndex == null) { if (KULLANICI) hedef.push({ c, not: 'secilen sik kayitli degil (eski kayit) — kullanici adina gore alindi' }); else belirsiz.push(c); }
        else baska.push(c);
    });

    const adMap = {}; let adSay = 0;
    const adGoster = a => (ADLAR || (KULLANICI && a === KULLANICI)) ? a : (adMap[a] || (adMap[a] = 'ogr' + (++adSay)));
    console.log('\nDUZELTILECEK KAYITLAR (' + hedef.length + '):');
    if (!hedef.length) console.log('  (yok)');
    const yeniPuan = {};
    hedef.forEach(({ c, not }, i) => {
        let ek = '';
        if (c.ikinciKezMi) { yeniPuan[c._id] = Math.round(cronPuan(s, c.sure) / 5 * 10000) / 10000; ek = '  gecilip tekrar cozulmus -> yazilacak puan ' + yeniPuan[c._id]; }
        console.log('  ' + (i + 1) + '. ' + tarihYaz(c.tarih) + '  ' + adGoster(c.kullaniciAdi) + '  sure ' + c.sure + ' sn  secilen ' + (c.secilenIndex == null ? '?' : HARFLER[c.secilenIndex]) + ek + (not ? '  (' + not + ')' : ''));
    });
    if (belirsiz.length) {
        console.log('\nSECILEN SIKKI KAYITLI OLMAYAN YANLIS KAYITLAR (' + belirsiz.length + ') — bunlara DOKUNULMAZ:');
        belirsiz.forEach(c => console.log('  ' + tarihYaz(c.tarih) + '  ' + adGoster(c.kullaniciAdi)));
        console.log('  (Bu kisilerden birinin ' + HARF + "'yi sectigini biliyorsaniz: --kullanici=<ad> ile ayrica calistirin.)");
    }
    if (baska.length) console.log('\nBaska bir sikki secip yanlis sayilan ' + baska.length + ' kayda dokunulmaz.');

    if (!UYGULA) {
        console.log('\n(Yalniz listelendi; veritabaninda hicbir sey degismedi. Uygulamak icin ayni komutu --uygula ile calistirin.)');
        await mongoose.disconnect();
        return;
    }
    let n = 0;
    for (const { c } of hedef) {
        const set = { dogruMu: true };
        if (c.ikinciKezMi) set.kazanilanPuan = yeniPuan[c._id];
        const r = await CevapKaydi.updateOne({ _id: c._id, dogruMu: { $ne: true } }, { $set: set });
        n += r.modifiedCount || 0;
    }
    console.log('\nUYGULANDI: ' + n + ' kayit "dogru" yapildi.');
    console.log('Puanlar, sorunun dogru sayisi ve zorlugu bir sonraki gece hesabinda (05:10) guncellenir.');
    console.log('Sorudaki ayni girilmis siki admin panelinden duzeltmeyi unutmayin.');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
