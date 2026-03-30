const mongoose = require('mongoose');
const express = require('express');
const app = express();

// 1. AYARLAR: Formdan gelen verileri okumak için
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. MONGODB BAĞLANTISI (Buraya Kendi Linkini Yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/?appName=lgssorucozum";

mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Bağlantısı Başarılı!"))
    .catch(err => console.log("❌ Bağlantı Hatası:", err.message));

// 3. KULLANICI MODELİ
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, required: true, unique: true },
    sifre: { type: String, required: true }
}));

// 4. ARAYÜZ (Giriş Üstte, Kayıt Altta)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LGS Soru Çözüm</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #e9ecef; }
                .container { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 350px; }
                h2 { text-align: center; color: #333; margin-bottom: 25px; }
                input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
                button { width: 100%; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.3s; margin-top: 10px; }
                .btn-giris { background-color: #007bff; color: white; }
                .btn-giris:hover { background-color: #0056b3; }
                .btn-kayit { background-color: #28a745; color: white; }
                .btn-kayit:hover { background-color: #218838; }
                .divider { text-align: center; margin: 20px 0; color: #888; position: relative; }
                .divider::before { content: ""; position: absolute; left: 0; top: 50%; width: 40%; height: 1px; background: #ddd; }
                .divider::after { content: ""; position: absolute; right: 0; top: 50%; width: 40%; height: 1px; background: #ddd; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>LGS Platformu</h2>
                
                <!-- GİRİŞ FORMU (ÜSTTE) -->
                <form action="/giris" method="POST">
                    <input type="text" name="kullaniciAdi" placeholder="Kullanıcı Adı" required>
                    <input type="password" name="sifre" placeholder="Şifre" required>
                    <button type="submit" class="btn-giris">GİRİŞ YAP</button>
                </form>

                <div class="divider">veya</div>

                <!-- KAYIT FORMU (ALTTA) -->
                <form action="/kayit" method="POST">
                    <p style="text-align:center; font-size:14px; color:#666;">Hesabın yok mu? Hemen oluştur:</p>
                    <input type="text" name="kullaniciAdi" placeholder="Yeni Kullanıcı Adı" required>
                    <input type="password" name="sifre" placeholder="Yeni Şifre" required>
                    <button type="submit" class="btn-kayit">KAYIT OL</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 5. KAYIT İŞLEMİ
app.post('/kayit', async (req, res) => {
    try {
        const yeni = new Kullanici({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
        await yeni.save();
        res.send("<h1>✅ Kayıt Başarılı!</h1><a href='/'>Geri Dön ve Giriş Yap</a>");
    } catch (error) {
        res.send("<h1>❌ Hata: Bu kullanıcı adı zaten var!</h1><a href='/'>Tekrar Dene</a>");
    }
});

// 6. GİRİŞ İŞLEMİ
app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    const kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });

    if (kullanici) {
        res.send(`<h1>👋 Hoş geldin ${kullaniciAdi}!</h1><p>Giriş başarılı. Versiyon 1 Hazır.</p>`);
    } else {
        res.send("<h1>❌ Hata: Kullanıcı adı veya şifre yanlış!</h1><a href='/'>Tekrar Dene</a>");
    }
});

// 7. SUNUCU BAŞLAT
app.listen(3000, () => console.log("🌍 Web sitesi hazır: http://localhost:3000"));
