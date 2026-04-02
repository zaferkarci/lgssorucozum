const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

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

// --- YOLLAR ---
app.get('/', (req, res) => {
    res.send(`
    <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:'Segoe UI',Tahoma,sans-serif;">
        <div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:100%; max-width:350px; text-align:center;">
            <h2 style="color:#1a73e8; margin-bottom:10px;">LGS Hazırlık</h2>
            <p style="color:#5f6368; margin-bottom:25px;">Soru Çözüm Platformuna Giriş Yap</p>
            <form action="/giris" method="POST">
                <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #dadce0; border-radius:8px; box-sizing:border-box;">
                <input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #dadce0; border-radius:8px; box-sizing:border-box;">
                <button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:16px;">GİRİŞ YAP</button>
            </form>
            <p style="margin-top:20px; font-size:14px;">Hesabınız yok mu? <a href="/kayit" style="color:#1a73e8; text-decoration:none; font-weight:bold;">Kayıt Ol</a></p>
        </div>
    </div>`);
});

app.get('/kayit', (req, res) => {
    const iller = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
    res.send(`
    <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:'Segoe UI',sans-serif; padding:20px;">
        <div style="background:white; padding:30px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:100%; max-width:450px;">
            <h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt Oluştur</h2>
            <form action="/kayit-yap" method="POST">
                <input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;">
                <input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;">
                <input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;">
                <select name="il" id="ilSelect" onchange="ilDegisti()" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;">
                    <option value="">İl Seçiniz...</option>
                    ${iller.map(il => `<option value="${il}" ${il === "Aydın" ? "selected" : ""}>${il}</option>`).join('')}
                </select>
                <select name="ilce" id="ilceSelect" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İlçe Seçiniz</option></select>
                <input name="okul" placeholder="Okulunuzun Adı" required style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;">
                <button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:16px;">KAYDI TAMAMLA</button>
            </form>
            <p style="text-align:center; margin-top:15px;"><a href="/" style="color:#5f6368; text-decoration:none; font-size:14px;">Geri Dön</a></p>
        </div>
    </div>
    <script>
        const veriler = {"Aydın": ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim", "Çine", "İncirliova", "Germencik", "Bozdoğan", "Kuyucak", "Köşk", "Sultanhisar", "Karacasu", "Yenipazar", "Buharkent", "Koçarlı", "Karpuzlu"], "İzmir": ["Konak", "Bornova", "Buca", "Karşıyaka", "Balçova", "Bayraklı", "Çiğli", "Gaziemir", "Karabağlar", "Narlıdere", "Aliağa", "Bayındır", "Bergama", "Beydağ", "Çeşme", "Dikili", "Foça", "Güzelbahçe", "Karaburun", "Kemalpaşa", "Kınık", "Kiraz", "Menderes", "Menemen", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"], "Ankara": ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan", "Altındağ", "Pursaklar", "Gölbaşı", "Polatlı", "Çubuk", "Kahramankazan", "Beypazarı", "Elmadağ", "Şereflikoçhisar", "Akyurt", "Nallıhan", "Haymana", "Kızılcahamam", "Bala", "Kalecik", "Ayaş", "Güdül", "Çamlıdere", "Evren"], "İstanbul": ["Esenyurt", "Küçükçekmece", "Bağcılar", "Pendik", "Ümraniye", "Bahçelievler", "Üsküdar", "Sultangazi", "Maltepe", "Gaziosmanpaşa", "Kartal", "Kadıköy", "Esenler", "Kağıthane", "Fatih", "Avcılar", "Başakşehir", "Sarıyer", "Sultanbeyli", "Güngören", "Zeytinburnu", "Şişli", "Arnavutköy", "Beykoz", "Tuzla", "Çekmeköy", "Büyükçekmece", "Beylikdüzü", "Bakırköy", "Beşiktaş", "Silivri", "Çatalca", "Şile", "Adalar"]};
        function ilDegisti() {
            const il = document.getElementById('ilSelect').value;
            const ilceSelect = document.getElementById('ilceSelect');
            ilceSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';
            if(il && veriler[il]) {
                veriler[il].forEach(ilce => {
                    const s = (il === "Aydın" && ilce === "Nazilli") ? "selected" : "";
                    ilceSelect.innerHTML += '<option value="'+ilce+'" '+s+'>'+ilce+'</option>';
                });
            } else if (il) { ilceSelect.innerHTML += '<option value="Merkez">Merkez</option>'; }
        }
        window.onload = ilDegisti;
    </script>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        await new Kullanici({ kullaniciAdi, sifre, il, ilce, okul }).save();
        res.send("<script>alert('Başarılı!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
    res.redirect('/soru/' + k.kullaniciAdi);
});

app.get('/soru/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    const sorular = await Soru.find();
    if (!sorular.length) return res.send("<div style='text-align:center; padding:50px; font-family:sans-serif;'><h2>Henüz soru eklenmemiş.</h2><a href='/'>Geri Dön</a></div>");
    const soru = sorular[k.soruIndex % sorular.length];
    const harfler = ["A","B","C","D"];
    res.send(`
    <div style="max-width:800px; margin:20px auto; font-family:'Segoe UI',sans-serif; padding:20px; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px; border:1px solid #eee;">
            <div style="color:#333;">🎓 <b>${k.okul}</b> | 👤 <b>${k.kullaniciAdi}</b></div>
            <div style="display:flex; gap:15px; align-items:center;">
                <span style="background:#e8f0fe; color:#1a73e8; padding:5px 12px; border-radius:20px; font-weight:bold;">Puan: ${k.puan}</span>
                <span style="color:#d93025; font-weight:bold; font-variant-numeric:tabular-nums;">⏱️ <span id="timer">00:00</span> / 05:00</span>
            </div>
        </div>
        <div style="background:#fff; border:1px solid #eee; padding:25px; border-radius:10px; margin-bottom:20px; line-height:1.6;">
            ${soru.soruOnculu ? `<div style="background:#f1f3f4; padding:15px; border-radius:8px; margin-bottom:15px; font-style:italic;">${soru.soruOnculu}</div>` : ""}
            ${soru.soruResmi ? `<div style="text-align:center; margin-bottom:15px;"><img src="${soru.soruResmi}" style="max-width:100%; border-radius:5px; border:1px solid #eee;"></div>` : ""}
            <h2 style="font-size:20px; color:#202124; margin-bottom:20px;">${soru.soruMetni}</h2>
            <div style="display:grid; gap:10px;">
            ${soru.secenekler.map((s,i)=>`
                <form method="POST" action="/cevap" id="f${i}">
                    <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0">
                    <button type="button" onclick="document.getElementById('gs${i}').value=saniye; document.getElementById('f${i}').submit();" style="width:100%; text-align:left; padding:15px; background:white; border:2px solid #f1f3f4; border-radius:10px; cursor:pointer; font-size:16px; transition:all 0.2s;">
                        <b style="color:#1a73e8; margin-right:10px;">${harfler[i]})</b> ${s.metin || ""}
                    </button>
                </form>`).join('')}
            </div>
        </div>
    </div>
    <script>
        let saniye = 0; const timerElement = document.getElementById('timer');
        const interval = setInterval(() => { saniye++; let dk = Math.floor(saniye / 60); let sn = saniye % 60; timerElement.innerText = (dk < 10 ? '0'+dk : dk) + ":" + (sn < 10 ? '0'+sn : sn); if (saniye >= 300) { clearInterval(interval); alert("Süre Doldu!"); } }, 1000);
        document.querySelectorAll('button').forEach(btn => {
            btn.onmouseover = () => btn.style.borderColor = '#1a73e8';
            btn.onmouseout = () => btn.style.borderColor = '#f1f3f4';
        });
    </script>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId);
    const k = await Kullanici.findOne({ kullaniciAdi });
    if (parseInt(secilenIndex) === s.dogruCevapIndex) k.puan += 10;
    k.toplamSure += parseInt(gecenSure);
    k.cozumSureleri.push({ soruId: soruId, sure: parseInt(gecenSure) });
    k.soruIndex += 1; await k.save();
    res.redirect('/soru/' + kullaniciAdi);
});

