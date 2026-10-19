// scripts/soru-incele.js
// v4.17.27-3: YALNIZ OKUR — bir veya birkac sorunun zorluk (Z) ve ham puan (HP) hesabini tum ham verisiyle gosterir.
//   Veritabaninda HICBIR SEY DEGISTIRMEZ.
//
//   Kullanim (proje klasorunde):
//     node scripts/soru-incele.js 220 226          -> soruNo 220 ve 226
//     node scripts/soru-incele.js 220 --adlar      -> ogrenci adlarini da yazar (varsayilan: "ogr1, ogr2..." diye gizler)
//
//   Gosterdikleri:
//     1) Sorunun kayitli alanlari (cozulme, dogru, ortalama sure, Z, HP)
//     2) Tum cevap kayitlari (tarih, ogrenci, dogru/yanlis, sure, kazanilan puan, ikinci kez mi)
//     3) Sure dagilimi (en kisa, medyan, en uzun, 1-2 sn ve 5/10 dk ustu sayilari)
//     4) Z ve HP'nin cronJobs.js ile BIREBIR ayni formulle yeniden hesabi ve bilesenleri (D, S, sigma, GE, hiz)

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');

const ADLAR = process.argv.includes('--adlar');
const NOLAR = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);

// --- cronJobs.js ile ayni yardimcilar ---
function stdSapma(d) {
    if (!d || d.length < 2) return 0;
    const o = d.reduce((a, b) => a + b, 0) / d.length;
    return Math.sqrt(d.reduce((a, b) => a + Math.pow(b - o, 2), 0) / d.length);
}
function dogruOraniKademesi(o) { if (o <= 0.20) return 5; if (o <= 0.40) return 4; if (o <= 0.60) return 3; if (o <= 0.80) return 2; return 1; }
function sureKademesi(s) { if (s <= 30) return 1; if (s <= 60) return 2; if (s <= 120) return 3; if (s <= 180) return 4; return 5; }
function medyan(d) { if (!d.length) return 0; const s = [...d].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
const r2 = x => (x == null || Number.isNaN(x)) ? '-' : (Math.round(x * 100) / 100).toString();
const r4 = x => (x == null || Number.isNaN(x)) ? '-' : (Math.round(x * 10000) / 10000).toString();
function tarihYaz(t) {
    if (!t) return '-';
    const d = new Date(new Date(t).getTime() + 3 * 3600 * 1000); // Istanbul
    return d.toISOString().slice(0, 16).replace('T', ' ');
}
function sag(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
function sol(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

async function incele(no) {
    const s = await Soru.findOne({ soruNo: no }).lean();
    if (!s) { console.log('\n=== Soru ' + no + ': BULUNAMADI'); return; }
    console.log('\n' + '='.repeat(78));
    console.log('SORU ' + no + '  |  ' + [s.sinif + '. sinif', s.ders, s.unite, s.konu].filter(Boolean).join(' / '));
    console.log('Durum: ' + (s.durum || '-') + '   id: ' + s._id);
    console.log('-'.repeat(78));
    console.log('KAYITLI ALANLAR: cozulme=' + s.cozulmeSayisi + '  dogru=' + s.dogruSayisi + '  ortalamaSure=' + r2(s.ortalamaSure) +
        ' sn  Z=' + s.zorlukKatsayisi + '  HP=' + r4(s.hamPuan));

    const tum = await CevapKaydi.find({ soruId: s._id }).sort({ tarih: 1 }).lean();
    const adMap = {}; let adSay = 0;
    const adGoster = a => ADLAR ? a : (adMap[a] || (adMap[a] = 'ogr' + (++adSay)));

    console.log('\nTUM CEVAP KAYITLARI (' + tum.length + ')  — "2.kez": gecilip tekrar cozulmus, soru istatistigine girmez');
    console.log(sol('#', 4) + sol('Tarih (TR)', 17) + sol('Ogrenci', 22) + sol('Sonuc', 7) + sag('Sure', 6) + sag('Puan', 10) + '  Not');
    tum.forEach((c, i) => {
        const not = [c.ikinciKezMi ? '2.kez' : '', c.analiz ? 'analiz' : '', (c.sure != null && c.sure <= 2) ? '<=2sn' : '', (c.sure || 0) > 600 ? '>10dk' : ((c.sure || 0) > 300 ? '>5dk' : '')].filter(Boolean).join(',');
        console.log(sol(i + 1, 4) + sol(tarihYaz(c.tarih), 17) + sol(adGoster(c.kullaniciAdi), 22) + sol(c.dogruMu ? 'Dogru' : 'Yanlis', 7) +
            sag(c.sure == null ? '-' : c.sure, 6) + sag(r2(c.kazanilanPuan || 0), 10) + '  ' + not);
    });

    // cron ile ayni: istatistikte ikinciKezMi kayitlari dislanir
    const kay = tum.filter(c => c.ikinciKezMi !== true);
    const dogru = kay.filter(c => c.dogruMu);
    const tumSure = kay.map(c => c.sure);
    const dogruSure = dogru.map(c => c.sure);
    console.log('\nSURE DAGILIMI (2.kez haric, ' + kay.length + ' kayit):');
    const sayi = (arr, f) => arr.filter(f).length;
    console.log('  Tum cevaplar : en kisa=' + Math.min(...tumSure) + '  medyan=' + medyan(tumSure) + '  en uzun=' + Math.max(...tumSure) +
        '  ortalama=' + r2(tumSure.reduce((a, b) => a + b, 0) / (tumSure.length || 1)) + '  <=2sn: ' + sayi(tumSure, x => x <= 2) +
        '  >5dk: ' + sayi(tumSure, x => x > 300) + '  >10dk: ' + sayi(tumSure, x => x > 600));
    if (dogruSure.length) console.log('  Dogru cevaplar: en kisa=' + Math.min(...dogruSure) + '  medyan=' + medyan(dogruSure) + '  en uzun=' + Math.max(...dogruSure) +
        '  ortalama=' + r2(dogruSure.reduce((a, b) => a + b, 0) / dogruSure.length));

    if (!kay.length) return;
    // --- Z (cronJobs.js soruIstatistikHesapla ile ayni) ---
    const oran = dogru.length / kay.length;
    const D = dogruOraniKademesi(oran);
    const S = dogruSure.length ? dogruSure.reduce((a, x) => a + sureKademesi(x), 0) / dogruSure.length : 3;
    const sig = stdSapma(dogruSure);
    const sigN = Math.min(sig / 60, 1);
    const Zham = (D * 0.6) + (S * 0.4) + sigN * 0.5;
    const agirlik = Math.min(kay.length / 5, 1);
    const Z = Math.min(Math.max(Math.round(((agirlik * Zham) + ((1 - agirlik) * 3)) * 10) / 10, 1), 5);
    console.log('\nZ HESABI (yeniden):');
    console.log('  dogruluk=' + r2(oran * 100) + '%  -> D=' + D + '   (0,6*D = ' + r2(0.6 * D) + ')');
    console.log('  sure kademeleri ort. S=' + r2(S) + '   (0,4*S = ' + r2(0.4 * S) + ')   kademe dagilimi: ' +
        [1, 2, 3, 4, 5].map(k => k + ':' + dogruSure.filter(x => sureKademesi(x) === k).length).join(' '));
    console.log('  dogru surelerin sapmasi sigma=' + r2(sig) + ' sn -> sigmaN=' + r2(sigN) + '   (0,5*sigmaN = ' + r2(0.5 * sigN) + ')');
    console.log('  Z = ' + Z + '   (kayitli: ' + s.zorlukKatsayisi + ')');

    // --- HP (cronJobs.js _cronPuan + hamPuanHesapla ile ayni) ---
    const Tref = tumSure.reduce((a, b) => a + b, 0) / tumSure.length || 60;
    const sigTum = stdSapma(tumSure);
    const GE = 0.02 + 0.08 * Math.min(sigTum / (Tref || 1), 1);
    const logMax = Math.log2(1 + (Tref / 10)) || 1;
    const hiz = t => logMax * Math.tanh(Math.log2(1 + (Tref / Math.max(t || Tref, 10))) / logMax);
    const puanlar = dogru.map(c => Math.max(Z * Tref * hiz(c.sure) * GE, 0));
    const HP = puanlar.length ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : null;
    const ortHiz = dogru.length ? dogru.reduce((a, c) => a + hiz(c.sure), 0) / dogru.length : null;
    console.log('\nHP HESABI (yeniden):');
    console.log('  T_ref (tum cevaplarin ortalama suresi) = ' + r2(Tref) + ' sn');
    console.log('  tum surelerin sapmasi = ' + r2(sigTum) + ' sn   sapma/T_ref = ' + r2(sigTum / Tref) + (sigTum >= Tref ? '  (GE TAVANDA)' : ''));
    console.log('  GE = 0,02 + 0,08*min(sapma/T_ref,1) = ' + r4(GE) + '   (aralik 0,02 - 0,10)');
    console.log('  dogru cevaplarin ortalama hiz bileseni = ' + r4(ortHiz) + '   (ortalama surede cozen ~' + r4(hiz(Tref)) + ')');
    console.log('  HP = ' + r4(HP) + '   (kayitli: ' + r4(s.hamPuan) + ')');
    const kayitliOrt = dogru.length ? dogru.reduce((a, c) => a + (c.kazanilanPuan || 0), 0) / dogru.length : null;
    console.log('  kayitli kazanilan puanlarin ortalamasi (dogru, 2.kez haric) = ' + r4(kayitliOrt));
    // Gece hesabi yalniz VAR OLAN kullanicilarin (ve sinif atlatma sonrasi) kayitlarini yeniden puanlar; digerleri eski puanla kalir.
    const farkli = dogru.filter((c, i) => Math.abs((c.kazanilanPuan || 0) - Math.round(puanlar[i] * 10000) / 10000) > 0.01);
    if (farkli.length) {
        console.log('  DIKKAT: ' + farkli.length + ' dogru kaydin kayitli puani formulden farkli (silinmis kullanici, sinif atlatma oncesi kayit');
        console.log('          veya gece hesabindan sonra eklenen cevap olabilir). Ornekler: ' +
            farkli.slice(0, 5).map(c => tarihYaz(c.tarih) + ' ' + adGoster(c.kullaniciAdi) + ' kayitli=' + r2(c.kazanilanPuan || 0) +
                ' formul=' + r2(puanlar[dogru.indexOf(c)])).join(' | '));
    } else if (dogru.length) {
        console.log('  Kayitli puanlarin hepsi formulle ayni.');
    }
}

async function main() {
    if (!NOLAR.length) { console.log('Kullanim: node scripts/soru-incele.js <soruNo> [<soruNo> ...] [--adlar]'); process.exit(1); }
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);
    for (const no of NOLAR) await incele(no);
    console.log('\n(Yalniz okundu; veritabaninda hicbir sey degismedi.)');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
