const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Buraya Kendi Linkini Dikkatlice Yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/?appName=lgssorucozum";

mongoose.connect(dbURI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("✅ MongoDB Bağlantısı Başarılı!"))
    .catch(err => console.log("❌ Bağlantı Hatası:", err.message));

// 2. MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({ kullaniciAdi: String, sifre: String }));
const Soru = mongoose.model('Soru', new mongoose.Schema({ konu: String, soruMetni: String, secenekler: [String], dogruCevap: String }));

// 3. ANA SAYFA (Giriş/Kayıt) - "Cannot GET /" HATASINI ÇÖZEN KISIM
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

// 4. PROFİL SAYFASI
app.get('/profil/:isim', (req, res) => {
    const isim = req.params.isim;
    res.send(`
        <div style="text-align:center; padding-top:100px; font-family:sans-serif; background:#f0f2f5; height:100vh; margin:0;">
            <div style="background:white; display:inline-block; padding:50px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); width:400px;">
                <h1>Merhaba, ${isim}! 👋</h1>
                <p>Hazırsan LGS Matematik sorularını çözmeye başlayalım.</p>
                <a href="/soru-havuzu" style="display:block; background:#007bff; color:white; padding:20px; border-radius:15px; text-decoration:none; font-weight:bold; font-size:22px;">🚀 SORULARI ÇÖZ</a>
                <a href="/" style="display:inline-block; margin-top:30px; color:#999; text-decoration:none;">Oturumu Kapat</a>
            </div>
        </div>
    `);
});

// 5. SORU HAVUZU (A, B, C, D Formatlı)
app.get('/soru-havuzu', async (req, res) => {
    try {
        const sorular = await Soru.find();
        if (sorular.length === 0) return res.send("<h1>📚 Soru bulunamadı!</h1><a href='/lgs-yukle'>Soruları Yükle</a>");
        const soru = sorular[Math.floor(Math.random() * sorular.length)];
        const harfler = ["A", "B", "C", "D"];

        res.send(`
            <div style="max-width:600px; margin:50px auto; font-family:sans-serif; border:2px solid #007bff; padding:30px; border-radius:20px; background:white;">
                <p style="text-align:center;"><span style="background:#e7f1ff; color:#007bff; padding:5px 15px; border-radius:20px; font-weight:bold;">${soru.konu}</span></p>
                <h2 style="line-height:1.6;">${soru.soruMetni}</h2>
                ${soru.secenekler.map((s, i) => `
                    <button onclick="k('${s}','${soru.dogruCevap}')" style="display:flex; width:100%; margin:10px 0; padding:15px; cursor:pointer; border:1px solid #eee; border-radius:10px; background:white; font-size:18px;">
                        <b style="background:#007bff; color:white; width:25px; height:25px; display:inline-block; border-radius:50%; margin-right:10px;">${harfler[i]}</b> ${s}
                    </button>
                `).join('')}
                <script>function k(s,d){if(s===d){alert('✅ DOĞRU!');location.reload();}else{alert('❌ YANLIŞ!');}}</script>
                <div style="text-align:center; margin-top:20px;"><a href="/profil/ogrenci" style="color:#999; text-decoration:none;">⬅ Profile Dön</a></div>
            </div>
        `);
    } catch (e) { res.send("Hata: " + e.message); }
});

// 6. İŞLEMLER (Giriş/Kayıt/Yükleme)
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
    if (kullanici) res.redirect('/profil/' + kullaniciAdi);
    else res.send("<h1>❌ Bilgiler Yanlış!</h1><a href='/'>Tekrar Dene</a>");
});

app.get('/lgs-yukle', async (req, res) => {
    const lgs = [
        { konu: "Çarpanlar ve Katlar", soruMetni: "Aralarında asal iki sayının EBOB'u kaçtır?", secenekler: ["0", "1", "2", "Hiçbiri"], dogruCevap: "1" },
        { konu: "Üslü İfadeler", soruMetni: "2 üzeri 4 (2⁴) kaçtır?", secenekler: ["8", "12", "16", "32"], dogruCevap: "16" }
    ];
    await Soru.insertMany(lgs);
    res.send("<h1>✅ Sorular Yüklendi!</h1><a href='/soru-havuzu'>Başla</a>");
});

// 7. ADMIN GİRİŞ SAYFASI
app.get('/admin', (req, res) => {
    res.send(`
        <html>
        <head><title>Admin Girişi</title><style>body{font-family:sans-serif; display:flex; justify-content:center; padding-top:100px; background:#343a40; color:white;} .admin-box{background:#495057; padding:30px; border-radius:15px; width:300px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5);} input{width:100%; padding:12px; margin:10px 0; border-radius:5px; border:none;} button{width:100%; padding:12px; background:#ffc107; border:none; border-radius:5px; cursor:pointer; font-weight:bold;}</style></head>
        <body>
            <div class="admin-box">
                <h2>Admin Paneli</h2>
                <form action="/admin-giris" method="POST">
                    <input type="text" name="adminAdi" placeholder="Admin Kullanıcı Adı" required>
                    <input type="password" name="adminSifre" placeholder="Admin Şifresi" required>
                    <button type="submit">SİSTEME GİRİŞ YAP</button>
                </form>
                <br><a href="/" style="color:#bbb; text-decoration:none; font-size:12px;">Ana Sayfaya Dön</a>
            </div>
        </body>
        </html>
    `);
});

// 8. ADMIN GİRİŞ İŞLEMİ
app.post('/admin-giris', (req, res) => {
    const { adminAdi, adminSifre } = req.body;

    // BURAYI KENDİNE GÖRE DEĞİŞTİR:
    if (adminAdi === "zaferadmin" && adminSifre === "123456") {
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding-top:100px;">
                <h1>🔐 Admin Yönetim Merkezi</h1>
                <p>Hoş geldin Zafer! Buradan soruları ve kullanıcıları yönetebilirsin.</p>
                <hr>
                <a href="/lgs-yukle" style="display:inline-block; padding:15px; background:blue; color:white; text-decoration:none; border-radius:10px;">📚 Soruları Güncelle/Yükle</a>
                <br><br>
                <a href="/" style="color:red;">Çıkış Yap</a>
            </div>
        `);
    } else {
        res.send("<h1>❌ Yetkisiz Erişim!</h1><a href='/admin'>Tekrar Dene</a>");
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Sunucu Hazır!"));

