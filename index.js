const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Kendi linkini yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/lgs_veritabani?retryWrites=true&w=majority";

mongoose.connect(dbURI).then(() => console.log("✅ Bağlantı Tamam")).catch(err => console.log("❌ Hata:", err.message));

// 2. MODEL
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({ kullaniciAdi: String, sifre: String }));
const Soru = mongoose.model('Soru', new mongoose.Schema({ 
    sinif: String, ders: String, unite: String, konu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }], 
    dogruCevapIndex: Number 
}));

// 3. ANA SAYFA (Giriş)
app.get('/', (req, res) => {
    res.send(`<html><body style="text-align:center; padding-top:50px; font-family:sans-serif;"><h2>LGS Soru Çözüm</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı"><br><input type="password" name="sifre" placeholder="Şifre"><br><button type="submit">GİRİŞ YAP</button></form><hr><a href="/admin">Admin Paneli</a></body></html>`);
});

// 4. ADMIN GİRİŞ SAYFASI
app.get('/admin', (req, res) => {
    res.send(`<html><body style="text-align:center; padding-top:100px; font-family:sans-serif; background:#333; color:white;"><h2>🔐 Admin Girişi</h2><form action="/admin-giris" method="POST"><input name="adminAdi" placeholder="Admin Adı"><br><input type="password" name="adminSifre" placeholder="Şifre"><br><button type="submit">GİRİŞ YAP</button></form></body></html>`);
});

// 5. ADMIN GİRİŞ KONTROLÜ
app.post('/admin-giris', (req, res) => {
    const { adminAdi, adminSifre } = req.body;
    if (adminAdi === "zaferadmin" && adminSifre === "123456") {
        res.redirect('/admin-panel'); // Burası seni formun olduğu sayfaya atar
    } else {
        res.send("Hatalı Giriş!");
    }
});

// 6. ADMIN SORU EKLEME PANELİ (RESİM ALANLARI BURADA)
app.get('/admin-panel', (req, res) => {
    res.send(`
        <div style="max-width:600px; margin:20px auto; font-family:sans-serif; border:1px solid #ddd; padding:20px; border-radius:10px;">
            <h2 style="text-align:center;">📝 Yeni Soru Ekle</h2>
            <form action="/soru-kaydet" method="POST">
                <input type="text" name="sinif" placeholder="Sınıf" style="width:48%;" required>
                <input type="text" name="ders" placeholder="Ders" style="width:48%;" required><br><br>
                <input type="text" name="konu" placeholder="Konu" style="width:100%;" required><br><br>
                <label>Soru Görseli URL:</label><br>
                <input type="text" name="soruResmi" placeholder="https://resim-linki.com" style="width:100%;"><br><br>
                <textarea name="soruMetni" placeholder="Soru Metni" style="width:100%; height:50px;"></textarea><br><br>
                
                ${['A', 'B', 'C', 'D'].map((harf, i) => `
                    <div style="background:#f9f9f9; padding:5px; margin:5px 0;">
                        <strong>${harf} Şıkkı:</strong><br>
                        <input name="metin${i}" placeholder="Metin">
                        <input name="gorsel${i}" placeholder="Görsel URL">
                        <input type="radio" name="dogruCevap" value="${i}" required> Doğru
                    </div>
                `).join('')}
                <br><button type="submit" style="width:100%; padding:10px; background:green; color:white; border:none; cursor:pointer;">KAYDET</button>
            </form>
        </div>
    `);
});

// 7. SORU KAYDETME
app.post('/soru-kaydet', async (req, res) => {
    const yeniSoru = new Soru({
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu,
        soruMetni: req.body.soruMetni, soruResmi: req.body.soruResmi,
        secenekler: [
            { metin: req.body.metin0, gorsel: req.body.gorsel0 },
            { metin: req.body.metin1, gorsel: req.body.gorsel1 },
            { metin: req.body.metin2, gorsel: req.body.gorsel2 },
            { metin: req.body.metin3, gorsel: req.body.gorsel3 }
        ],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    await yeniSoru.save();
    res.send("✅ Soru Kaydedildi! <a href='/admin-panel'>Yeni Soru Ekle</a>");
});

// Giriş işlemi (Aynı kalıyor)
app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    const kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (kullanici) res.redirect('/profil/' + kullaniciAdi);
    else res.send("Hatalı!");
});

app.listen(process.env.PORT || 3000);
