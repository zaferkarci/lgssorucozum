const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Kendi linkini buraya yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/lgs_veritabani?retryWrites=true&w=majority";

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlantısı Başarılı")).catch(err => console.log("❌ Hata:", err.message));

// 2. MODEL (Sınıf, Ders, Ünite ve Resim Destekli)
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({ kullaniciAdi: String, sifre: String }));
const Soru = mongoose.model('Soru', new mongoose.Schema({ 
    sinif: String, ders: String, unite: String, konu: String, 
    soruOnculu: String, // Yeni: Sorunun en üstündeki metin
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }], 
    dogruCevapIndex: Number 
}));


// 3. ANA SAYFA VE GİRİŞ
app.get('/', (req, res) => {
    res.send(`<html><body style="text-align:center; padding-top:50px; font-family:sans-serif;"><h2>LGS Soru Çözüm</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required><br><input type="password" name="sifre" placeholder="Şifre" required><br><button type="submit">GİRİŞ YAP</button></form><hr><a href="/admin">Admin Paneli</a></body></html>`);
});

app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    const kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (kullanici) res.redirect('/profil/' + kullaniciAdi);
    else res.send("Hatalı Giriş!");
});

// 4. PROFİL SAYFASI
app.get('/profil/:isim', (req, res) => {
    const isim = req.params.isim;
    res.send(`<div style="text-align:center; padding-top:100px; font-family:sans-serif;"><h1>Merhaba, ${isim}! 👋</h1><a href="/soru-havuzu" style="background:#007bff; color:white; padding:20px; border-radius:15px; text-decoration:none; font-weight:bold; font-size:22px; display:inline-block;">🚀 SORULARI ÇÖZ</a></div>`);
});

// 5. ADMIN GİRİŞ VE PANEL (RESİM EKLEME ALANLARI BURADA)
app.get('/admin', (req, res) => {
    res.send(`<html><body style="text-align:center; padding-top:100px; font-family:sans-serif; background:#333; color:white;"><h2>🔐 Admin Girişi</h2><form action="/admin-giris" method="POST"><input name="adminAdi" placeholder="Admin Adı"><br><input type="password" name="adminSifre" placeholder="Şifre"><br><button type="submit">GİRİŞ YAP</button></form></body></html>`);
});

app.post('/admin-giris', (req, res) => {
    const { adminAdi, adminSifre } = req.body;
    if (adminAdi === "zaferadmin" && adminSifre === "123456") res.redirect('/admin-panel');
    else res.send("Hatalı Admin Girişi!");
});

app.get('/admin-panel', (req, res) => {
    res.send(`
        <div style="max-width:800px; margin:20px auto; font-family:sans-serif; background:#fff; padding:30px; border-radius:15px; box-shadow:0 0 20px rgba(0,0,0,0.1);">
            <h2 style="text-align:center; color:#007bff;">🚀 Gelişmiş Soru Ekleme Paneli</h2>
            <form action="/soru-kaydet" method="POST">
                
                <!-- SEÇİMLER (Açılır Menü) -->
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <select name="sinif" style="flex:1; padding:10px;">
                        <option value="8">8. Sınıf</option>
                        <option value="7">7. Sınıf</option>
                    </select>
                    <select name="ders" style="flex:1; padding:10px;">
                        <option value="Matematik">Matematik</option>
                        <option value="Fen Bilimleri">Fen Bilimleri</option>
                        <option value="Türkçe">Türkçe</option>
                    </select>
                </div>

                <div style="margin-bottom:15px;">
                    <label>Ünite ve Konu Seçimi:</label><br>
                    <select name="konu" style="width:100%; padding:10px; margin-top:5px;">
                        <optgroup label="Matematik">
                            <option value="Çarpanlar ve Katlar">Çarpanlar ve Katlar</option>
                            <option value="Üslü İfadeler">Üslü İfadeler</option>
                            <option value="Kareköklü İfadeler">Kareköklü İfadeler</option>
                            <option value="Veri Analizi">Veri Analizi</option>
                            <option value="Basit Olayların Olma Olasılığı">Basit Olayların Olma Olasılığı</option>
                            <option value="Cebirsel İfadeler">Cebirsel İfadeler</option>
                        </optgroup>
                    </select>
                </div>

                <label><b>Soru Öncülü (Resmin Üstündeki Metin):</b></label><br>
                <textarea name="soruOnculu" placeholder="Örn: Verilen bilgilere göre soruları cevaplayınız..." style="width:100%; height:60px; margin:10px 0;"></textarea><br>

                <label><b>Soru Görseli (URL):</b></label><br>
                <input type="text" name="soruResmi" placeholder="https://resim-linki.com" style="width:100%; padding:10px; margin-bottom:15px;"><br>

                <label><b>Soru Kökü (Asıl Soru):</b></label><br>
                <textarea name="soruMetni" placeholder="Örn: Buna göre x kaçtır?" style="width:100%; height:40px; margin-bottom:15px; font-weight:bold;"></textarea><br>
                
                <h3 style="border-bottom:2px solid #eee; padding-bottom:5px;">Şıklar</h3>
                ${['A', 'B', 'C', 'D'].map((harf, i) => `
                    <div style="background:#f9f9f9; padding:10px; margin:5px 0; border-radius:5px; border-left:4px solid #007bff;">
                        <strong>${harf} Şıkkı:</strong>
                        <input name="metin${i}" placeholder="Şık metni" style="width:35%;">
                        <input name="gorsel${i}" placeholder="Şık Görsel URL" style="width:35%;">
                        <input type="radio" name="dogruCevap" value="${i}" required> <b>Doğru</b>
                    </div>
                `).join('')}
                
                <br><button type="submit" style="width:100%; padding:15px; background:#28a745; color:white; border:none; border-radius:10px; font-size:18px; cursor:pointer; font-weight:bold;">SORUYU KAYDET</button>
            </form>
        </div>
    `);
});

// Kaydetme fonksiyonuna soruOnculu'yu da eklemeyi unutma:
app.post('/soru-kaydet', async (req, res) => {
    const yeniSoru = new Soru({
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu,
        soruOnculu: req.body.soruOnculu, // eklendi
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

app.post('/soru-kaydet', async (req, res) => {
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
    res.send("✅ Soru Kaydedildi! <a href='/admin-panel'>Yeni Soru Ekle</a> | <a href='/'>Ana Sayfa</a>");
});

// 6. SORU HAVUZU (Öğrenci Ekranı)
app.get('/soru-havuzu', async (req, res) => {
    const sorular = await Soru.find();
    if (sorular.length === 0) return res.send("Soru bulunamadı!");
    const soru = sorular[Math.floor(Math.random() * sorular.length)];
    const harfler = ["A", "B", "C", "D"];
    res.send(`
        <div style="max-width:600px; margin:50px auto; font-family:sans-serif; text-align:center;">
            <p>${soru.sinif}. Sınıf - ${soru.ders} (${soru.konu})</p>
            ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%;">` : ""}
            <h2>${soru.soruMetni}</h2>
            ${soru.secenekler.map((s, i) => `
                <button onclick="alert('${i === soru.dogruCevapIndex ? 'DOĞRU!' : 'YANLIŞ!'}'); location.reload();" style="display:block; width:100%; margin:10px 0; padding:15px; text-align:left;">
                    <b>${harfler[i]})</b> ${s.metin} ${s.gorsel ? `<img src="${s.gorsel}" style="height:30px;">` : ""}
                </button>
            `).join('')}
        </div>
    `);
});

app.listen(process.env.PORT || 3000);
