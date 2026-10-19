// scripts/zorluk-simulasyon.js
// v4.17.27-4: YALNIZ OKUR — "soru istatistiginde sureleri medyanin N katiyla sinirla" kurali uygulansaydi
//   tum sorularin Z / HP degerleri ve ogrencilerin LGS ortalamasi / sinif siralamasi nasil degisirdi?
//   Veritabaninda HICBIR SEY DEGISTIRMEZ.
//
//   Kullanim (proje klasorunde):
//     node scripts/zorluk-simulasyon.js                 -> 3 x medyan siniri
//     node scripts/zorluk-simulasyon.js --carpan=4      -> 4 x medyan siniri
//     node scripts/zorluk-simulasyon.js --adlar         -> ogrenci adlarini da yazar (varsayilan: gizli)
//     node scripts/zorluk-simulasyon.js --csv           -> ayrica ~/zorluk-simulasyon.csv (tum sorular) yazar
//
//   "Simdiki" degerler bu GECEKI hesabin bulacagi degerlerdir (cronJobs.js ile birebir ayni formul, bugunku veriyle).
//   "Yeni" degerlerde yalniz SORUNUN istatistigi (ortalama sure, sure sapmasi, sure kademeleri) hesaplanirken her sure
//   "carpan x o sorunun medyan suresi" ile sinirlanir. Ogrencinin kendi suresi (hiz bileseni) ve cevap kayitlari aynen kalir.

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
const CSV = process.argv.includes('--csv');
const DOGRULA = process.argv.includes('--dogrula'); // gece hesabindan hemen sonra: 'simdiki' degerler kayitli degerlerle ayni mi
const _c = (process.argv.find(a => a.startsWith('--carpan=')) || '').split('=')[1];
const CARPAN = Number(_c) > 1 ? Number(_c) : 3;

