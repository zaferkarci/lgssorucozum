const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Buraya Kendi Linkini Yapıştır!)
const dbURI = "mongodb+srv://zafer:Uras.0203@cluster0.abcde.mongodb.net/lgs_proje?retryWrites=true&w=majority";

mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Bağlantısı Başarılı!"))
    .catch(err => console.log("❌ Bağlantı Hatası:", err.message));

// 2. KULLANICI MODELİ
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, required: true, unique: true },
    sifre: { type: String, required: true }
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
                    <p style="font-size:14px; color:#666;">Hesabın yok mu? Kayıt Ol:</p>
                    <input type="text" name="kullaniciAdi" placeholder="Yeni Kullanıcı Adı" required>
                    <input type="password" name="sifre" placeholder="Şifre" required>
                    <button type="submit" class="btn-kayit">KAYIT OL</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 4. PROFİL SAYFASI (Giriş Sonrası - İstediğin Bölüm)
app.get('/profil/:isim', (req, res) => {
    const isim = req.params.isim;
    res.send(`
        <html>
        <head>
            <title>Profil - ${isim}</title>
            <style>
                body{font-family:sans-serif; text-align:center; padding-top:100px; background:#f0f2f5; margin:0;}
                .profile-card{background:white; padding:50px; border-radius:20px; display:inline-block; box-shadow:0 10px 30px rgba(0,0,0,0.1); width:400px;}
                h1 { color: #333; margin-bottom: 10px; }
                p { color: #666; margin-bottom: 30px; }
                .btn-coz {
                    display:block; background:#007bff; color:white; padding:20px; 
                    border-radius:15px; text-decoration:none; font-weight:bold; 
                    font-size:22px; transition:0.3s; box-shadow: 0 4px 15px rgba(0,123,255,0.3);
                }
                .btn-coz:hover { transform: scale(1.05); background:#0056b3; }
                .logout { display:inline-block; margin-top:30px; color:#999; text-decoration:none; font-size:14px; }
            </style>
        </head>
        <body>
            <div class="profile-card">
                <h1>Merhaba, ${isim}! 👋</h1>
                <p>Hazırsan LGS sorularını çözmeye başlayalım.</p>
                <a href="/soru-havuzu" class="btn-coz">🚀 SORU ÇÖZMEYE BAŞLA</a>
                <a href="/" class="logout">Oturumu Kapat</a>
            </div>
        </body>
        </html>
    `);
});

// 5. SORU HAVUZU (Taslak)
app.get('/soru-havuzu', (req, res) => {
    res.send(`
        <div style="text-align:center; padding-top:100px; font-family:sans-serif;">
            <h1>📚 Soru Havuzu</h1>
            <p>Burada çözmen gereken sorular listelenecek.</p>
            <a href="javascript:history.back()">Geri Dön</a>
        </div>
    `);
});

// 6. İŞLEMLER
app.post('/kayit', async (req, res) => {
    try {
        const yeni = new Kullanici({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
        await yeni.save();
        res.send("<h1>✅ Kayıt Başarılı!</h1><a href='/'>Geri Dön ve Giriş Yap</a>");
    } catch (error) { res.send("<h1>❌ Hata!</h1><a href='/'>Geri Dön</a>"); }
});

app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    const kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (kullanici) {
        res.redirect('/profil/' + kullaniciAdi);
    } else {
        res.send("<h1>❌ Bilgiler Yanlış!</h1><a href='/'>Tekrar Dene</a>");
    }
});

app.listen(process.env.PORT || 3000, () => console.log("🌍 Sunucu Aktif!"));