app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        let editSoru = null; if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);
        const tumSorular = await Soru.find();
        const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "T.C. İnkılâp Tarihi", "İngilizce", "Din Kültürü"];
        res.send(`
        <div style="max-width:900px; margin:30px auto; font-family:'Segoe UI',sans-serif; padding:20px; background:#fdfdfd; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:15px;">
                <h2 style="color:#202124; margin:0;">🛠️ Admin Kontrol Paneli</h2>
                <button onclick="document.getElementById('formAlan').style.display='block'" style="background:#1a73e8; color:white; padding:12px 25px; border:none; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow:0 4px 6px rgba(26,115,232,0.2);">SORULAR</button>
            </div>
            
            <div id="formAlan" style="display:${editSoru ? 'block' : 'none'}; background:#fff; padding:25px; border:1px solid #e0e0e0; border-radius:12px; margin-bottom:30px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                <h3 style="margin-top:0; color:#3c4043;">${editSoru ? 'Soru Düzenle' : 'Yeni Soru Ekle'}</h3>
                <form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST">
                    ${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                        <div>Sınıf: <select name="sinif" style="width:100%; padding:8px; border-radius:5px;">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select></div>
                        <div>Ders: <select name="ders" style="width:100%; padding:8px; border-radius:5px;">${dersler.map(d => `<option value="${d}" ${(editSoru ? editSoru.ders === d : d === "Matematik") ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
                    </div>
                    <input name="konu" placeholder="Konu Başlığı" value="${editSoru ? editSoru.konu : ''}" style="width:98%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:5px;">
                    <textarea name="soruOnculu" placeholder="Soru Öncülü (Opsiyonel)" style="width:98%; height:60px; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:5px;">${editSoru ? editSoru.soruOnculu : ''}</textarea>
                    <input name="soruResmi" placeholder="Soru Görsel URL (Opsiyonel)" value="${editSoru ? editSoru.soruResmi : ''}" style="width:98%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:5px;">
                    <textarea name="soruMetni" placeholder="Soru Metni" style="width:98%; height:80px; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:5px;" required>${editSoru ? editSoru.soruMetni : ''}</textarea>
                    
                    <div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px;">
                        <p style="margin:0 0 10px 0; font-weight:bold; color:#5f6368;">Seçenekler ve Doğru Cevap</p>
                        ${[0,1,2,3].map(i => `
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                            <b>${String.fromCharCode(65+i)}:</b>
                            <input name="metin${i}" placeholder="Şık Metni" value="${editSoru ? editSoru.secenekler[i].metin : ''}" style="flex:2; padding:8px; border:1px solid #ddd; border-radius:4px;">
                            <input name="gorsel${i}" placeholder="Şık Görsel URL" value="${editSoru ? editSoru.secenekler[i].gorsel : ''}" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
                            <input type="radio" name="dogruCevap" value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''} required title="Doğru Cevap">
                        </div>`).join('')}
                    </div>
                    
                    <button style="background:#34a853; color:white; padding:12px 30px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">${editSoru ? 'GÜNCELLEMEYİ KAYDET' : 'SORUYU YAYINLA'}</button>
                    <button type="button" onclick="document.getElementById('formAlan').style.display='none'" style="background:#5f6368; color:white; padding:12px 20px; border:none; border-radius:8px; cursor:pointer; margin-left:10px;">KAPAT</button>
                    <hr style="margin:30px 0; border:0; border-top:1px solid #eee;">
                    <h3 style="color:#3c4043;">Kayıtlı Sorular</h3>
                    <div style="display:grid; gap:10px;">
                    ${tumSorular.map((s, i) => `
                        <div style="padding:15px; background:#fff; border:1px solid #eee; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#202124;"><b>${i+1}.</b> ${s.soruMetni.substring(0,50)}... <small style="color:#1a73e8; margin-left:10px;">[${s.ders}]</small></span>
                            <div style="display:flex; gap:10px;">
                                <a href="/admin?duzenle=${s._id}" style="text-decoration:none; color:#1a73e8; font-weight:bold; font-size:14px; padding:5px 10px; border:1px solid #1a73e8; border-radius:4px;">DÜZENLE</a>
                                <form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button style="background:none; border:1px solid #d93025; color:#d93025; cursor:pointer; padding:5px 10px; border-radius:4px; font-weight:bold; font-size:14px;">SİL</button></form>
                            </div>
                        </div>`).join('')}
                    </div>
                </form>
            </div>
        </div>`);
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/soru-ekle', async (req, res) => { await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save(); res.redirect('/admin'); });
app.post('/soru-guncelle', async (req, res) => { await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }); res.redirect('/admin'); });
app.post('/soru-sil', async (req, res) => { await Soru.findByIdAndDelete(req.body.id); res.redirect('/admin'); });
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Sunucu aktif: ${PORT}`));
