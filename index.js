const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Sunucu aktif: ${PORT}`); });

const dbURI = process.env.MONGO_URI; 
mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER (Görsel Desteği Ekli) ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: String, sifre: String, soruIndex: { type: Number, default: 0 }, puan: { type: Number, default: 0 }
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }], // Görsel alanı eklendi
    dogruCevapIndex: Number
}));

// --- YOLLAR ---

app.get('/', (req, res) => {
    res.send('<div style="text-align:center; padding-top:50px; font-family:sans-serif;"><h2>LGS Soru Çözüm</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required><br><br><input type="password" name="sifre" placeholder="Şifre" required><br><br><button>GİRİŞ</button></form></div>');
});

app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    let k = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (!k) { k = new Kullanici({ kullaniciAdi, sifre }); await k.save(); }
    res.redirect('/soru/' + kullaniciAdi);
});

app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();
    if (sorular.length === 0) return res.send("❌ Soru yok!");
    const soru = sorular[k.soruIndex % sorular.length];
    const harfler = ["A","B","C","D"];
    res.send(`
    <div style="max-width:700px; margin:auto; font-family:sans-serif; padding:20px;">
        <h3>${soru.sinif}. Sınıf - ${soru.ders} - Puan: ${k.puan}</h3>
        ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:15px;">${soru.soruOnculu}</p>` : ""}
        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin-bottom:10px;">` : ""}
        <h2>${soru.soruMetni}</h2>
        ${soru.secenekler.map((s,i)=>`
            <form method="POST" action="/cevap">
                <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}">
                <button style="width:100%; margin:5px 0; padding:12px; text-align:left; cursor:pointer; background:white; border:1px solid #ccc; border-radius:8px;">
                    <b>${harfler[i]})</b> ${s.metin || ""}
                    ${s.gorsel ? `<br><img src="${s.gorsel}" style="height:80px; margin-top:5px;">` : ""}
                </button>
            </form>
        `).join('')}
    </div>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex } = req.body;
    const s = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });
    if (parseInt(secilenIndex) === s.dogruCevapIndex) k.puan += 10;
    k.soruIndex += 1; await k.save();
    res.redirect('/soru/' + kullaniciAdi);
});

// --- 🛡️ ADMIN PANELİ (SİLME VE GÖRSEL DESTEĞİ İLE) ---

app.get('/admin', async (req, res) => {
    const auth = req.headers.authorization || '';
    const credentials = Buffer.from(auth.split(' ')[1] || '', 'base64').toString();
    const [user, pass] = credentials.split(':');

    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASSWORD) {
        const tumSorular = await Soru.find();
        res.send(`
        <div style="max-width:800px; margin:auto; font-family:sans-serif; padding:20px;">
            <h2 style="color:orange;">🛠️ Soru Yönetimi</h2>
            
            <form action="/soru-ekle" method="POST" style="background:#f9f9f9; padding:20px; border:1px solid #ddd;">
                <h3>Yeni Soru Ekle</h3>
                <input name="sinif" placeholder="Sınıf" style="width:20%;"> <input name="ders" placeholder="Ders" style="width:70%;"><br><br>
                <input name="konu" placeholder="Konu" style="width:95%;"><br><br>
                <textarea name="soruOnculu" placeholder="Soru Öncülü" style="width:95%; height:50px;"></textarea><br><br>
                <input name="soruResmi" placeholder="Soru Görseli URL" style="width:95%;"><br><br>
                <textarea name="soruMetni" placeholder="Soru Metni" style="width:95%;" required></textarea>
                
                <h4>Şıklar</h4>
                ${[0,1,2,3].map(i => `
                    <div style="margin-bottom:10px;">
                        <input name="metin${i}" placeholder="Şık ${i+1} Metni" style="width:40%;">
                        <input name="gorsel${i}" placeholder="Şık ${i+1} Görsel URL" style="width:40%;">
                        <input type="radio" name="dogruCevap" value="${i}" required> Doğru
                    </div>
                `).join('')}
                <button style="width:100%; padding:15px; background:green; color:white; border:none; cursor:pointer;">KAYDET</button>
            </form>

            <hr style="margin:40px 0;">

            <h3>Mevcut Sorular (${tumSorular.length})</h3>
            ${tumSorular.map((s, index) => `
                <div style="border-bottom:1px solid #ccc; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${index+1}.</b> ${s.soruMetni.substring(0, 50)}... (${s.ders})</div>
                    <form action="/soru-sil" method="POST" onsubmit="return confirm('Bu soruyu silmek istediğine emin misin?')">
                        <input type="hidden" name="id" value="${s._id}">
                        <button style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer;">SİL</button>
                    </form>
                </div>
            `).join('')}
            <br><a href="/">Ana Sayfaya Dön</a>
        </div>`);
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); res.status(401).send('Yetkisiz!');
    }
});

app.post('/soru-ekle', async (req, res) => {
    const yeni = new Soru({
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu,
        soruMetni: req.body.soruMetni, soruResmi: req.body.soruResmi,
        secenekler: [
            { metin: req.body.metin0, gorsel: req.body.gorsel0 },
            { metin: req.body.metin1, gorsel: req.body.gorsel1 },
            { metin: req.body.metin2, gorsel: req.body.gorsel2 },
            { metin: req.body.metin3, gorsel: req.body.gorsel3 }
        ],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    await yeni.save(); res.send("✅ Soru eklendi! <a href='/admin'>Geri dön</a>");
});

app.post('/soru-sil', async (req, res) => {
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin');
});
