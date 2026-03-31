const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MONGODB
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/lgs_veritabani?retryWrites=true&w=majority";

mongoose.connect(dbURI)
.then(() => console.log("✅ MongoDB Bağlandı"))
.catch(err => console.log(err));

// MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: String,
    sifre: String,
    soruIndex: { type: Number, default: 0 }
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String,
    ders: String,
    konu: String,
    soruOnculu: String,
    soruMetni: String,
    soruResmi: String,
    secenekler: [
        { metin: String, gorsel: String }
    ],
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
        <br>
        <a href="/admin">Admin Paneli</a>
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

// SORU GETİR (SIRALI)
app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();

    if (sorular.length === 0) return res.send("❌ Henüz soru yok!");

    const index = k.soruIndex % sorular.length;
    const soru = sorular[index];

    const harfler = ["A","B","C","D"];

    res.send(`
    <div style="max-width:700px; margin:auto; font-family:sans-serif;">
        
        <div style="text-align:center;">
            <h3>${soru.sinif}. Sınıf - ${soru.ders} (${soru.konu})</h3>
        </div>

        ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:10px;">${soru.soruOnculu}</p>` : ""}

        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin:10px 0;">` : ""}

        <h2>${soru.soruMetni}</h2>

        ${soru.secenekler.map((s,i)=>`
            <form method="POST" action="/cevap">
                <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
                <button style="width:100%; margin:8px 0; padding:12px; text-align:left; cursor:pointer;">
                    <b>${harfler[i]})</b> ${s.metin || ""}
                    ${s.gorsel ? `<br><img src="${s.gorsel}" style="height:40px;">` : ""}
                </button>
            </form>
        `).join('')}

    </div>
    `);
});

// CEVAP → SADECE SONRAKİ SORUYA GEÇ
app.post('/cevap', async (req, res) => {
    const { kullaniciAdi } = req.body;

    const k = await Kullanici.findOne({ kullaniciAdi });
    k.soruIndex += 1;
    await k.save();

    res.redirect('/soru/' + kullaniciAdi);
});

// ADMIN PANEL
app.get('/admin', (req, res) => {
    res.send(`
    <div style="max-width:800px; margin:auto; font-family:sans-serif;">
        <h2>🛠️ Soru Ekle</h2>

        <form action="/soru-ekle" method="POST">

            <input name="sinif" placeholder="Sınıf"><br><br>
            <input name="ders" placeholder="Ders"><br><br>
            <input name="konu" placeholder="Konu"><br><br>

            <label>Soru Öncülü</label><br>
            <textarea name="soruOnculu" style="width:100%; height:60px;"></textarea><br><br>

            <label>Soru Görseli (URL)</label><br>
            <input name="soruResmi" style="width:100%;"><br><br>

            <label>Soru Metni</label><br>
            <textarea name="soruMetni" style="width:100%; height:50px;"></textarea><br><br>

            <h3>Şıklar</h3>

            ${[0,1,2,3].map(i=>`
                <div style="margin-bottom:10px;">
                    <input name="metin${i}" placeholder="Şık metni" style="width:40%;">
                    <input name="gorsel${i}" placeholder="Şık görsel linki" style="width:40%;">
                    <input type="radio" name="dogruCevap" value="${i}" required> Doğru
                </div>
            `).join('')}

            <button style="padding:10px; width:100%;">KAYDET</button>

        </form>
    </div>
    `);
});

// SORU KAYDET
app.post('/soru-ekle', async (req, res) => {
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

    res.send("✅ Soru eklendi! <a href='/admin'>Devam et</a>");
});

// SERVER
app.listen(3000, () => console.log("🚀 Server çalışıyor"));