// --- cronJobs.js ile ayni yardimcilar ---
function stdSapma(d) {
    if (!d || d.length < 2) return 0;
    const o = d.reduce((a, b) => a + b, 0) / d.length;
    return Math.sqrt(d.reduce((a, b) => a + Math.pow(b - o, 2), 0) / d.length);
}
function dogruOraniKademesi(o) { if (o <= 0.20) return 5; if (o <= 0.40) return 4; if (o <= 0.60) return 3; if (o <= 0.80) return 2; return 1; }
function sureKademesi(s) { if (s <= 30) return 1; if (s <= 60) return 2; if (s <= 120) return 3; if (s <= 180) return 4; return 5; }
function medyan(d) { const s = d.filter(x => typeof x === 'number').sort((a, b) => a - b); if (!s.length) return 0; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
const r2 = x => (x == null || Number.isNaN(x)) ? '-' : (Math.round(x * 100) / 100).toString();
function sag(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
function sol(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

// cronJobs.js soruIstatistikHesapla ile ayni; sinir verilirse sureler sinirlanir
function soruIstat(kayitlar, sinir) {
    if (!kayitlar.length) return { cozulme: 0, Z: 3, ortalamaSure: 0, tumSureler: [] };
    const kes = x => (sinir && typeof x === 'number' && x > sinir) ? sinir : x;
    const tumSureler = kayitlar.map(k => kes(k.sure));
    const dogruSureler = kayitlar.filter(k => k.dogruMu).map(k => kes(k.sure));
    const cozulme = kayitlar.length, dogruSay = dogruSureler.length;
    const ortalamaSure = tumSureler.reduce((a, b) => a + b, 0) / tumSureler.length;
    const D = dogruOraniKademesi(dogruSay / cozulme);
    const S = dogruSureler.length ? dogruSureler.reduce((acc, s) => acc + sureKademesi(s), 0) / dogruSureler.length : 3;
    const sigma_n = Math.min(stdSapma(dogruSureler) / 60, 1);
    const Z_ham = (D * 0.6) + (S * 0.4) + sigma_n * 0.5;
    const agirlik = Math.min(cozulme / 5, 1);
    const Z = Math.min(Math.max(Math.round(((agirlik * Z_ham) + ((1 - agirlik) * 3)) * 10) / 10, 1), 5);
    return { cozulme, Z, ortalamaSure, tumSureler };
}
// cronJobs.js _cronPuan ile ayni (s: { ortalamaSure, Z, tumSureler })
function puan(s, sure) {
    const T_ref = s.ortalamaSure || 60;
    const T_ogr = sure || T_ref;
    const T_ogr_eff = Math.max(T_ogr, 10);
    const logHiz = Math.log2(1 + (T_ref / T_ogr_eff));
    const logMax = Math.log2(1 + (T_ref / 10)) || 1;
    const hiz = logMax * Math.tanh(logHiz / logMax);
    const GE = 0.02 + 0.08 * Math.min(stdSapma(s.tumSureler || []) / (T_ref || 1), 1);
    return Math.round(Math.max(s.Z * T_ref * hiz * GE, 0) * 10000) / 10000;
}

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);

    const sorular = await Soru.find({}, 'soruNo sinif ders konu durum zorlukKatsayisi hamPuan').lean();
    const cevaplar = await CevapKaydi.find({}, 'soruId kullaniciAdi dogruMu sure kazanilanPuan ikinciKezMi tarih').lean();
    const kullanicilar = await Kullanici.find({}, 'kullaniciAdi rol sinif sonSinifAtlamaTarihi dersPuanlari').lean();
    let esik30 = -1;
    try { const a = await Ayar.findOne({ anahtar: 'siralama_min_ort30' }).lean(); if (a && typeof a.deger === 'number') esik30 = a.deger; } catch (e) { esik30 = -1; }
    const son30 = new Map(); const d30 = Date.now() - 30 * 86400000;
    cevaplar.forEach(c => { if (c.tarih && new Date(c.tarih).getTime() >= d30) son30.set(c.kullaniciAdi, (son30.get(c.kullaniciAdi) || 0) + 1); });

    // ---- 1) Soru istatistikleri: simdiki ve yeni ----
    const soruKayit = new Map();
    cevaplar.forEach(c => { if (c.ikinciKezMi === true || !c.soruId) return; const id = String(c.soruId); if (!soruKayit.has(id)) soruKayit.set(id, []); soruKayit.get(id).push(c); });
    const S = new Map(); // id -> { bilgi, eski, yeni, sinir, medyan, enUzun, hpEski, hpYeni }
    for (const s of sorular) {
        const id = String(s._id), kay = soruKayit.get(id) || [];
        const med = medyan(kay.map(k => k.sure));
        const sinir = med > 0 ? CARPAN * med : null;
        S.set(id, { bilgi: s, kay, med, sinir, enUzun: kay.reduce((m, k) => Math.max(m, k.sure || 0), 0),
            kesilen: sinir ? kay.filter(k => (k.sure || 0) > sinir).length : 0,
            eski: soruIstat(kay, null), yeni: soruIstat(kay, sinir) });
    }
    for (const v of S.values()) {
        const dg = v.kay.filter(k => k.dogruMu);
        v.hpEski = dg.length ? dg.reduce((a, k) => a + puan(v.eski, k.sure), 0) / dg.length : null;
        v.hpYeni = dg.length ? dg.reduce((a, k) => a + puan(v.yeni, k.sure), 0) / dg.length : null;
    }

    // ---- 2) Ogrenci LGS ortalamasi (cronJobs kullaniciPuanHesapla + siralamaCacheHesapla ile ayni) ----
    const kulKayit = new Map();
    cevaplar.forEach(c => { if (!kulKayit.has(c.kullaniciAdi)) kulKayit.set(c.kullaniciAdi, []); kulKayit.get(c.kullaniciAdi).push(c); });
    const adMap = {}; let adSay = 0;
    const adGoster = a => ADLAR ? a : (adMap[a] || (adMap[a] = 'ogr' + (++adSay)));
    const ogr = [];
    for (const k of kullanicilar) {
        if (k.rol !== 'ogrenci') continue;
        const bas = k.sonSinifAtlamaTarihi ? new Date(k.sonSinifAtlamaTarihi).getTime() : 0;
        const dersE = {}, dersY = {};
        let toplamSoru = 0;
        for (const c of (kulKayit.get(k.kullaniciAdi) || [])) {
            if (c.tarih && new Date(c.tarih).getTime() < bas) continue;
            const v = S.get(String(c.soruId)); if (!v) continue;
            const ders = v.bilgi.ders || 'Diğer';
            [dersE, dersY].forEach(m => { if (!m[ders]) m[ders] = { ders, toplamPuan: 0, soruSayisi: 0 }; m[ders].soruSayisi++; });
            toplamSoru++;
            if (c.dogruMu) {
                if (c.ikinciKezMi) { dersE[ders].toplamPuan += c.kazanilanPuan || 0; dersY[ders].toplamPuan += c.kazanilanPuan || 0; }
                else { dersE[ders].toplamPuan += puan(v.eski, c.sure); dersY[ders].toplamPuan += puan(v.yeni, c.sure); }
            }
        }
        const sinif = String(Number(k.sinif) || '');
        let bolen = 30;
        try { const g = Math.ceil((Date.now() - k._id.getTimestamp().getTime()) / 86400000); bolen = Math.min(30, Math.max(1, g)); } catch (e) {}
        const nitelikli = toplamSoru >= 10 && (esik30 < 0 || ((son30.get(k.kullaniciAdi) || 0) / bolen) > esik30);
        ogr.push({ ad: k.kullaniciAdi, sinif, nitelikli, ortKayitli: lgsAgirlikliOrtalama(k.dersPuanlari || []), ortE: lgsAgirlikliOrtalama(Object.values(dersE)), ortY: lgsAgirlikliOrtalama(Object.values(dersY)) });
    }

    // ---- RAPOR ----
    const tumS = [...S.values()].filter(v => v.kay.length > 0);
    const zDegisen = tumS.filter(v => v.eski.Z !== v.yeni.Z);
    const kesilenSoru = tumS.filter(v => v.kesilen > 0);
    const hpVar = tumS.filter(v => v.hpEski != null && v.hpEski > 0);
    const hpOrtE = hpVar.reduce((a, v) => a + v.hpEski, 0) / (hpVar.length || 1);
    const hpOrtY = hpVar.reduce((a, v) => a + v.hpYeni, 0) / (hpVar.length || 1);
    const hp10 = hpVar.filter(v => Math.abs(v.hpYeni - v.hpEski) / v.hpEski > 0.10);
    console.log('='.repeat(96));
    console.log('ZORLUK SIMULASYONU — soru istatistiginde sure siniri: ' + CARPAN + ' x medyan   (yalniz okur, hicbir sey degismez)');
    console.log('='.repeat(96));
    console.log('Cevabi olan soru: ' + tumS.length + '   (toplam soru ' + sorular.length + ', cevap kaydi ' + cevaplar.length + ')');
    console.log('Siniri asan en az bir suresi olan soru: ' + kesilenSoru.length + '   (sinira cekilen cevap: ' + kesilenSoru.reduce((a, v) => a + v.kesilen, 0) + ')');
    console.log('Z degeri degisen soru: ' + zDegisen.length + '   (dusen ' + zDegisen.filter(v => v.yeni.Z < v.eski.Z).length + ', artan ' + zDegisen.filter(v => v.yeni.Z > v.eski.Z).length + ')');
    const zFark = {}; zDegisen.forEach(v => { const f = r2(v.yeni.Z - v.eski.Z); zFark[f] = (zFark[f] || 0) + 1; });
    console.log('  Z farki dagilimi: ' + (Object.keys(zFark).sort((a, b) => a - b).map(k => (k > 0 ? '+' : '') + k + ': ' + zFark[k]).join('  ') || '-'));
    console.log('HP %10\'dan fazla degisen soru: ' + hp10.length + '   ortalama HP: ' + r2(hpOrtE) + ' -> ' + r2(hpOrtY));

    const liste = hpVar.filter(v => Math.abs(v.hpYeni - v.hpEski) >= 0.005 || v.eski.Z !== v.yeni.Z).sort((a, b) => Math.abs(b.hpYeni - b.hpEski) / b.hpEski - Math.abs(a.hpYeni - a.hpEski) / a.hpEski).slice(0, 30);
    console.log('\nEN COK DEGISEN 30 SORU (HP degisim oranina gore; yalniz degisenler)');
    if (!liste.length) console.log('  (degisen soru yok)');
    console.log(sol('SoruNo', 7) + sol('Snf', 4) + sol('Ders', 15) + sag('Cvp', 5) + sag('Medyan', 8) + sag('EnUzun', 8) + sag('Kesilen', 8) + sag('Z', 11) + sag('HP', 17) + sag('Degisim', 9));
    liste.forEach(v => {
        console.log(sol(v.bilgi.soruNo == null ? '-' : v.bilgi.soruNo, 7) + sol(v.bilgi.sinif || '-', 4) + sol(v.bilgi.ders || '-', 15) + sag(v.kay.length, 5) +
            sag(r2(v.med), 8) + sag(v.enUzun, 8) + sag(v.kesilen, 8) + sag(v.eski.Z + ' -> ' + v.yeni.Z, 11) +
            sag(r2(v.hpEski) + ' -> ' + r2(v.hpYeni), 17) + sag((v.hpYeni >= v.hpEski ? '+' : '') + Math.round((v.hpYeni - v.hpEski) / v.hpEski * 100) + '%', 9));
    });

    console.log('\nOGRENCI SIRALAMASI (sinif bazinda, LGS agirlikli ortalamaya gore; yalniz siralamaya giren ogrenciler)');
    const siniflar = [...new Set(ogr.filter(o => o.nitelikli && o.sinif).map(o => o.sinif))].sort((a, b) => a - b);
    for (const sn of siniflar) {
        const l = ogr.filter(o => o.nitelikli && o.sinif === sn);
        const sE = [...l].sort((a, b) => b.ortE - a.ortE), sY = [...l].sort((a, b) => b.ortY - a.ortY);
        l.forEach(o => { o.sE = sE.indexOf(o) + 1; o.sY = sY.indexOf(o) + 1; o.oyn = o.sE - o.sY; });
        const yerDegisen = l.filter(o => o.oyn !== 0);
        const maxOyn = l.reduce((m, o) => Math.max(m, Math.abs(o.oyn)), 0);
        const ilk10E = sE.slice(0, 10).map(o => o.ad), ilk10Y = new Set(sY.slice(0, 10).map(o => o.ad));
        console.log('\n  ' + sn + '. SINIF: ' + l.length + ' ogrenci | sirasi degisen ' + yerDegisen.length + ' | en buyuk oynama ' + maxOyn + ' sira | ilk 10\'dan cikan ' + ilk10E.filter(a => !ilk10Y.has(a)).length +
            ' | ilk sira: ' + adGoster(sE[0].ad) + ' -> ' + adGoster(sY[0].ad));
        const oyn = [...yerDegisen].sort((a, b) => Math.abs(b.oyn) - Math.abs(a.oyn) || a.sE - b.sE).slice(0, 8);
        oyn.forEach(o => console.log('    ' + sol(adGoster(o.ad), 22) + 'sira ' + sag(o.sE, 4) + ' -> ' + sag(o.sY, 4) + '   ortalama ' + r2(o.ortE) + ' -> ' + r2(o.ortY)));
        if (!oyn.length) console.log('    (siralama degismiyor)');
    }

    if (CSV) {
        const dosya = path.join(os.homedir(), 'zorluk-simulasyon.csv');
        const satirlar = ['soruNo;sinif;ders;konu;cevap;medyan;en_uzun;sinir;kesilen;Z_simdi;Z_yeni;HP_simdi;HP_yeni'];
        const sy = x => (x == null || x === '-') ? '' : String(x).replace('.', ','); // Turkce Excel: ondalik virgul
        const mt = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
        [...S.values()].filter(v => v.kay.length).forEach(v => satirlar.push([v.bilgi.soruNo == null ? '' : v.bilgi.soruNo, mt(v.bilgi.sinif), mt(v.bilgi.ders), mt(v.bilgi.konu),
            v.kay.length, sy(r2(v.med)), v.enUzun, sy(r2(v.sinir)), v.kesilen, sy(v.eski.Z), sy(v.yeni.Z), sy(r2(v.hpEski)), sy(r2(v.hpYeni))].join(';')));
        fs.writeFileSync(dosya, '﻿' + satirlar.join('\n'), 'utf8');
        console.log('\nCSV yazildi: ' + dosya + '  (Excel ile acilir, ; ayracli)');
    }
    if (DOGRULA) {
        const zAyni = tumS.filter(v => v.eski.Z === v.bilgi.zorlukKatsayisi).length;
        const hpAyni = tumS.filter(v => (v.hpEski == null && v.bilgi.hamPuan == null) || (v.hpEski != null && v.bilgi.hamPuan != null && Math.abs(v.hpEski - v.bilgi.hamPuan) < 0.001)).length;
        const ortAyni = ogr.filter(o => Math.abs(o.ortE - o.ortKayitli) < 0.001).length;
        console.log('\nDOGRULAMA (gece hesabindan hemen sonra calistirilmali): Z ayni ' + zAyni + '/' + tumS.length + ', HP ayni ' + hpAyni + '/' + tumS.length + ', ogrenci ortalamasi ayni ' + ortAyni + '/' + ogr.length);
    }
    console.log('\n(Yalniz okundu; veritabaninda hicbir sey degismedi.)');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
