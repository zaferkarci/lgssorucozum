const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Kendi linkini buraya yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/?appName=lgssorucozum";

mongoose.connect(dbURI, {
    serverSelectionTimeoutMS: 5000 // 5 saniye bekleyip bağlanamazsa hata ver
})
.then(() => console.log("✅ MONGODB BAGLANTISI KURULDU!"))
.catch(err => console.log("❌ BAGLANTI HATASI DETAYI:", err.message));

// 2. MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, required: true, unique: true },
    sifre: { type: String, required: true }
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({ 
    ders: String, 
    soruMetni: String, 
    secenekler: [String], 
    dogruCevap: String 
}));

// 3. ANA SAYFA (Giriş/Kayıt)
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>LGS Giriş</title><style>body{font-family:sans-serif; display:flex; justify-content:center; padding-top:50px; background:#f4f4f4;} .box{background:white; padding:20px; border-radius:10px; width:300px; box-shadow:0 0 10px rgba(0,0,0,0.1); text-align:center;} input{width:100%; padding:10px; margin:5px 0; border:1px solid #ddd; border-radius:5px;} button{width:100%; padding:10px; margin-top:10px; cursor:pointer; border:none; border-radius:5px; color:white; font-weight:bold;} .btn-giris{background:#007bff;} .btn-kayit{background:#28a745;}</style></head>
        <body>
            <div class="box">
                <h2>LGS Soru Çözüm</h2>
                <form action="/giris" method="POST">
                    <input type="text" name="kullaniciAdi" placeholder="Kullanıcı Adı" required>
                    <input type="password" name="sifre" placeholder="Şifre" required>
                    <button type="submit" class="btn-giris">GİRİŞ YAP</button>
                </form>
                <hr>
                <form action="/kayit" method="POST">
                    <p style="font-size:14px; color:#666;">Kayıt Ol:</p>
                    <input type="text" name="kullaniciAdi" placeholder="Yeni Kullanıcı Adı" required>
                    <input type="password" name="sifre" placeholder="Şifre" required>
                    <button type="submit" class="btn-kayit">KAYIT OL</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 4. PROFİL SAYFASI
app.get('/profil/:isim', (req, res) => {
    const isim = req.params.isim;
    res.send(`
        <div style="text-align:center; padding-top:100px; font-family:sans-serif;">
            <h1>Merhaba, ${isim}! 👋</h1>
            <p>Hazırsan LGS sorularını çözmeye başlayalım.</p>
            <br>
            <a href="/soru-havuzu" style="background:#007bff; color:white; padding:20px; border-radius:15px; text-decoration:none; font-weight:bold; font-size:22px; display:inline-block; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">🚀 SORU ÇÖZMEYE BAŞLA</a>
            <br><br>
            <a href="/" style="color:gray; text-decoration:none; font-size:14px;">Oturumu Kapat</a>
        </div>
    `);
});

// 5. SORU HAVUZU (Veritabanından Soru Çeker)
app.get('/soru-havuzu', async (req, res) => {
    try {
        const soru = await Soru.findOne(); 
        if (!soru) return res.send("<h1>📚 Henüz soru eklenmemiş!</h1><a href='/'>Geri Dön</a>");

        res.send(`
            <div style="max-width:500px; margin:50px auto; font-family:sans-serif; border:1px solid #ddd; padding:30px; border-radius:15px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:center;">
                <p style="color:blue; font-weight:bold;">Ders: ${soru.ders}</p>
                <h2 style="margin:20px 0;">${soru.soruMetni}</h2>
                <hr>
                ${soru.secenekler.map(s => `
                    <button onclick="alert('${s === soru.dogruCevap ? '✅ TEBRİKLER! DOĞRU CEVAP.' : '❌ MAALESEF YANLIŞ.'}')" 
                    style="display:block; width:100%; margin:10px 0; padding:15px; cursor:pointer; border:1px solid #ddd; border-radius:10px; background:white; font-size:16px;">
                        ${s}
                    </button>
                `).join('')}
                <br>
                <a href="/profil/ogrenci" style="color:#999; text-decoration:none; font-size:14px;">⬅ Profilime Dön</a>
            </div>
        `);
    } catch (err) { res.send("Hata: " + err.message); }
});

// 6. İŞLEMLER (Giriş ve Kayıt)
app.post('/kayit', async (req, res) => {
    try {
        const yeni = new Kullanici({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
        await yeni.save();
        res.send("<h1>✅ Kayıt Başarılı!</h1><a href='/'>Geri Dön ve Giriş Yap</a>");
    } catch (error) { res.send("<h1>❌ Hata: Kullanıcı adı zaten var!</h1><a href='/'>Geri Dön</a>"); }
});

app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    const kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (kullanici) {
        res.redirect('/profil/' + kullaniciAdi);
    } else {
        res.send("<h1>❌ Kullanıcı adı veya şifre yanlış!</h1><a href='/'>Tekrar Dene</a>");
    }
});

// 7. ÖRNEK SORU EKLEME (Bu linke bir kez git: ://siteniz.com)
app.get('/soru-ekle', async (req, res) => {
    try {
        const yeniSoru = new Soru({
            ders: "Fen Bilimleri",
            soruMetni: "Dünyanın kendi ekseni etrafında dönmesi sonucunda ne oluşur?",
            secenekler: ["Mevsimler", "Gece ve Gündüz", "Yıllık Sıcaklık Farkı", "Ay Tutulması"],
            dogruCevap: "Gece ve Gündüz"
        });
        await yeniSoru.save();
        res.send("<h1>✅ Örnek soru veritabanına eklendi!</h1><a href='/'>Ana Sayfaya Dön</a>");
    } catch (err) { res.send("Soru ekleme hatası: " + err.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🌍 Sunucu Aktif: " + PORT));
