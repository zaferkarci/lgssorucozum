const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
.then(() => console.log("✅ MongoDB Bağlandı"))
.catch(err => console.error("❌ Hata:", err.message));

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

// --- ANA SAYFA ---
app.get('/', (req, res) => {
    res.send(`<h2>LGS Hazırlık</h2><form action="/giris" method="POST">
    <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required>
    <input type="password" name="sifre" placeholder="Şifre" required>
    <button>GİRİŞ</button></form><a href="/kayit">Kayıt Ol</a>`);
});

// --- KAYIT ---
app.get('/kayit', (req, res) => {
    res.send(`<form action="/kayit-yap" method="POST">
    <input name="kullaniciAdi" required>
    <input name="sifre" required>
    <input name="sifreTekrar" required>
    <button>Kayıt</button></form>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar } = req.body;
    if (sifre !== sifreTekrar) return res.send("Şifreler uyuşmuyor");

    await new Kullanici({ kullaniciAdi, sifre }).save();
    res.redirect('/');
});

// --- GİRİŞ ---
app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("Hatalı giriş");
    res.redirect('/panel/' + k.kullaniciAdi);
});

// --- PANEL ---
app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();

    if (!sorular.length) return res.send("Soru yok");

    const soru = sorular[k.soruIndex % sorular.length];

    res.send(`
    <h3>${k.kullaniciAdi} | Puan: ${k.puan}</h3>
    <h2>${soru.soruMetni}</h2>

    ${[0,1,2,3].map(i => `
    <form method="POST" action="/cevap">
        <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
        <input type="hidden" name="soruId" value="${soru._id}">
        <input type="hidden" name="secilenIndex" value="${i}">
        <input type="hidden" name="gecenSure" value="60">
        <button>${String.fromCharCode(65+i)}</button>
    </form>`).join("")}
    `);
});

// --- CEVAP ---
app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;

    const s = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });

    if (!s || !k) return res.send("Hata");

    // --- VERİ GÜNCELLE ---
    s.cozulmeSayisi++;
    const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
    if (dogruMu) s.dogruSayisi++;

    s.ortalamaSure = ((s.ortalamaSure * (s.cozulmeSayisi - 1)) + parseInt(gecenSure)) / s.cozulmeSayisi;

    // --- ZORLUK ---
    const basariOran = s.dogruSayisi / s.cozulmeSayisi;
    let Z_katsayi = 3;
    if (basariOran > 0.8) Z_katsayi = 1;
    else if (basariOran > 0.6) Z_katsayi = 2;
    else if (basariOran > 0.4) Z_katsayi = 3;
    else if (basariOran > 0.2) Z_katsayi = 4;
    else Z_katsayi = 5;

    // --- DİNAMİK GE ---
    function hesaplaGE(soru) {
        const maxGE = 0.10;
        const minGE = 0.02;
        let ge = maxGE - (soru.cozulmeSayisi * 0.002);
        return ge < minGE ? minGE : ge;
    }

    const GE = hesaplaGE(s);

    const T_ref = s.ortalamaSure || 60;
    const T_ogr = Math.max(parseInt(gecenSure), 1);

    const puan = Math.round((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE) || 1;

    if (dogruMu) k.puan += puan;

    k.soruIndex++;
    await s.save();
    await k.save();

    res.redirect('/panel/' + k.kullaniciAdi);
});

// --- SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sunucu ${PORT} portunda hazır!`);
});