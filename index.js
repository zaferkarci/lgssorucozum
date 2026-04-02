const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Sunucu aktif: ${PORT}`); });

const dbURI = process.env.MONGO_URI; 
mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, il: String, ilce: String, okul: String,
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

const Okul = mongoose.model('Okul', new mongoose.Schema({
    ad: String, il: String, ilce: String
}));

// --- YOLLAR ---

// 1. ANA SAYFA (GİRİŞ)
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

// 2. KAYIT SAYFASI (ÇİFT ŞİFRE VE 81 İL)
app.get('/kayit', (req, res) => {
    res.send(`
    <div style="text-align:center; padding-top:20px; font-family:sans-serif;">
        <h2>Yeni Kayıt Oluştur</h2>
        <form action="/kayit-yap" method="POST" style="max-width:400px; margin:auto; border:1px solid #ddd; padding:20px; border-radius:10px;">
            <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:90%; padding:10px; margin-bottom:10px;"><br>
            <input type="password" name="sifre" placeholder="Şifre" required style="width:90%; padding:10px; margin-bottom:10px;"><br>
            <input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:90%; padding:10px; margin-bottom:15px;"><br>

            <select name="il" id="il" onchange="getIlce()" required style="width:95%; padding:10px; margin-bottom:10px;"></select>
            <select name="ilce" id="ilce" onchange="getOkul()" required style="width:95%; padding:10px; margin-bottom:10px;"></select>
            <select name="okul" id="okul" required style="width:95%; padding:10px; margin-bottom:20px;"><option value="">Okul Seçiniz</option></select>

            <button style="width:95%; padding:15px; background:#3498db; color:white; border:none; border-radius:5px; font-weight:bold;">KAYDI TAMAMLA</button>
        </form>
    </div>
    <script>
        const iller = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"];
        const ilSelect = document.getElementById('il');
        iller.forEach(il => {
            let opt = document.createElement('option'); opt.value = il; opt.text = il;
            if(il === "Aydın") opt.selected = true; ilSelect.add(opt);
        });

        async function getIlce() {
            const il = ilSelect.value;
            const res = await fetch('https://turkiyeapi.dev' + il);
            const data = await res.json();
            const ilceSelect = document.getElementById('ilce');
            ilceSelect.innerHTML = '';
            data.data[0].districts.forEach(d => {
                let opt = document.createElement('option'); opt.value = d.name; opt.text = d.name;
                if(il === "Aydın" && d.name === "Nazilli") opt.selected = true;
                ilceSelect.add(opt);
            });
            getOkul();
        }

        async function getOkul() {
            const il = ilSelect.value; const ilce = document.getElementById('ilce').value;
            const res = await fetch('/api/okul?il='+il+'&ilce='+ilce);
            const okullar = await res.json();
            const okulSelect = document.getElementById('okul');
            okulSelect.innerHTML = '<option value="">Okul Seçiniz</option>';
            okullar.forEach(o => { let opt = document.createElement('option'); opt.value = o.ad; opt.text = o.ad; okulSelect.add(opt); });
        }
        window.onload = getIlce;
    </script>`);
});

// --- API VE KAYIT İŞLEMLERİ ---
app.get('/api/okul', async (req, res) => {
    const okullar = await Okul.find({ il: req.query.il, ilce: req.query.ilce });
    res.json(okullar);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const yeniK = new Kullanici({ kullaniciAdi, sifre, il, ilce, okul });
        await yeniK.save();
        res.send("<script>alert('Kayıt Başarılı!'); window.location.href='/';</script>");
    } catch(e) { res.send("<script>alert('Hata: Kullanıcı adı alınmış olabilir.'); window.history.back();</script>"); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hatalı giriş!'); window.history.back();</script>");
    res.redirect('/soru/' + k.kullaniciAdi);
});

// --- SORU SAYFASI (SAYAÇ KORUNDU) ---
app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();
    if (sorular.length === 0) return res.send("❌ Soru yok!");
    const soru = sorular[k.soruIndex % sorular.length];
    const harfler = ["A","B","C","D"];
    res.send(`
    <div style="max-width:700px; margin:auto; font-family:sans-serif; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:10px; border-radius:5px; margin-bottom:15px;">
            <span><b>${k.okul}</b> - Hoş geldin, <b>${k.kullaniciAdi}</b></span>
            <div style="color:red; font-weight:bold;">Süre: <span id="timer">00:00</span> / 05:00</div>
        </div>
        ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:15px; border-radius:5px;">${soru.soruOnculu}</p>` : ""}
        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin-bottom:10px;">` : ""}
        <h2>${soru.soruMetni}</h2>
        ${soru.secenekler.map((s,i)=>`
            <form method="POST" action="/cevap" id="form${i}">
                <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gecenSureInput${i}" value="0">
                <button type="button" onclick="submitWithTime(${i})" style="width:100%; margin:5px 0; padding:12px; text-align:left; cursor:pointer; background:white; border:1px solid #ccc; border-radius:8px;">
                    <b>${harfler[i]})</b> ${s.metin || ""}
                    ${s.gorsel ? `<br><img src="${s.gorsel}" style="max-height:100px; margin-top:5px;">` : ""}
                </button>
            </form>
        `).join('')}
    </div>
    <script>
        let saniye = 0; const timerElement = document.getElementById('timer');
        const interval = setInterval(() => { saniye++; let dk = Math.floor(saniye / 60); let sn = saniye % 60; timerElement.innerText = (dk < 10 ? '0'+dk : dk) + ":" + (sn < 10 ? '0'+sn : sn); if (saniye >= 300) { clearInterval(interval); alert("Süre Doldu!"); } }, 1000);
        function submitWithTime(index) { document.getElementById('gecenSureInput' + index).value = saniye; document.getElementById('form' + index).submit(); }
    </script>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId); const k = await Kullanici.findOne({ kullaniciAdi });
    k.toplamSure += parseInt(gecenSure); k.cozumSureleri.push({ soruId, sure: parseInt(gecenSure) });
    if (parseInt(secilenIndex) === s.dogruCevapIndex) k.puan += 10;
    k.soruIndex += 1; await k.save(); res.redirect('/soru/' + kullaniciAdi);
});

