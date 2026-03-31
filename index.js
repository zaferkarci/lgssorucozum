const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MONGODB - Not: Bu şifreyi canlıya alırken .env dosyasına taşımanı öneririm.
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/lgs_veritabani?retryWrites=true&w=majority";

mongoose.connect(dbURI)
.then(() => console.log("✅ MongoDB Bağlandı"))
.catch(err => console.log("❌ Bağlantı Hatası:", err));

// MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: String,
    sifre: String,
    soruIndex: { type: Number, default: 0 },
    puan: { type: Number, default: 0 } // Yeni: Puan takibi
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String,
    ders: String,
    konu: String,
    soruOnculu: String,
    soruMetni: String,
    soruResmi: String,
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number
}));

// ANA SAYFA
app.get('/', (req, res) => {
    res.send(`
    <div style="text-align:center; padding-top:50px; font-family:sans-serif;">
        <h2 style="color:#2c3e50;">LGS Soru Çözüm</h2>
        <form action="/giris" method="POST" style="display:inline-block; border:1px solid #ddd; padding:20px; border-radius:8px;">
            <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="padding:10px; margin:5px;"><br>
            <input type="password" name="sifre" placeholder="Şifre" required style="padding:10px; margin:5px;"><br>
            <button style="padding:10px 20px; background:#27ae60; color:white; border:none; border-radius:5px; cursor:pointer; margin-top:10px;">GİRİŞ YAP</button>
        </form>
        <br><br>
        <a href="/admin" style="color:#7f8c8d; text-decoration:none; font-size:14px;">🛠️ Admin Paneli</a>
    </div>
    `);
});

// GİRİŞ (yoksa oluşturur)
app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    let kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (!kullanici) {
        kullanici = new Kullanici({ kullaniciAdi, sifre });
        await kullanici.save();
    }
    res.redirect('/soru/' + kullaniciAdi);
});

// SORU GETİR
app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();

    if (sorular.length === 0) return res.send("❌ Henüz soru eklenmemiş!");

    const index = k.soruIndex % sorular.length;
    const soru = sorular[index];
    const harfler = ["A","B","C","D"];

    res.send(`
    <div style="max-width:700px; margin:20px auto; font-family:sans-serif; border:1px solid #eee; padding:20px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        <div style="display:flex; justify-content:space-between; color:#7f8c8d; font-size:14px;">
            <span>${soru.sinif}. Sınıf - ${soru.ders}</span>
            <span>Puan: <b>${k.puan}</b></span>
        </div>
        <hr color="#f4f4f4">
        <h4 style="color:#34495e;">${soru.konu}</h4>

        ${soru.soruOnculu ? `<p style="background:#f9f9f9; padding:15px; border-left:5px solid #3498db; line-height:1.6;">${soru.soruOnculu}</p>` : ""}
        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; border-radius:5px; margin:10px 0;">` : ""}

        <h2 style="font-size:20px; color:#2c3e50;">${soru.soruMetni}</h2>

        <div style="margin-top:20px;">
            ${soru.secenekler.map((s,i)=>`
                <form method="POST" action="/cevap" style="margin-bottom:10px;">
                    <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
                    <input type="hidden" name="soruId" value="${soru._id}">
                    <input type="hidden" name="secilenIndex" value="${i}">
                    <button type="submit" style="width:100%; padding:15px; text-align:left; cursor:pointer; background:white; border:2px solid #ecf0f1; border-radius:10px; transition:0.2s;" onmouseover="this.style.borderColor='#3498db'" onmouseout="this.style.borderColor='#ecf0f1'">
                        <b style="color:#3498db; margin-right:10px;">${harfler[i]})</b> ${s.metin || ""}
                        ${s.gorsel ? `<br><img src="${s.gorsel}" style="height:60px; margin-top:10px;">` : ""}
                    </button>
                </form>
            `).join('')}
        </div>
    </div>
    `);
});

// CEVAP KONTROL VE GEÇİŞ
app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex } = req.body;
    
    const soru = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });

    // Doğru cevap kontrolü (Basit puanlama)
    if (parseInt(secilenIndex) === soru.dogruCevapIndex) {
        k.puan += 10;
    }

    k.soruIndex += 1;
    await k.save();

    res.redirect('/soru/' + kullaniciAdi);
});

// ADMIN PANEL
app.get('/admin', (req, res) => {
    res.send(`
    <div style="max-width:600px; margin:auto; font-family:sans-serif; padding:20px;">
        <h2 style="color:#e67e22;">🛠️ Yeni Soru Ekle</h2>
        <form action="/soru-ekle" method="POST" style="background:#fdfdfd; padding:20px; border:1px dashed #ccc;">
            <input name="sinif" placeholder="Sınıf (Örn: 8)" required style="width:30%; padding:8px;">
            <input name="ders" placeholder="Ders" required style="width:60%; padding:8px;"><br><br>
            <input name="konu" placeholder="Konu" required style="width:95%; padding:8px;"><br><br>
            
            <label>Soru Metni / Öncülü</label>
            <textarea name="soruOnculu" style="width:95%; height:60px; margin-bottom:10px;"></textarea>
            
            <input name="soruResmi" placeholder="Soru Görseli URL (Opsiyonel)" style="width:95%; padding:8px; margin-bottom:10px;">
            
            <textarea name="soruMetni" placeholder="Asıl Soru Cümlesi" required style="width:95%; height:40px; margin-bottom:10px;"></textarea>

            <h3>Şıklar (Doğru olanı işaretleyin)</h3>
            ${[0,1,2,3].map(i=>`
                <div style="margin-bottom:10px; display:flex; align-items:center;">
                    <input name="metin${i}" placeholder="Şık metni" style="flex:2; padding:5px;">
                    <input name="gorsel${i}" placeholder="Görsel URL" style="flex:1; padding:5px; margin:0 5px;">
                    <input type="radio" name="dogruCevap" value="${i}" required>
                </div>
            `).join('')}

            <button style="padding:15px; width:100%; background:#e67e22; color:white; border:none; cursor:pointer; font-weight:bold;">SİSTEME KAYDET</button>
        </form>
        <br><a href="/">Ana Sayfaya Dön</a>
    </div>
    `);
});

// SORU KAYDET
app.post('/soru-ekle', async (req, res) => {
    try {
        const yeniSoru = new Soru({
            sinif: req.body.sinif,
            ders: req.body.ders,
            konu: req.body.konu,
            soruOnculu: req.body.soruOnculu,
            soruMetni: req.body.soruMetni,
            soruResmi: req.body.soruResmi,
            secenekler: [
                { metin: req.body.metin0, gorsel: req.body.gorsel0 },
                { metin: req.body.metin1, gorsel: req.body.gorsel1 },
                { metin: req.body.metin2, gorsel: req.body.gorsel2 },
                { metin: req.body.metin3, gorsel: req.body.gorsel3 }
            ],
            dogruCevapIndex: parseInt(req.body.dogruCevap)
        });
        await yeniSoru.save();
        res.send("✅ Soru eklendi! <a href='/admin'>Yeni ekle</a> veya <a href='/'>Giriş yap</a>");
    } catch (err) {
        res.status(500).send("Hata oluştu: " + err.message);
    }
});

// SERVER
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT} adresinde çalışıyor`));

