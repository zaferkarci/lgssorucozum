// scripts/siralama-simulasyon.js
// v4.17.29: YALNIZ OKUR — sinif siralamasi farkli puan yontemleriyle hesaplansaydi nasil olurdu?
//   Veritabaninda HICBIR SEY DEGISTIRMEZ.
//
//   Kullanim (proje klasorunde):
//     node scripts/siralama-simulasyon.js              -> ozet + her sinifta en basarili 10 ogrenci
//     node scripts/siralama-simulasyon.js --ilk=15     -> her sinifta 15 ogrenci
//     node scripts/siralama-simulasyon.js --tum        -> her sinifta siralamaya giren TUM ogrenciler
//     node scripts/siralama-simulasyon.js --adlar      -> ogrenci adlarini yazar (varsayilan: ogr1, ogr2...)
//     node scripts/siralama-simulasyon.js --csv        -> ayrica ~/siralama-simulasyon.csv (tum ogrenciler)
//
//   YONTEMLER (hepsi ders bazinda hesaplanir, sonra LGS katsayilariyla birlestirilir — services/lgsOrtalama.js,
//   bir dersten 5'ten az soru cozulduyse o ders 0 sayilir; siralamaya girme sarti gece hesabiyla ayni):
//     SIMDI : Bugunku formul (gece hesabinin bulacagi deger): ders puani = toplam puan / cevaplanan soru,
//             dogru cevap puani = Z x sorunun ortalama suresi x hiz x GE.
//     Y1    : Zorluk agirlikli basari = (dogru cozulen sorularin Z toplami) / (cevaplanan tum sorularin Z toplami) x 100.
//     Y2    : Y1 + kucuk hiz bonusu: dogru cevap, sorunun ortalama suresinin altinda cozulduyse en fazla %10 fazla sayilir
//             (ortalama surede 0, iki kat hizli ve otesi +%10; 10 sn alti 10 sn sayilir).
//     Y3    : Normallestirilmis puan = her dogru cevabin bugunku puani / o sorunun ortalama puani (HP); ders puani bunlarin
//             cevaplanan soru basina ortalamasi x 100. (Soru sureleri ve GE farkini siler, formulun geri kalani kalir.)
//     Y4    : Yetenek tahmini (Rasch / 1PL, ders bazinda): her ogrencinin yetenegi, cozdugu sorularin dogru/yanlis sonucuna ve
//             o sorularin zorluguna gore tahmin edilir (MAP, N(0,1) onsel). Puan = 50 + 10 x yetenek.

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const os = require('os');
const path = require('path');
const fs = require('fs');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const Kullanici = require('../models/Kullanici');
const Ayar = require('../models/Ayar');
const { lgsAgirlikliOrtalama } = require('../services/lgsOrtalama');

const ADLAR = process.argv.includes('--adlar');
const TUM = process.argv.includes('--tum');
const CSV = process.argv.includes('--csv');
const DOGRULA = process.argv.includes('--dogrula');
const _i = (process.argv.find(a => a.startsWith('--ilk=')) || '').split('=')[1];
const ILK = Number(_i) > 0 ? Number(_i) : 10;
const YONTEM = ['SIMDI', 'Y1', 'Y2', 'Y3', 'Y4'];

