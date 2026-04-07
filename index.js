const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, 
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 }
}));

// --- YOLLAR ---
app.get('/', (req, res) => {
    res.send(`<h1>Çalışıyor</h1>`);
});

// 🔥 SADECE BURASI DEĞİŞTİ
app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });

        if (s && k) {
            s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;

            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
            if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;

            const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
            s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;

            await s.save();

            if (dogruMu) {
                const dersSorulari = await Soru.find({ ders: s.ders, cozulmeSayisi: { $gt: 0 } });

                let Z_katsayi = 3;

                if (dersSorulari.length > 1) {
                    const basariOranlari = dersSorulari.map(q => (q.dogruSayisi / q.cozulmeSayisi) * 100);
                    const sureler = dersSorulari.map(q => q.ortalamaSure || 0);

                    const mBasari = basariOranlari.reduce((a,b)=>a+b,0)/basariOranlari.length;
                    const sBasari = Math.sqrt(basariOranlari.reduce((a,b)=>a+Math.pow(b-mBasari,2),0)/basariOranlari.length) || 1;

                    const mSure = sureler.reduce((a,b)=>a+b,0)/sureler.length;
                    const sSure = Math.sqrt(sureler.reduce((a,b)=>a+Math.pow(b-mSure,2),0)/sureler.length) || 1;

                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mBasari) / sBasari;
                    const zS = (s.ortalamaSure - mSure) / sSure;

                    const zorluk = (zS * 0.5) - (zB * 0.5);

                    if (zorluk < -1.2) Z_katsayi = 1;
                    else if (zorluk < -0.5) Z_katsayi = 2;
                    else if (zorluk < 0.5) Z_katsayi = 3;
                    else if (zorluk < 1.2) Z_katsayi = 4;
                    else Z_katsayi = 5;
                }

                const T_ref = s.ortalamaSure || 60;
                const T_ogr = Math.max(parseInt(gecenSure), 1);

                // ✅ DİNAMİK GE
                function hesaplaGE(soru) {
                    const maxGE = 0.10;
                    const minGE = 0.02;

                    const cozulme = soru.cozulmeSayisi || 1;

                    let ge = maxGE - (cozulme - 1) * 0.002;

                    if (ge < minGE) ge = minGE;

                    return ge;
                }

                const GE = hesaplaGE(s);

                const kazanilanPuan = Math.round((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE) || 1;

                k.puan += Math.max(kazanilanPuan, 1);
            }

            k.toplamSure += parseInt(gecenSure) || 0;
            k.cozumSureleri.push({ soruId: soruId, sure: parseInt(gecenSure) || 0 });
            k.soruIndex += 1;

            await k.save();
        }

        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');

    } catch (err) {
        res.status(500).send("Hata: " + err.message);
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));