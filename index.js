const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Sunucu aktif: ${PORT}`); });

const dbURI = process.env.MONGO_URI; 
mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER (Süre Saklama Alanları Eklendi) ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: String, 
    sifre: String, 
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 }, // Saniye cinsinden toplam süre
    cozumSureleri: [{ soruId: String, sure: Number }] // Her sorunun süresi
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
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
        <div style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:10px; border-radius:5px; margin-bottom:15px;">
            <span>${soru.sinif}. Sınıf - ${soru.ders} - Puan: <b>${k.puan}</b></span>
            <div style="color:red; font-weight:bold;">Süre: <span id="timer">00:00</span> / 05:00</div>
        </div>

        ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:15px; border-radius:5px;">${soru.soruOnculu}</p>` : ""}
        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin-bottom:10px;">` : ""}
        <h2>${soru.soruMetni}</h2>
        
        ${soru.secenekler.map((s,i)=>`
            <form method="POST" action="/cevap" id="form${i}">
                <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
                <input type="hidden" name="soruId" value="${soru._id}">
                <input type="hidden" name="secilenIndex" value="${i}">
                <input type="hidden" name="gecenSure" id="gecenSureInput${i}" value="0">
                <button type="button" onclick="submitWithTime(${i})" style="width:100%; margin:5px 0; padding:12px; text-align:left; cursor:pointer; background:white; border:1px solid #ccc; border-radius:8px;">
                    <b>${harfler[i]})</b> ${s.metin || ""}
                    ${s.gorsel ? `<br><img src="${s.gorsel}" style="max-height:100px; margin-top:5px;">` : ""}
                </button>
            </form>
        `).join('')}
    </div>

    <script>
        let saniye = 0;
        const timerElement = document.getElementById('timer');
        
        const interval = setInterval(() => {
            saniye++;
            let dk = Math.floor(saniye / 60);
            let sn = saniye % 60;
            timerElement.innerText = (dk < 10 ? '0'+dk : dk) + ":" + (sn < 10 ? '0'+sn : sn);
            
            if (saniye >= 300) { // 5 dakika dolunca
                clearInterval(interval);
                alert("Süre Doldu! 5 dakikayı geçtiniz.");
            }
        }, 1000);

        function submitWithTime(index) {
            document.getElementById('gecenSureInput' + index).value = saniye;
            document.getElementById('form' + index).submit();
        }
    </script>
    `);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });
    
    // Süreleri Kaydet
    const sureNum = parseInt(gecenSure);
    k.toplamSure += sureNum;
    k.cozumSureleri.push({ soruId: soruId, sure: sureNum });

    // Puan Kontrol
    if (parseInt(secilenIndex) === s.dogruCevapIndex) k.puan += 10;
    
    k.soruIndex += 1; 
    await k.save();
    res.redirect('/soru/' + kullaniciAdi);
});

// --- 🛡️ ADMIN PANELİ (Düzenleme, Sınıf Seçimi ve Silme Özelliği Korundu) ---
app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        return res.status(401).send('Giriş gerekli!');
    }
    const base64Content = authHeader.split(' ');
    const credentials = Buffer.from(base64Content[1] || '', 'base64').toString();
    const [user, pass] = credentials.split(':');

    if (user === (process.env.ADMIN_USER || '').trim() && pass === (process.env.ADMIN_PASSWORD || '').trim()) {
        let editSoru = null;
        if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);

        const tumSorular = await Soru.find();
        const dersListesi = ["Matematik", "Türkçe", "Fen Bilimleri", "İngilizce", "Din Kültürü"];
        
        res.send(`
        <div style="max-width:800px; margin:auto; font-family:sans-serif; padding:20px;">
            <h2 style="color:orange;">🛠️ Soru Yönetimi</h2>
            <form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST" style="background:#f9f9f9; padding:20px; border:1px solid #ddd;">
                <h3>${editSoru ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h3>
                ${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}
                <label>Sınıf Seç:</label>
                <select name="sinif" style="padding:5px; margin-right:10px;">
                    ${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}
                </select>
                <label>Ders Seç:</label>
                <select name="ders" style="padding:5px; margin-right:10px;">
                    ${dersListesi.map(d => `<option value="${d}" ${(editSoru ? editSoru.ders == d : d == 'Matematik') ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
                <br><br>
                <input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}" style="width:95%; padding:5px;"><br><br>
                <textarea name="soruOnculu" placeholder="Soru Öncülü" style="width:95%; height:50px;">${editSoru ? editSoru.soruOnculu : ''}</textarea><br><br>
                <input name="soruResmi" placeholder="Soru Görseli URL" value="${editSoru ? editSoru.soruResmi : ''}" style="width:95%; padding:5px;"><br><br>
                <textarea name="soruMetni" placeholder="Soru Metni" style="width:95%;" required>${editSoru ? editSoru.soruMetni : ''}</textarea>
                <h4>Şıklar</h4>
                ${[0,1,2,3].map(i => `
                    <div style="margin-bottom:10px;">
                        <input name="metin${i}" placeholder="Şık ${i+1} Metni" value="${editSoru ? editSoru.secenekler[i].metin : ''}" style="width:40%;">
                        <input name="gorsel${i}" placeholder="Görsel URL" value="${editSoru ? editSoru.secenekler[i].gorsel : ''}" style="width:40%;">
                        <input type="radio" name="dogruCevap" value="${i}" required ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''}> Doğru
                    </div>
                `).join('')}
                <button style="width:100%; padding:15px; background:${editSoru ? '#3498db' : 'green'}; color:white; border:none; cursor:pointer; font-weight:bold;">
                    ${editSoru ? 'GÜNCELLE' : 'SİSTEME KAYDET'}
                </button>
                ${editSoru ? `<br><br><center><a href="/admin">Düzenlemeden Vazgeç</a></center>` : ''}
            </form>
            <hr style="margin:40px 0;">
            <h3>Mevcut Sorular (${tumSorular.length})</h3>
            ${tumSorular.map((s, index) => `
                <div style="border-bottom:1px solid #ccc; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;"><b>${index+1}.</b> ${s.soruMetni.substring(0, 50)}... (${s.ders})</div>
                    <div style="display:flex; gap:10px;">
                        <a href="/admin?duzenle=${s._id}" style="background:#3498db; color:white; text-decoration:none; padding:5px 10px; font-size:13px;">DÜZENLE</a>
                        <form action="/soru-sil" method="POST" onsubmit="return confirm('Bu soruyu silmek istediğine emin misin?')" style="margin:0;">
                            <input type="hidden" name="id" value="${s._id}">
                            <button style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; font-size:13px;">SİL</button>
                        </form>
                    </div>
                </div>
            `).join('')}
        </div>`);
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        res.status(401).send('Yetkisiz!');
    }
});

app.post('/soru-ekle', async (req, res) => {
    const yeni = new Soru({
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu,
        soruMetni: req.body.soruMetni, soruResmi: req.body.soruResmi,
        secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    await yeni.save(); res.send("✅ Soru eklendi! <a href='/admin'>Geri dön</a>");
});

app.post('/soru-guncelle', async (req, res) => {
    await Soru.findByIdAndUpdate(req.body.id, {
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu,
        soruMetni: req.body.soruMetni, soruResmi: req.body.soruResmi,
        secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    res.send("✅ Soru güncellendi! <a href='/admin'>Geri dön</a>");
});

app.post('/soru-sil', async (req, res) => {
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin');
});
