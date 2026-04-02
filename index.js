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

// --- YARDIMCI VERİ: 81 İL VE İLÇELER (Özet Liste - Tarayıcıda Dinamik Yüklenir) ---
const illerData = {
    "Aydın": ["Nazilli", "Efeler", "Kuşadası", "Söke", "Didim"],
    "İzmir": ["Konak", "Bornova", "Karşıyaka", "Buca"],
    "İstanbul": ["Kadıköy", "Beşiktaş", "Üsküdar", "Fatih"]
    // Not: Tüm 81 il verisi JS tarafında fetch veya büyük bir obje ile eklenebilir. 
    // Örnek olması için kritik illeri ekledim.
};

// --- YOLLAR ---

app.get('/', (req, res) => {
    res.send(`<div style="text-align:center; padding-top:50px; font-family:sans-serif;"><h2>LGS Soru Çözüm - Giriş</h2><form action="/giris" method="POST" style="max-width:300px; margin:auto; border:1px solid #ddd; padding:20px; border-radius:10px;"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:90%; padding:10px; margin-bottom:10px;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:90%; padding:10px; margin-bottom:15px;"><br><button style="width:95%; padding:10px; background:#2ecc71; color:white; border:none; border-radius:5px; cursor:pointer;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div>`);
});

app.get('/kayit', (req, res) => {
    res.send(`
    <div style="text-align:center; padding-top:30px; font-family:sans-serif;">
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
            let opt = document.createElement('option');
            opt.value = il; opt.text = il;
            if(il === "Aydın") opt.selected = true;
            ilSelect.add(opt);
        });

        async function getIlce() {
            const il = ilSelect.value;
            const res = await fetch('/api/ilce/' + il);
            const ilceler = await res.json();
            const ilceSelect = document.getElementById('ilce');
            ilceSelect.innerHTML = '';
            ilceler.forEach(ilce => {
                let opt = document.createElement('option');
                opt.value = ilce; opt.text = ilce;
                if(il === "Aydın" && ilce === "Nazilli") opt.selected = true;
                ilceSelect.add(opt);
            });
            getOkul();
        }

        async function getOkul() {
            const il = ilSelect.value;
            const ilce = document.getElementById('ilce').value;
            const res = await fetch('/api/okul?il='+il+'&ilce='+ilce);
            const okullar = await res.json();
            const okulSelect = document.getElementById('okul');
            okulSelect.innerHTML = '<option value="">Okul Seçiniz</option>';
            okullar.forEach(o => {
                let opt = document.createElement('option');
                opt.value = o.ad; opt.text = o.ad;
                okulSelect.add(opt);
            });
        }
        window.onload = getIlce;
    </script>`);
});

// --- API YOLLARI ---
app.get('/api/ilce/:il', (req, res) => {
    // Burada tüm ilçeler için bir kütüphane kullanılabilir, şimdilik örnek:
    const ilceler = illerData[req.params.il] || ["Merkez"];
    res.json(ilceler);
});

app.get('/api/okul', async (req, res) => {
    const okullar = await Okul.find({ il: req.query.il, ilce: req.query.ilce });
    res.json(okullar);
});

// --- KAYIT VE GİRİŞ İŞLEMLERİ ---
app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    const varMi = await Kullanici.findOne({ kullaniciAdi });
    if (varMi) return res.send("<script>alert('Bu kullanıcı zaten var!'); window.history.back();</script>");
    const yeniK = new Kullanici({ kullaniciAdi, sifre, il, ilce, okul });
    await yeniK.save();
    res.send("<script>alert('Kayıt Başarılı!'); window.location.href='/';</script>");
});

app.post('/giris', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    const k = await Kullanici.findOne({ kullaniciAdi, sifre });
    if (!k) return res.send("<script>alert('Hatalı giriş!'); window.history.back();</script>");
    res.redirect('/soru/' + k.kullaniciAdi);
});

// --- SORU ÇÖZME SAYFASI (SAYAÇ KORUNDU) ---
app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();
    if (sorular.length === 0) return res.send("❌ Soru yok!");
    const soru = sorular[k.soruIndex % sorular.length];
    const harfler = ["A","B","C","D"];
    res.send(`
    <div style="max-width:700px; margin:auto; font-family:sans-serif; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:10px; border-radius:5px; margin-bottom:15px;">
            <span><b>${k.okul}</b> (${k.ilce})</span>
            <div style="color:red; font-weight:bold;">Süre: <span id="timer">00:00</span> / 05:00</div>
        </div>
        ${soru.soruOnculu ? `<p style="background:#f4f4f4; padding:15px;">${soru.soruOnculu}</p>` : ""}
        ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; margin-bottom:10px;">` : ""}
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
        let saniye = 0; const timerElement = document.getElementById('timer');
        const interval = setInterval(() => { saniye++; let dk = Math.floor(saniye / 60); let sn = saniye % 60; timerElement.innerText = (dk < 10 ? '0'+dk : dk) + ":" + (sn < 10 ? '0'+sn : sn); }, 1000);
        function submitWithTime(index) { document.getElementById('gecenSureInput' + index).value = saniye; document.getElementById('form' + index).submit(); }
    </script>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });
    k.toplamSure += parseInt(gecenSure);
    k.cozumSureleri.push({ soruId, sure: parseInt(gecenSure) });
    if (parseInt(secilenIndex) === s.dogruCevapIndex) k.puan += 10;
    k.soruIndex += 1; await k.save();
    res.redirect('/soru/' + kullaniciAdi);
});

