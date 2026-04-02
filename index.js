const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Bağlandı"))
    .catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, 
    il: String, ilce: String, okul: String,
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number
}));

// --- YOLLAR (ROUTES) ---

// 1. GİRİŞ SAYFASI
app.get('/', (req, res) => {
    res.send(`
    <div style="text-align:center; padding-top:50px; font-family:sans-serif;">
        <h2 style="color:#2c3e50;">LGS Soru Çözüm - Giriş</h2>
        <form action="/giris" method="POST" style="max-width:300px; margin:auto; border:1px solid #ddd; padding:20px; border-radius:10px;">
            <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:90%; padding:10px; margin-bottom:10px;"><br>
            <input type="password" name="sifre" placeholder="Şifre" required style="width:90%; padding:10px; margin-bottom:15px;"><br>
            <button style="width:95%; padding:10px; background:#2ecc71; color:white; border:none; border-radius:5px; cursor:pointer;">GİRİŞ YAP</button>
        </form>
        <p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p>
    </div>`);
});

// 2. KAYIT SAYFASI
app.get('/kayit', (req, res) => {
    res.send(`
    <div style="text-align:center; padding-top:30px; font-family:sans-serif;">
        <h2 style="color:#2c3e50;">Yeni Kayıt Oluştur</h2>
        <form action="/kayit-yap" method="POST" style="max-width:400px; margin:auto; border:1px solid #ddd; padding:20px; border-radius:10px;">
            <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:90%; padding:10px; margin-bottom:10px;"><br>
            <input type="password" name="sifre" placeholder="Şifre" required style="width:90%; padding:10px; margin-bottom:10px;"><br>
            <input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:90%; padding:10px; margin-bottom:15px;"><br>
            <select name="il" id="ilSelect" onchange="ilDegisti()" required style="width:95%; padding:10px; margin-bottom:10px;">
                <option value="">İl Seçiniz...</option><option value="Aydın">Aydın</option><option value="İzmir">İzmir</option>
            </select>
            <select name="ilce" id="ilceSelect" onchange="ilceDegisti()" required style="width:95%; padding:10px; margin-bottom:10px;">
                <option value="">İlçe Seçiniz</option>
            </select>
            <select name="okul" id="okulSelect" required style="width:95%; padding:10px; margin-bottom:20px;">
                <option value="">Okul Seçiniz</option>
            </select>
            <button style="width:95%; padding:15px; background:#3498db; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">KAYDI TAMAMLA</button>
            <br><br><a href="/">Giriş Sayfasına Dön</a>
        </form>
    </div>
    <script>
        const veriler = {
            "Aydın": { "Efeler": ["Efeler Ortaokulu", "Gazipaşa Ortaokulu"], "Nazilli": ["Nazilli Ortaokulu", "Beşeylül Ortaokulu"] },
            "İzmir": { "Konak": ["Konak Ortaokulu", "Atatürk Ortaokulu"], "Bornova": ["Bornova Ortaokulu", "Yavuz Selim Ortaokulu"] }
        };
        function ilDegisti() {
            const il = document.getElementById('ilSelect').value;
            const ilceSelect = document.getElementById('ilceSelect');
            ilceSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';
            if(il) { Object.keys(veriler[il]).forEach(ilce => { ilceSelect.innerHTML += '<option value="'+ilce+'">'+ilce+'</option>'; }); }
            ilceDegisti();
        }
        function ilceDegisti() {
            const il = document.getElementById('ilSelect').value;
            const ilce = document.getElementById('ilceSelect').value;
            const okulSelect = document.getElementById('okulSelect');
            okulSelect.innerHTML = '<option value="">Okul Seçiniz</option>';
            if(il && ilce) { veriler[il][ilce].forEach(okul => { okulSelect.innerHTML += '<option value="'+okul+'">'+okul+'</option>'; }); }
        }
    </script>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Bu kullanıcı adı alınmış!'); window.history.back();</script>");
        await new Kullanici({ kullaniciAdi, sifre, il, ilce, okul }).save();
        res.send("<script>alert('Kayıt Başarılı!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hatalı giriş!'); window.history.back();</script>");
    res.redirect('/soru/' + k.kullaniciAdi);
});

// 3. SORU SAYFASI
app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();
    if (sorular.length === 0) return res.send("❌ Henüz soru eklenmemiş.");
    const soru = sorular[k.soruIndex % sorular.length];
    const harfler = ["A","B","C","D"];
    
    res.send(`
    <div style="max-width:700px; margin:auto; font-family:sans-serif; padding:20px;">
        <div style="display:flex; justify-content:space-between; background:#eee; padding:10px; border-radius:5px;">
            <span><b>${k.okul}</b> | Hoş geldin, <b>${k.kullaniciAdi}</b> | Puan: ${k.puan}</span>
            <div style="color:red; font-weight:bold;">Süre: <span id="timer">00:00</span> / 05:00</div>
        </div>
        ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:15px; margin-top:15px;">${soru.soruOnculu}</p>` : ""}
        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin:10px 0;">` : ""}
        <h2>${soru.soruMetni}</h2>
        ${soru.secenekler.map((s,i)=>`
            <form method="POST" action="/cevap" id="form${i}">
                <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gecenSureInput${i}" value="0">
                <button type="button" onclick="submitWithTime(${i})" style="width:100%; margin:5px 0; padding:12px; text-align:left; cursor:pointer; background:white; border:1px solid #ccc; border-radius:8px;">
                    <b>${harfler[i]})</b> ${s.metin || ""}
                    ${s.gorsel ? `<br><img src="${s.gorsel}" style="max-height:100px;">` : ""}
                </button>
            </form>
        `).join('')}
    </div>
    <script>
        let saniye = 0;
        const timerElement = document.getElementById('timer');
        const interval = setInterval(() => {
            saniye++;
            let dk = Math.floor(saniye / 60); let sn = saniye % 60;
            timerElement.innerText = (dk < 10 ? '0'+dk : dk) + ":" + (sn < 10 ? '0'+sn : sn);
            if (saniye >= 300) { clearInterval(interval); alert("Süre Doldu!"); }
        }, 1000);
        function submitWithTime(index) { 
            document.getElementById('gecenSureInput' + index).value = saniye; 
            document.getElementById('form' + index).submit(); 
        }
    </script>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });
    k.toplamSure += parseInt(gecenSure);
    k.cozumSureleri.push({ soruId: soruId, sure: parseInt(gecenSure) });
    if (parseInt(secilenIndex) === s.dogruCevapIndex) k.puan += 10;
    k.soruIndex += 1; 
    await k.save();
    res.redirect('/soru/' + kullaniciAdi);
});

