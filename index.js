const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Kendi linkini yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/lgs_veritabani?retryWrites=true&w=majority";

mongoose.connect(dbURI).then(() => console.log("✅ Bağlantı Tamam")).catch(err => console.log("❌ Hata:", err.message));

// 2. MODEL (Görsel Destekli Soru Yapısı)
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({ kullaniciAdi: String, sifre: String }));
const Soru = mongoose.model('Soru', new mongoose.Schema({ 
    sinif: String, ders: String, unite: String, konu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }], 
    dogruCevapIndex: Number 
}));

// 3. ADMIN PANELİ (Resim Ekleme Alanları Dahil)
app.get('/admin-panel', (req, res) => {
    res.send(`
        <div style="max-width:800px; margin:20px auto; font-family:sans-serif; background:#f8f9fa; padding:30px; border-radius:15px; border:1px solid #ddd;">
            <h2 style="text-align:center; color:#007bff;">🚀 LGS Soru Yönetim Paneli</h2>
            <form action="/soru-kaydet" method="POST">
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="text" name="sinif" placeholder="Sınıf (Örn: 8)" style="flex:1; padding:10px;" required>
                    <input type="text" name="ders" placeholder="Ders (Örn: Matematik)" style="flex:1; padding:10px;" required>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="text" name="unite" placeholder="Ünite Adı" style="flex:1; padding:10px;" required>
                    <input type="text" name="konu" placeholder="Konu Adı" style="flex:1; padding:10px;" required>
                </div>

                <label>Soru Metni:</label><br>
                <textarea name="soruMetni" style="width:100%; height:60px; margin-bottom:15px;"></textarea><br>

                <label>Soru Görseli (URL Linki):</label><br>
                <input type="text" name="soruResmi" placeholder="https://resim-linki.com" style="width:100%; padding:10px; margin-bottom:20px;"><br>

                <h3 style="border-bottom:2px solid #007bff; padding-bottom:5px;">Şıklar (Metin veya Resim Linki)</h3>
                ${['A', 'B', 'C', 'D'].map((harf, i) => `
                    <div style="background:white; padding:15px; margin-bottom:10px; border-radius:10px; border:1px solid #eee;">
                        <strong>${harf} Şıkkı</strong><br>
                        <input type="text" name="metin${i}" placeholder="Şık Metni" style="width:45%; padding:8px;">
                        <input type="text" name="gorsel${i}" placeholder="Şık Resim URL" style="width:45%; padding:8px;">
                        <input type="radio" name="dogruCevap" value="${i}" required> Doğru Şık
                    </div>
                `).join('')}

                <button type="submit" style="width:100%; padding:15px; background:#28a745; color:white; border:none; border-radius:10px; font-size:18px; cursor:pointer; font-weight:bold;">SİSTEME KAYDET</button>
            </form>
        </div>
    `);
});

// 4. SORU KAYDETME (POST)
app.post('/soru-kaydet', async (req, res) => {
    try {
        const yeniSoru = new Soru({
            sinif: req.body.sinif, ders: req.body.ders, unite: req.body.unite, konu: req.body.konu,
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
        res.send("<h1>✅ Soru Kaydedildi!</h1><a href='/admin-panel'>Yeni Soru Ekle</a> | <a href='/'>Çıkış</a>");
    } catch (err) { res.send("Hata: " + err.message); }
});

// DİĞER ROTALAR (Giriş, Kayıt vb. önceki kodlarınla aynı kalsın)
app.get('/', (req, res) => { /* Mevcut giriş sayfası kodun */ });
app.get('/soru-havuzu', async (req, res) => { /* Önceki mesajdaki tasarım kodun */ });
app.listen(process.env.PORT || 3000);
