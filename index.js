const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// RENDER İÇİN PORTU HEMEN AÇALIM (Timeout hatasını önler)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu aktif: ${PORT}`);
});

// MONGODB BAĞLANTISI (Arka planda çalışır)
const dbURI = process.env.MONGO_URI; 

if (!dbURI) {
    console.error("❌ HATA: MONGO_URI değişkeni Render panelinde tanımlanmamış!");
} else {
    mongoose.connect(dbURI)
        .then(() => console.log("✅ MongoDB Bağlandı"))
        .catch(err => console.error("❌ MongoDB Bağlantı Hatası:", err.message));
}

// MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: String,
    sifre: String,
    soruIndex: { type: Number, default: 0 },
    puan: { type: Number, default: 0 }
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number
}));

// ANA SAYFA
app.get('/', (req, res) => {
    res.send(`
    <div style="text-align:center; padding-top:50px; font-family:sans-serif;">
        <h2>LGS Soru Çözüm</h2>
        <form action="/giris" method="POST">
            <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required><br><br>
            <input type="password" name="sifre" placeholder="Şifre" required><br><br>
            <button>GİRİŞ</button>
        </form>
    </div>
    `);
});

// GİRİŞ
app.post('/giris', async (req, res) => {
    try {
        const { kullaniciAdi, sifre } = req.body;
        let kullanici = await Kullanici.findOne({ kullaniciAdi, sifre });
        if (!kullanici) { 
            kullanici = new Kullanici({ kullaniciAdi, sifre }); 
            await kullanici.save(); 
        }
        res.redirect('/soru/' + kullaniciAdi);
    } catch (err) { res.status(500).send("Giriş hatası!"); }
});

// SORU SAYFASI
app.get('/soru/:kullaniciAdi', async (req, res) => {
    try {
        const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
        const sorular = await Soru.find();
        if (sorular.length === 0) return res.send("❌ Henüz soru yok!");
        
        const index = k.soruIndex % sorular.length;
        const soru = sorular[index];
        const harfler = ["A","B","C","D"];
        
        res.send(`
        <div style="max-width:700px; margin:auto; font-family:sans-serif; padding:20px;">
            <h3>${soru.sinif}. Sınıf - ${soru.ders} - Puan: ${k.puan}</h3>
            <hr>
            ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:10px;">${soru.soruOnculu}</p>` : ""}
            ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin:10px 0;">` : ""}
            <h2>${soru.soruMetni}</h2>
            ${soru.secenekler.map((s,i)=>`
                <form method="POST" action="/cevap">
                    <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
                    <input type="hidden" name="soruId" value="${soru._id}">
                    <input type="hidden" name="secilenIndex" value="${i}">
                    <button style="width:100%; margin:5px 0; padding:12px; text-align:left; cursor:pointer; background:white; border:1px solid #ccc; border-radius:5px;">
                        <b>${harfler[i]})</b> ${s.metin || ""}
                    </button>
                </form>
            `).join('')}
        </div>
        `);
    } catch (err) { res.send("Soru yüklenirken bir hata oluştu."); }
});

// CEVAP
app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex } = req.body;
    const soru = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });
    if (parseInt(secilenIndex) === soru.dogruCevapIndex) { k.puan += 10; }
    k.soruIndex += 1;
    await k.save();
    res.redirect('/soru/' + kullaniciAdi);
});

// 🛡️ ADMİN PANELİ (GÜVENLİ)
app.get('/admin', (req, res) => {
    const b64auth = (req.headers.authorization || '').split(' ') || '';
    const [login, password] = Buffer.from(b64auth[1] || '', 'base64').toString().split(':');

    if (login && password && login === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        res.send(`
        <div style="max-width:600px; margin:auto; font-family:sans-serif; padding:20px;">
            <h2>🛠️ Soru Ekle</h2>
            <form action="/soru-ekle" method="POST">
                <input name="sinif" placeholder="Sınıf" style="width:45%;">
                <input name="ders" placeholder="Ders" style="width:45%;"><br><br>
                <input name="konu" placeholder="Konu" style="width:100%;"><br><br>
                <textarea name="soruOnculu" placeholder="Soru Öncülü" style="width:100%; height:60px;"></textarea><br><br>
                <input name="soruResmi" placeholder="Soru Görseli URL" style="width:100%;"><br><br>
                <textarea name="soruMetni" placeholder="Soru Metni" style="width:100%; height:40px;" required></textarea>
                <h3>Şıklar</h3>
                ${[0, 1, 2, 3].map(i => `
                    <div style="margin-bottom:8px;">
                        <input name="metin${i}" placeholder="Şık ${i+1}" required style="width:70%;">
                        <input type="radio" name="dogruCevap" value="${i}" required> Doğru
                    </div>
                `).join('')}
                <button style="width:100%; padding:15px; margin-top:20px; background:orange; color:white; border:none; cursor:pointer;">KAYDET</button>
            </form>
        </div>
        `);
    } else {
        res.set('WWW-Authenticate', 'Basic realm="401"');
        res.status(401).send('Yetkisiz erişim!');
    }
});

// SORU KAYDET
app.post('/soru-ekle', async (req, res) => {
    try {
        const yeniSoru = new Soru({
            sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu,
            soruOnculu: req.body.soruOnculu, soruMetni: req.body.soruMetni, soruResmi: req.body.soruResmi,
            secenekler: [
                { metin: req.body.metin0 }, { metin: req.body.metin1 },
                { metin: req.body.metin2 }, { metin: req.body.metin3 }
            ],
            dogruCevapIndex: parseInt(req.body.dogruCevap)
        });
        await yeniSoru.save();
        res.send("✅ Soru eklendi! <a href='/admin'>Geri dön</a>");
    } catch (err) { res.send("Soru kaydedilemedi: " + err.message); }
});