// --- 🛡️ ADMIN PANELİ (OKUL YÖNETİMİ EKLENDİ) ---
app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');

    if (user === (process.env.ADMIN_USER || '').trim() && pass === (process.env.ADMIN_PASSWORD || '').trim()) {
        const tumSorular = await Soru.find();
        const tumOkullar = await Okul.find();
        let editSoru = req.query.duzenle ? await Soru.findById(req.query.duzenle) : null;
        let editOkul = req.query.okulDuzenle ? await Okul.findById(req.query.okulDuzenle) : null;

        res.send(`
        <div style="max-width:900px; margin:auto; font-family:sans-serif; padding:20px;">
            <div style="display:flex; gap:20px; margin-bottom:30px;">
                <a href="/admin" style="padding:10px; background:#eee; text-decoration:none; color:black;">Soru Yönetimi</a>
                <a href="/admin?tab=okul" style="padding:10px; background:#eee; text-decoration:none; color:black;">Okul Yönetimi</a>
            </div>

            ${req.query.tab === 'okul' ? `
                <!-- OKUL YÖNETİMİ -->
                <h3>${editOkul ? 'Okul Güncelle' : 'Yeni Okul Ekle'}</h3>
                <form action="${editOkul ? '/okul-guncelle' : '/okul-ekle'}" method="POST" style="background:#f9f9f9; padding:20px;">
                    ${editOkul ? `<input type="hidden" name="id" value="${editOkul._id}">` : ''}
                    <input name="il" placeholder="İl" value="${editOkul ? editOkul.il : ''}" required>
                    <input name="ilce" placeholder="İlçe" value="${editOkul ? editOkul.ilce : ''}" required>
                    <input name="ad" placeholder="Okul Adı" value="${editOkul ? editOkul.ad : ''}" required style="width:50%;">
                    <button style="background:green; color:white; padding:10px;">${editOkul ? 'GÜNCELLE' : 'EKLE'}</button>
                </form>
                <hr>
                <h4>Mevcut Okullar</h4>
                ${tumOkullar.map(o => `<div>${o.il} / ${o.ilce} - ${o.ad} 
                    <a href="/admin?tab=okul&okulDuzenle=${o._id}">Düzenle</a> | 
                    <form action="/okul-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${o._id}"><button style="color:red; border:none; background:none; cursor:pointer;">Sil</button></form>
                </div>`).join('')}
            ` : `
                <!-- SORU YÖNETİMİ -->
                <h3>${editSoru ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h3>
                <form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST" style="background:#f9f9f9; padding:20px;">
                    ${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}
                    <select name="sinif">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select>
                    <select name="ders">${["Matematik", "Türkçe", "Fen Bilimleri", "İngilizce", "Din Kültürü"].map(d => `<option value="${d}" ${(editSoru ? editSoru.ders == d : d == 'Matematik') ? 'selected' : ''}>${d}</option>`).join('')}</select>
                    <input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}"><br><br>
                    <textarea name="soruMetni" required style="width:100%;">${editSoru ? editSoru.soruMetni : ''}</textarea><br>
                    ${[0,1,2,3].map(i => `<div> Şık ${i+1}: <input name="metin${i}" value="${editSoru ? editSoru.secenekler[i].metin : ''}"> <input type="radio" name="dogruCevap" value="${i}" required ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''}> Doğru</div>`).join('')}
                    <button style="background:green; color:white; width:100%; padding:10px; margin-top:10px;">${editSoru ? 'GÜNCELLE' : 'KAYDET'}</button>
                </form>
                <hr>
                <h4>Sorular</h4>
                ${tumSorular.map(s => `<div>${s.ders} - ${s.soruMetni.substring(0,30)}... <a href="/admin?duzenle=${s._id}">Düzenle</a></div>`).join('')}
            `}
        </div>`);
    } else { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); res.status(401).send('Yetkisiz!'); }
});

// --- OKUL İŞLEMLERİ POST YOLLARI ---
app.post('/okul-ekle', async (req, res) => {
    const yeni = new Okul(req.body); await yeni.save(); res.redirect('/admin?tab=okul');
});
app.post('/okul-guncelle', async (req, res) => {
    await Okul.findByIdAndUpdate(req.body.id, req.body); res.redirect('/admin?tab=okul');
});
app.post('/okul-sil', async (req, res) => {
    await Okul.findByIdAndDelete(req.body.id); res.redirect('/admin?tab=okul');
});

// --- SORU İŞLEMLERİ (Önceki kodla aynı) ---
app.post('/soru-ekle', async (req, res) => { /* ... önceki ekle mantığı ... */ 
    const yeni = new Soru({
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruMetni: req.body.soruMetni,
        secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }],
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    await yeni.save(); res.redirect('/admin');
});
app.post('/soru-guncelle', async (req, res) => { /* ... önceki güncelle mantığı ... */ 
    await Soru.findByIdAndUpdate(req.body.id, {
        sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruMetni: req.body.soruMetni,
        dogruCevapIndex: parseInt(req.body.dogruCevap)
    });
    res.redirect('/admin');
});