// --- cronJobs.js ile ayni yardimcilar ---
function stdSapma(d) {
    if (!d || d.length < 2) return 0;
    const o = d.reduce((a, b) => a + b, 0) / d.length;
    return Math.sqrt(d.reduce((a, b) => a + Math.pow(b - o, 2), 0) / d.length);
}
function dogruOraniKademesi(o) { if (o <= 0.20) return 5; if (o <= 0.40) return 4; if (o <= 0.60) return 3; if (o <= 0.80) return 2; return 1; }
function sureKademesi(s) { if (s <= 30) return 1; if (s <= 60) return 2; if (s <= 120) return 3; if (s <= 180) return 4; return 5; }
function soruIstat(kay) {
    if (!kay.length) return { Z: 3, ortalamaSure: 0, tumSureler: [] };
    const tumSureler = kay.map(k => k.sure);
    const dogruSureler = kay.filter(k => k.dogruMu).map(k => k.sure);
    const ortalamaSure = tumSureler.reduce((a, b) => a + b, 0) / tumSureler.length;
    const D = dogruOraniKademesi(dogruSureler.length / kay.length);
    const S = dogruSureler.length ? dogruSureler.reduce((acc, s) => acc + sureKademesi(s), 0) / dogruSureler.length : 3;
    const sigma_n = Math.min(stdSapma(dogruSureler) / 60, 1);
    const agirlik = Math.min(kay.length / 5, 1);
    const Z = Math.min(Math.max(Math.round(((agirlik * ((D * 0.6) + (S * 0.4) + sigma_n * 0.5)) + ((1 - agirlik) * 3)) * 10) / 10, 1), 5);
    return { Z, ortalamaSure, tumSureler };
}
function hizBileseni(T_ref, sure) {
    const T_ogr_eff = Math.max(sure || T_ref, 10);
    const logMax = Math.log2(1 + (T_ref / 10)) || 1;
    return logMax * Math.tanh(Math.log2(1 + (T_ref / T_ogr_eff)) / logMax);
}
function puan(s, sure) { // cronJobs.js _cronPuan ile ayni
    const T_ref = s.ortalamaSure || 60;
    const GE = 0.02 + 0.08 * Math.min(stdSapma(s.tumSureler || []) / (T_ref || 1), 1);
    return Math.round(Math.max(s.Z * T_ref * hizBileseni(T_ref, sure) * GE, 0) * 10000) / 10000;
}
const r1 = x => (x == null || Number.isNaN(x)) ? '-' : (Math.round(x * 10) / 10).toString();
const r2 = x => (x == null || Number.isNaN(x)) ? '-' : (Math.round(x * 100) / 100).toString();
function sag(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
function sol(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }
// Spearman sira korelasyonu (esitlerde ortalama sira)
function siraVer(arr) { const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(arr.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function spearman(a, b) { if (a.length < 3) return null; const ra = siraVer(a), rb = siraVer(b); const n = a.length, ma = (n + 1) / 2; let s1 = 0, s2 = 0, s3 = 0; for (let i = 0; i < n; i++) { s1 += (ra[i] - ma) * (rb[i] - ma); s2 += (ra[i] - ma) ** 2; s3 += (rb[i] - ma) ** 2; } return (s2 && s3) ? s1 / Math.sqrt(s2 * s3) : null; }

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);
    const sorular = await Soru.find({}, 'ders sinif').lean();
    const cevaplar = await CevapKaydi.find({}, 'soruId kullaniciAdi dogruMu sure kazanilanPuan ikinciKezMi tarih').lean();
    const kullanicilar = await Kullanici.find({}, 'kullaniciAdi rol sinif sonSinifAtlamaTarihi dersPuanlari').lean();
    let esik30 = -1;
    try { const a = await Ayar.findOne({ anahtar: 'siralama_min_ort30' }).lean(); if (a && typeof a.deger === 'number') esik30 = a.deger; } catch (e) { esik30 = -1; }
    const son30 = new Map(); const d30 = Date.now() - 30 * 86400000;
    cevaplar.forEach(c => { if (c.tarih && new Date(c.tarih).getTime() >= d30) son30.set(c.kullaniciAdi, (son30.get(c.kullaniciAdi) || 0) + 1); });

    // ---- Soru istatistikleri (gece hesabi gibi; "2. kez" kayitlar soru istatistigine girmez) ----
    const soruKay = new Map();
    cevaplar.forEach(c => { if (c.ikinciKezMi === true || !c.soruId) return; const id = String(c.soruId); if (!soruKay.has(id)) soruKay.set(id, []); soruKay.get(id).push(c); });
    const S = new Map();
    for (const s of sorular) {
        const id = String(s._id), kay = soruKay.get(id) || [];
        const st = soruIstat(kay);
        const dg = kay.filter(k => k.dogruMu);
        st.HP = dg.length ? dg.reduce((a, k) => a + puan(st, k.sure), 0) / dg.length : null;
        st.ders = s.ders || 'Diğer';
        S.set(id, st);
    }

    // ---- Ogrenci kayitlari (sinif atlatma sonrasi; gece hesabi ile ayni) ----
    const kulKay = new Map();
    cevaplar.forEach(c => { if (!kulKay.has(c.kullaniciAdi)) kulKay.set(c.kullaniciAdi, []); kulKay.get(c.kullaniciAdi).push(c); });
    const ogr = [];
    for (const k of kullanicilar) {
        if (k.rol !== 'ogrenci') continue;
        const bas = k.sonSinifAtlamaTarihi ? new Date(k.sonSinifAtlamaTarihi).getTime() : 0;
        const kay = (kulKay.get(k.kullaniciAdi) || []).filter(c => !(c.tarih && new Date(c.tarih).getTime() < bas) && S.has(String(c.soruId)));
        let bolen = 30;
        try { const g = Math.ceil((Date.now() - k._id.getTimestamp().getTime()) / 86400000); bolen = Math.min(30, Math.max(1, g)); } catch (e) {}
        const nitelikli = kay.length >= 10 && (esik30 < 0 || ((son30.get(k.kullaniciAdi) || 0) / bolen) > esik30);
        ogr.push({ ad: k.kullaniciAdi, sinif: String(Number(k.sinif) || ''), nitelikli, kay, kayitliOrt: lgsAgirlikliOrtalama(k.dersPuanlari || []) });
    }

    // ---- Y4: Rasch (1PL) MAP tahmini, ders bazinda (soru zorlugu b, ogrenci yetenegi teta) ----
    // Tum ogrencilerin (siralamaya girmeyenler dahil) sinif atlatma sonrasi ilk cevaplari kullanilir; ayni soru tekrar
    // cozulduyse ilk cevap sayilir (ezber etkisi olmasin).
    const teta = new Map(); // ad|ders -> teta
    const dersler = [...new Set([...S.values()].map(s => s.ders))];
    for (const ders of dersler) {
        const gozlem = []; const soruIdx = new Map(), kisiIdx = new Map();
        for (const o of ogr) {
            const gorulen = new Set();
            for (const c of o.kay) {
                const sid = String(c.soruId), st = S.get(sid);
                if (st.ders !== ders || gorulen.has(sid)) continue; gorulen.add(sid);
                if (!soruIdx.has(sid)) soruIdx.set(sid, soruIdx.size);
                if (!kisiIdx.has(o.ad)) kisiIdx.set(o.ad, kisiIdx.size);
                gozlem.push([kisiIdx.get(o.ad), soruIdx.get(sid), c.dogruMu ? 1 : 0]);
            }
        }
        if (!gozlem.length) continue;
        const th = new Array(kisiIdx.size).fill(0), b = new Array(soruIdx.size).fill(0);
        for (let it = 0; it < 60; it++) {
            const gT = th.map(t => -t), hT = th.map(() => 1), gB = b.map(x => -x), hB = b.map(() => 1); // N(0,1) onsel
            for (const [p, q, x] of gozlem) { const pr = 1 / (1 + Math.exp(-(th[p] - b[q]))); const w = pr * (1 - pr); gT[p] += x - pr; hT[p] += w; gB[q] += pr - x; hB[q] += w; }
            let deg = 0;
            for (let i = 0; i < th.length; i++) { const d = Math.max(-1, Math.min(1, gT[i] / hT[i])); th[i] += d; deg = Math.max(deg, Math.abs(d)); }
            for (let j = 0; j < b.length; j++) { const d = Math.max(-1, Math.min(1, gB[j] / hB[j])); b[j] += d; deg = Math.max(deg, Math.abs(d)); }
            if (deg < 1e-4) break;
        }
        for (const [ad, i] of kisiIdx) teta.set(ad + '|' + ders, th[i]);
    }

    // ---- Her ogrenci icin 5 yontemin ders puanlari -> LGS agirlikli ortalama ----
    for (const o of ogr) {
        const d = {}; let dogru = 0, zTop = 0, oranTop = 0;
        for (const c of o.kay) {
            const st = S.get(String(c.soruId)), ders = st.ders;
            if (!d[ders]) d[ders] = { n: 0, simdi: 0, zDogru: 0, zTum: 0, zDogruHiz: 0, norm: 0 };
            const x = d[ders]; x.n++; x.zTum += st.Z; zTop += st.Z;
            oranTop += (st.ortalamaSure || 60) / Math.max(c.sure || 60, 10);
            if (c.dogruMu) {
                dogru++;
                const p = c.ikinciKezMi ? (c.kazanilanPuan || 0) : puan(st, c.sure);
                x.simdi += p;
                x.zDogru += st.Z;
                const bonus = Math.min(Math.max(Math.log2((st.ortalamaSure || 60) / Math.max(c.sure || 60, 10)), 0), 1);
                x.zDogruHiz += st.Z * (1 + 0.1 * bonus);
                x.norm += (st.HP && st.HP > 0) ? Math.min(p / st.HP, 5) : 1;
            }
        }
        const liste = (f) => Object.keys(d).map(ders => ({ ders, soruSayisi: d[ders].n, toplamPuan: f(d[ders], ders) * d[ders].n }));
        o.puan = {
            SIMDI: lgsAgirlikliOrtalama(Object.keys(d).map(ders => ({ ders, soruSayisi: d[ders].n, toplamPuan: d[ders].simdi }))),
            Y1: lgsAgirlikliOrtalama(liste(x => x.zTum ? 100 * x.zDogru / x.zTum : 0)),
            Y2: lgsAgirlikliOrtalama(liste(x => x.zTum ? 100 * x.zDogruHiz / x.zTum : 0)),
            Y3: lgsAgirlikliOrtalama(liste(x => 100 * x.norm / x.n)),
            Y4: lgsAgirlikliOrtalama(liste((x, ders) => 50 + 10 * (teta.get(o.ad + '|' + ders) || 0)))
        };
        o.n = o.kay.length; o.basari = o.n ? 100 * dogru / o.n : 0; o.ortZ = o.n ? zTop / o.n : 0; o.hizOran = o.n ? oranTop / o.n : 0;
    }

    // ---- RAPOR ----
    const adMap = {}; let adSay = 0;
    const adGoster = a => ADLAR ? a : (adMap[a] || (adMap[a] = 'ogr' + (++adSay)));
    console.log('='.repeat(110));
    console.log('SIRALAMA SIMULASYONU  (yalniz okur, hicbir sey degismez)   cevap kaydi: ' + cevaplar.length + '   ogrenci: ' + ogr.length);
    console.log('  SIMDI = bugunku formul | Y1 = zorluk agirlikli basari | Y2 = Y1 + en fazla %10 hiz bonusu');
    console.log('  Y3 = soruya gore normallestirilmis puan | Y4 = yetenek tahmini (Rasch)');
    console.log('  Basari = dogru / cevaplanan. OrtZ = cevapladigi sorularin ortalama zorlugu. Hiz = sorunun ortalama suresi / kendi suresi (1 = ortalama).');
    console.log('='.repeat(110));
    const siniflar = [...new Set(ogr.filter(o => o.nitelikli && o.sinif).map(o => o.sinif))].sort((a, b) => a - b);
    const csv = ['sinif;ogrenci;cevap;basari;ortZ;hiz;' + YONTEM.map(y => y + '_puan;' + y + '_sira').join(';')];
    for (const sn of siniflar) {
        const l = ogr.filter(o => o.nitelikli && o.sinif === sn);
        YONTEM.forEach(y => { const s = [...l].sort((a, b) => b.puan[y] - a.puan[y]); s.forEach((o, i) => { o.sira = o.sira || {}; o.sira[y] = i + 1; }); });
        console.log('\n' + sn + '. SINIF — siralamaya giren ' + l.length + ' ogrenci');
        console.log('  Basari orani ile siralama uyumu (Spearman, 1 = tam uyum, 0 = ilgisiz):  ' +
            YONTEM.map(y => y + ' ' + r2(spearman(l.map(o => o.basari), l.map(o => o.puan[y])))).join('   '));
        console.log('  Cevapladigi sorularin zorluguyla uyum (yuksekse: zor soru cozen one gecer): ' +
            YONTEM.map(y => y + ' ' + r2(spearman(l.map(o => o.ortZ), l.map(o => o.puan[y])))).join('   '));
        console.log('  Hizla uyum: ' + YONTEM.map(y => y + ' ' + r2(spearman(l.map(o => o.hizOran), l.map(o => o.puan[y])))).join('   '));
        const ilkler = TUM ? [...l].sort((a, b) => b.basari - a.basari || b.n - a.n) : [...l].sort((a, b) => b.basari - a.basari || b.n - a.n).slice(0, ILK);
        console.log('\n  ' + (TUM ? 'TUM OGRENCILER' : 'EN BASARILI ' + ilkler.length + ' OGRENCI') + ' (basari oranina gore) — her yontemde kacinci siradalar (' + l.length + ' kisi icinde)');
        console.log('  ' + sol('Ogrenci', 20) + sag('Cevap', 6) + sag('Basari', 8) + sag('OrtZ', 6) + sag('Hiz', 6) + '  |' + YONTEM.map(y => sag(y, 7)).join(''));
        ilkler.forEach(o => console.log('  ' + sol(adGoster(o.ad), 20) + sag(o.n, 6) + sag(r1(o.basari) + '%', 8) + sag(r1(o.ortZ), 6) + sag(r2(o.hizOran), 6) + '  |' + YONTEM.map(y => sag(o.sira[y], 7)).join('')));
        if (!TUM) {
            const simdiIlk = [...l].sort((a, b) => a.sira.SIMDI - b.sira.SIMDI).slice(0, Math.min(5, l.length));
            console.log('\n  Bugun ilk ' + simdiIlk.length + ' sirada olanlar:');
            simdiIlk.forEach(o => console.log('  ' + sol(adGoster(o.ad), 20) + sag(o.n, 6) + sag(r1(o.basari) + '%', 8) + sag(r1(o.ortZ), 6) + sag(r2(o.hizOran), 6) + '  |' + YONTEM.map(y => sag(o.sira[y], 7)).join('')));
        }
        const sy = x => String(x).replace('.', ','); // Turkce Excel: ondalik virgul (yalniz sayilarda)
        l.forEach(o => csv.push([sn, '"' + adGoster(o.ad) + '"', o.n, sy(r1(o.basari)), sy(r2(o.ortZ)), sy(r2(o.hizOran))].concat(YONTEM.flatMap(y => [sy(r2(o.puan[y])), o.sira[y]])).join(';')));
    }
    if (CSV) { const f = path.join(os.homedir(), 'siralama-simulasyon.csv'); fs.writeFileSync(f, '﻿' + csv.join('\n'), 'utf8'); console.log('\nCSV yazildi: ' + f); }
    if (DOGRULA) { const ayni = ogr.filter(o => Math.abs(o.puan.SIMDI - o.kayitliOrt) < 0.001).length; console.log('\nDOGRULAMA (gece hesabindan hemen sonra): SIMDI ortalamasi kayitli degerle ayni ' + ayni + '/' + ogr.length); }
    console.log('\n(Yalniz okundu; veritabaninda hicbir sey degismedi.)');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
