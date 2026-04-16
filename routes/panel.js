const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');

function stdSapma(dizi) {
    if (!dizi || dizi.length < 2) return 0;
    const ort = dizi.reduce((a, b) => a + b, 0) / dizi.length;
    return Math.sqrt(dizi.reduce((a, b) => a + Math.pow(b - ort, 2), 0) / dizi.length);
}

function dogruOraniKademesi(oran) {
    if (oran <= 0.20) return 5;
    if (oran <= 0.40) return 4;
    if (oran <= 0.60) return 3;
    if (oran <= 0.80) return 2;
    return 1;
}

function sureKademesi(sure) {
    if (sure <= 30)  return 1;
    if (sure <= 60)  return 2;
    if (sure <= 90)  return 3;
    if (sure <= 120) return 4;
    return 5;
}

async function zorlukGuncelle(soruId) {
    const MINIMUM_COZUM = 50;
    const tumSorular = await Soru.find();
    for (const s of tumSorular) {
        let Z_final = 3;
        if (s.cozulmeSayisi > 0) {
            const dogruOrani = s.dogruSayisi / s.cozulmeSayisi;
            const D = dogruOraniKademesi(dogruOrani);
            const dogruSureleri = s.dogruCevapSureleri || [];
            const S = dogruSureleri.length > 0
                ? dogruSureleri.reduce((acc, sure) => acc + sureKademesi(sure), 0) / dogruSureleri.length
                : 3;
            const sigma = stdSapma(dogruSureleri);
            const sigma_n = Math.min(sigma / 60, 1);
            const Z_base = (D * 0.6) + (S * 0.4);
            const Z_ham = Z_base + sigma_n * 0.5;
            const agirlik = Math.min(s.cozulmeSayisi / MINIMUM_COZUM, 1);
            Z_final = (agirlik * Z_ham) + ((1 - agirlik) * 3);
        }
        s.zorlukKatsayisi = Math.min(Math.max(Math.round(Z_final * 10) / 10, 1), 5);
        await s.save();
    }
}

router.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const mod = req.query.mod || 'soru';
    const sorular = await Soru.find();

    const zorlukBilgisi = (soru) => {
        const z = soru.zorlukKatsayisi || 3;
        if (z < 1.5) return { etiket: "Çok Kolay", renk: "#27ae60" };
        if (z < 2.5) return { etiket: "Kolay",     renk: "#2ecc71" };
        if (z < 3.5) return { etiket: "Orta",      renk: "#f39c12" };
        if (z < 4.5) return { etiket: "Zor",       renk: "#e67e22" };
        return { etiket: "Çok Zor", renk: "#c0392b" };
    };

    res.render('panel', {
        k,
        mod,
        sorular,
        zorlukBilgisi,
        basla: req.query.basla,
        encodeURIComponent
    });
});

router.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (s && k) {
            const T_ogr = Math.max(parseInt(gecenSure) || 1, 1);
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;

            if (dogruMu) {
                const eskiCozulmeSayisi = s.cozulmeSayisi || 0;
                const eskiDogruSayisi = s.dogruSayisi || 0;
                const eskiSureleri = [...(s.cozumSureleriTum || [])];
                const T_ref = s.ortalamaSure || 60;
                const T_min = 10;
                const logHiz = Math.log2(1 + (T_ref / T_ogr));
                const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
                const hizBileseni = logMax * Math.tanh(logHiz / logMax);
                const dogruOrani = eskiCozulmeSayisi > 0 ? eskiDogruSayisi / eskiCozulmeSayisi : 0.5;
                const sigmaBasari = eskiCozulmeSayisi > 1
                    ? stdSapma(Array(eskiDogruSayisi).fill(1).concat(Array(eskiCozulmeSayisi - eskiDogruSayisi).fill(0)))
                    : 0;
                const Z_katsayi = Math.min(1 + 4 * (1 - dogruOrani) * (1 + sigmaBasari), 5);
                const sigmaSure = stdSapma(eskiSureleri);
                const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);
                const kazanilanPuan = Math.max(Math.round(Z_katsayi * T_ref * hizBileseni * GE), 1);
                k.puan += kazanilanPuan;
            }

            s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;
            if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;
            const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
            s.ortalamaSure = (eskiSureToplami + T_ogr) / s.cozulmeSayisi;
            s.cozumSureleriTum = s.cozumSureleriTum || [];
            s.cozumSureleriTum.push(T_ogr);
            if (dogruMu) {
                s.dogruCevapSureleri = s.dogruCevapSureleri || [];
                s.dogruCevapSureleri.push(T_ogr);
            }
            await s.save();

            k.toplamSure += T_ogr;
            k.cozumSureleri.push({ soruId: soruId, sure: T_ogr });
            k.soruIndex += 1;
            await k.save();
            await zorlukGuncelle(soruId);
        }
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

module.exports = router;
