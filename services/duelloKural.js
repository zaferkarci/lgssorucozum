// services/duelloKural.js
// v4.17.37-2: Duello adaleti — TEK KAYNAK. routes/oyun.js (duello), routes/admin.js (Duello Analizi) ve
// scripts/duello-analiz.js ayni esikleri buradan kullanir.
//
//   1) GECERLI SURE: duelloda yalniz dikkatle verilmis dogrular sayilir:
//        sure >= max(5 sn, sorunun dogru cevap surelerinin medyani x %25)
//      Daha kisa dogrular "sans eseri / okumadan isaretleme" kabul edilir. Saldiranin boyle dogrulari duello sorusu
//      olamaz; savunanin o sorudaki suresi boyleyse saldiran kazanir (sans eseri cevap topragi korumaz).
//   2) HIZLI ISARETLEME: saldiranin son 50 cevabinda dogru orani %40'in altinda VE cevaplarin en az %25'i 5 sn'den
//      kisaysa saldiri acilamaz. Zayif ama dikkatle cozen ogrenci (yavas cevaplar) etkilenmez.
//      En az 10 cevabi olmayan degerlendirilmez.

const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const DuelloKayit = require('../models/DuelloKayit');
const OyunHucre = require('../models/OyunHucre');

const ESIK = {
    TABAN_SN: 5,       // gecerli sure tabani
    ORAN: 0.25,        // sorunun dogru cevap medyaninin orani
    SON_CEVAP: 50,     // hizli isaretleme icin bakilan son cevap sayisi
    ISABET: 0.40,      // bu dogru oraninin altinda ...
    HIZLI_SN: 5,       // ... ve bu sureden kisa cevaplar
    HIZLI_ORAN: 0.25,  // ... en az bu oranda ise saldiri kapali
    EN_AZ_CEVAP: 10
};

function medyan(a) {
    const b = (a || []).filter(x => typeof x === 'number' && x > 0).sort((x, y) => x - y);
    if (!b.length) return null;
    const m = Math.floor(b.length / 2);
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}
// Sorunun referans dogru cozum suresi: dogru cevap surelerinin medyani (en az 3 kayit), yoksa ortalamaSure
function soruRefSure(s) {
    const d = ((s && s.dogruCevapSureleri) || []).filter(x => typeof x === 'number' && x > 0);
    if (d.length >= 3) return medyan(d);
    return (s && s.ortalamaSure) || null;
}
function gecerliSureEsigi(s) {
    const r = soruRefSure(s);
    return Math.max(ESIK.TABAN_SN, r ? r * ESIK.ORAN : 0);
}
// cevaplar: {dogruMu, sure} listesi (son SON_CEVAP cevap)
function hizliIsaretleme(cevaplar) {
    const l = cevaplar || [], n = l.length;
    if (n < ESIK.EN_AZ_CEVAP) return { engel: false, n, dogruOran: null, hizliOran: null };
    const dogruOran = l.filter(c => c.dogruMu).length / n;
    const hizliOran = l.filter(c => typeof c.sure === 'number' && c.sure < ESIK.HIZLI_SN).length / n;
    return { engel: dogruOran < ESIK.ISABET && hizliOran >= ESIK.HIZLI_ORAN, n, dogruOran, hizliOran };
}
async function saldiriEngeli(kullaniciAdi) {
    const l = await CevapKaydi.find({ kullaniciAdi }, 'dogruMu sure').sort({ tarih: -1 }).limit(ESIK.SON_CEVAP).lean();
    return hizliIsaretleme(l);
}