// 4. ADMIN PANELİ
app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        return res.status(401).send('Giriş gerekli!');
    }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');

    if (user === (process.env.ADMIN_USER || 'admin').trim() && pass === (process.env.ADMIN_PASSWORD || '1234').trim()) {
        let editSoru = null;
        if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);
        const tumSorular = await Soru.find();
        res.send(`
        <div style="max-width:800px; margin:auto; font-family:sans-serif; padding:20px;">
            <h2>🛠️ Admin Paneli</h2>
            <form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST" style="background:#f9f9f9; padding:20px; border:1px solid #ddd;">
                ${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}
                <input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}" style="width:48%;">
                <select name="ders" style="width:48%; padding:5px;">
                    <option>Matematik</option><option>Türkçe</option><option>Fen Bilimleri</option>
                </select><br><br>
                <textarea name="soruMetni" placeholder="Soru Metni" style="width:98%;" required>${editSoru ? editSoru.soruMetni : ''}</textarea><br><br>
                ${[0,1,2,3].map(i => `Şık ${i+1}: <input name="metin${i}" value="${editSoru ? editSoru.secenekler[i].metin : ''}"> <input type="radio" name="dogruCevap" value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''} required><br>`).join('')}
                <br><button style="padding:10px 20px; background:green; color:white; border:none;">KAYDET</button>
            </form>
            <hr>
            ${tumSorular.map((s, i) => `<div>${i+1}. ${s.soruMetni.substring(0,30)}... <a href="/admin?duzenle=${s._id}">Düzenle</a></div>`).join('')}
        </div>`);
    } else { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); res.status(401).send('Yetkisiz!'); }
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({
        ders: req.body.ders, konu: req.body.konu, soruMetni: req.body.soruMetni,
        secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    }).save();
    res.redirect('/admin');
});

app.post('/soru-guncelle', async (req, res) => {
    await Soru.findByIdAndUpdate(req.body.id, {
        soruMetni: req.body.soruMetni,
        secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    res.redirect('/admin');
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Sunucu aktif: ${PORT}`));