// --- 🛡️ ADMIN PANELİ ---
app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || '').trim() && pass === (process.env.ADMIN_PASSWORD || '').trim()) {
        const tumSorular = await Soru.find(); const tumOkullar = await Okul.find();
        let editS = req.query.duzenle ? await Soru.findById(req.query.duzenle) : null;
        let editO = req.query.okulDuzenle ? await Okul.findById(req.query.okulDuzenle) : null;
        const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "İngilizce", "Din Kültürü"];

        res.send(`
        <div style="max-width:850px; margin:auto; font-family:sans-serif; padding:20px;">
            <div style="margin-bottom:20px;"><a href="/admin">Soru İşlemleri</a> | <a href="/admin?tab=okul">Okul İşlemleri</a></div>
            ${req.query.tab === 'okul' ? `
                <h3>${editO ? 'Okul Güncelle' : 'Okul Ekle'}</h3>
                <form action="${editO ? '/okul-guncelle' : '/okul-ekle'}" method="POST" style="background:#f4f4f4; padding:20px;">
                    ${editO ? `<input type="hidden" name="id" value="${editO._id}">` : ''}
                    <input name="il" placeholder="İl" value="${editO ? editO.il : ''}" required> <input name="ilce" placeholder="İlçe" value="${editO ? editO.ilce : ''}" required> <input name="ad" placeholder="Okul Adı" value="${editO ? editO.ad : ''}" required>
                    <button style="background:green; color:white; padding:10px;">${editO ? 'GÜNCELLE' : 'EKLE'}</button>
                </form>
                <h4>Kayıtlı Okullar</h4>
                ${tumOkullar.map(o => `<div>${o.il}-${o.ilce}: ${o.ad} <a href="/admin?tab=okul&okulDuzenle=${o._id}">Düzenle</a> | <form action="/okul-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${o._id}"><button style="color:red;border:none;background:none;cursor:pointer;">Sil</button></form></div>`).join('')}
            ` : `
                <h3>${editS ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h3>
                <form action="${editS ? '/soru-guncelle' : '/soru-ekle'}" method="POST" style="background:#f9f9f9; padding:20px; border:1px solid #ddd;">
                    ${editS ? `<input type="hidden" name="id" value="${editS._id}">` : ''}
                    Sınıf: <select name="sinif">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editS ? editS.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select>
                    Ders: <select name="ders">${dersler.map(d => `<option value="${d}" ${(editS ? editS.ders == d : d == 'Matematik') ? 'selected' : ''}>${d}</option>`).join('')}</select><br><br>
                    <input name="konu" placeholder="Konu" value="${editS ? editS.konu : ''}" style="width:95%; padding:5px;"><br><br>
                    <textarea name="soruOnculu" placeholder="Soru Öncülü" style="width:95%; height:50px;">${editS ? editS.soruOnculu : ''}</textarea><br><br>
                    <input name="soruResmi" placeholder="Soru Görseli URL" value="${editS ? editS.soruResmi : ''}" style="width:95%; padding:5px;"><br><br>
                    <textarea name="soruMetni" required style="width:95%;" placeholder="Soru Metni">${editS ? editS.soruMetni : ''}</textarea>
                    <h4>Şıklar</h4>
                    ${[0,1,2,3].map(i => `<div> Şık ${i+1}: <input name="metin${i}" value="${editS ? editS.secenekler[i].metin : ''}"> <input name="gorsel${i}" placeholder="Görsel URL" value="${editS ? editS.secenekler[i].gorsel : ''}"> <input type="radio" name="dogruCevap" value="${i}" required ${editS && editS.dogruCevapIndex === i ? 'checked' : ''}> Doğru</div>`).join('')}
                    <button style="background:green; color:white; width:100%; padding:10px; margin-top:10px; cursor:pointer;">${editS ? 'GÜNCELLE' : 'KAYDET'}</button>
                </form>
                <hr>
                ${tumSorular.map(s => `<div>${s.ders} - ${s.soruMetni.substring(0,30)}... <a href="/admin?duzenle=${s._id}">Düzenle</a> | <form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button style="color:red;border:none;background:none;cursor:pointer;">Sil</button></form></div>`).join('')}
            `}
        </div>`);
    } else { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); res.status(401).send('Yetkisiz!'); }
});

// OKUL İŞLEMLERİ
app.post('/okul-ekle', async (req, res) => { await new Okul(req.body).save(); res.redirect('/admin?tab=okul'); });
app.post('/okul-guncelle', async (req, res) => { await Okul.findByIdAndUpdate(req.body.id, req.body); res.redirect('/admin?tab=okul'); });
app.post('/okul-sil', async (req, res) => { await Okul.findByIdAndDelete(req.body.id); res.redirect('/admin?tab=okul'); });

// SORU İŞLEMLERİ
app.post('/soru-ekle', async (req, res) => { 
    const yeni = new Soru({ ...req.body, secenekler: [0,1,2,3].map(i => ({ metin: req.body['metin'+i], gorsel: req.body['gorsel'+i] })) });
    await yeni.save(); res.redirect('/admin'); 
});
app.post('/soru-guncelle', async (req, res) => {
    await Soru.findByIdAndUpdate(req.body.id, { ...req.body, secenekler: [0,1,2,3].map(i => ({ metin: req.body['metin'+i], gorsel: req.body['gorsel'+i] })) });
    res.redirect('/admin');
});
app.post('/soru-sil', async (req, res) => { await Soru.findByIdAndDelete(req.body.id); res.redirect('/admin'); });