// ---- Gecmis duello analizi (admin sayfasi + komut) ----
//   secenek: { gun, kullanici, sinif }
//   K1: kazananin suresi gecersiz -> yeni kuralla bu sonuc olmazdi
//   K2: saldiran o an hizli isaretleme engelindeydi -> yeni kuralla saldiri acilamazdi
async function duelloAnaliz(secenek) {
    const o = secenek || {};
    const filtre = {};
    if (o.gun) filtre.tarih = { $gte: new Date(Date.now() - o.gun * 86400000) };
    if (o.sinif) filtre.sinif = o.sinif;
    if (o.kullanici) filtre.$or = [{ saldiranAd: o.kullanici }, { rakipAd: o.kullanici }];
    const kayitlar = await DuelloKayit.find(filtre).sort({ tarih: 1 }).lean();

    const soruIdler = [...new Set(kayitlar.map(d => d.soruId && String(d.soruId)).filter(Boolean))];
    const sorular = soruIdler.length ? await Soru.find({ _id: { $in: soruIdler } }, 'soruNo ortalamaSure dogruCevapSureleri').lean() : [];
    const soruBilgi = {};
    sorular.forEach(s => { soruBilgi[String(s._id)] = { no: s.soruNo, ref: soruRefSure(s), esik: gecerliSureEsigi(s) }; });
    const esikOf = id => ((soruBilgi[String(id)] || {}).esik) || ESIK.TABAN_SN;
    const gecerli = (sure, id) => typeof sure === 'number' && sure >= esikOf(id);

    const adlar = [...new Set(kayitlar.flatMap(d => [d.saldiranAd, d.rakipAd]).filter(Boolean))];
    const cevaplar = adlar.length ? await CevapKaydi.find({ kullaniciAdi: { $in: adlar } }, 'kullaniciAdi dogruMu sure tarih').sort({ tarih: 1 }).lean() : [];
    const cevapMap = {};
    cevaplar.forEach(c => { (cevapMap[c.kullaniciAdi] = cevapMap[c.kullaniciAdi] || []).push(c); });
    function durumOnce(ad, t) {
        const l = cevapMap[ad] || [], tt = new Date(t).getTime();
        let lo = 0, hi = l.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (new Date(l[m].tarih).getTime() < tt) lo = m + 1; else hi = m; }
        return hizliIsaretleme(l.slice(Math.max(0, lo - ESIK.SON_CEVAP), lo));
    }

    const rumuz = {};
    const st = {};
    const oy = a => (st[a] = st[a] || { ad: a, sald: 0, saldK: 0, sav: 0, savK: 0, supheliK: 0, k2: 0, kazanSure: [], sinif: '' });
    const duellolar = [];
    let supheli = 0, k1Say = 0, k2Say = 0, birSay = 0;
    for (const d of kayitlar) {
        if (d.saldiranRumuz) rumuz[d.saldiranAd] = d.saldiranRumuz;
        if (d.rakipRumuz) rumuz[d.rakipAd] = d.rakipRumuz;
        const sKazandi = d.kazananAd === d.saldiranAd;
        const sG = gecerli(d.saldiranSure, d.soruId), rG = gecerli(d.rakipSure, d.soruId);
        const k1 = !(sKazandi ? sG : rG);
        const isb = durumOnce(d.saldiranAd, d.tarih);
        const k2 = isb.engel;
        if (k1) { supheli++; k1Say++; }
        if (k2) k2Say++;
        if (k1 || k2) birSay++;
        const S = oy(d.saldiranAd), R = oy(d.rakipAd);
        S.sinif = S.sinif || d.sinif; R.sinif = R.sinif || d.sinif;
        S.sald++; R.sav++;
        if (sKazandi) { S.saldK++; S.kazanSure.push(d.saldiranSure); } else { R.savK++; R.kazanSure.push(d.rakipSure); }
        if (k1) oy(d.kazananAd).supheliK++;
        if (k2) S.k2++;
        const sb = soruBilgi[String(d.soruId)] || {};
        duellolar.push({
            tarih: d.tarih, sinif: d.sinif, saldiranAd: d.saldiranAd, rakipAd: d.rakipAd, kazananAd: d.kazananAd, sKazandi,
            soruId: d.soruId, soruNo: sb.no, ref: sb.ref, esik: esikOf(d.soruId),
            saldiranSure: d.saldiranSure, rakipSure: d.rakipSure, sG, rG, isabet: isb, k1, k2,
            rakipGecersiz: !!d.rakipGecersiz
        });
    }

    const hucreGrup = adlar.length ? await OyunHucre.aggregate([{ $match: { sahip: { $in: adlar } } }, { $group: { _id: '$sahip', n: { $sum: 1 } } }]) : [];
    const hucre = {};
    hucreGrup.forEach(h => { hucre[h._id] = h.n; });
    const oyuncular = Object.values(st).map(s => {
        const l = cevapMap[s.ad] || [], son = l.slice(-ESIK.SON_CEVAP);
        const simdi = hizliIsaretleme(son);
        return Object.assign(s, {
            rumuz: rumuz[s.ad] || '', hucre: hucre[s.ad] || 0, kazanSureMedyan: medyan(s.kazanSure),
            sonN: son.length, sonDogru: son.length ? son.filter(c => c.dogruMu).length / son.length : null,
            sonMedyanSure: medyan(son.map(c => c.sure)),
            sonHizli: son.length ? son.filter(c => typeof c.sure === 'number' && c.sure < ESIK.HIZLI_SN).length / son.length : null,
            toplamCevap: l.length, toplamDogru: l.length ? l.filter(c => c.dogruMu).length / l.length : null,
            engelSimdi: simdi.engel
        });
    }).sort((a, b) => (b.supheliK - a.supheliK) || (b.saldK - a.saldK));

    return {
        esik: ESIK, duellolar, oyuncular,
        ozet: { toplam: kayitlar.length, supheli, k1: k1Say, k2: k2Say, biri: birSay }
    };
}

module.exports = { ESIK, medyan, soruRefSure, gecerliSureEsigi, hizliIsaretleme, saldiriEngeli, duelloAnaliz };
