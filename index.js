const mongoose = require('mongoose');
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, sifre: String, il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 }, soruIndex: { type: Number, default: 0 }, puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 }, cozumSureleri: [{ soruId: String, sure: Number }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }], dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 }, dogruSayisi: { type: Number, default: 0 }, ortalamaSure: { type: Number, default: 0 }
}));

app.get('/', (req, res) => res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;"><div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;"><h2 style="color:#1a73e8;">LGS Hazırlık</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div></div>`));

app.get('/kayit', (req, res) => {
    const iller = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif; padding:20px;"><div style="background:white; padding:30px; border-radius:15px; width:450px;"><h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt</h2><form action="/kayit-yap" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><select name="sinif" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">Sınıf Seçiniz</option>${[1,2,3,4,5,6,7,8,9,10,11,12].map(s=>`<option value="${s}" ${s===8?'selected':''}>${s}. Sınıf</option>`).join('')}</select><select name="il" id="ilSelect" onchange="ilD()" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İl Seçiniz...</option>${iller.map(il=>`<option value="${il}">${il}</option>`).join('')}</select><select name="ilce" id="ilceSelect" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">Önce İl Seçiniz</option></select><input name="okul" placeholder="Okulunuzun Adı" required style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDI TAMAMLA</button></form></div></div><script>const v = {"Aydın": ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim", "Çine", "İncirliova", "Germencik", "Bozdoğan", "Kuyucak", "Köşk", "Sultanhisar", "Karacasu", "Yenipazar", "Buharkent", "Koçarlı", "Karpuzlu"], "İzmir": ["Konak", "Bornova", "Buca", "Karşıyaka", "Balçova", "Bayraklı", "Çiğli", "Gaziemir", "Karabağlar", "Narlıdere", "Aliağa", "Bayındır", "Bergama", "Beydağ", "Çeşme", "Dikili", "Foça", "Güzelbahçe", "Karaburun", "Kemalpaşa", "Kınık", "Kiraz", "Menderes", "Menemen", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"], "Ankara": ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan", "Altındağ", "Pursaklar", "Gölbaşı", "Polatlı", "Çubuk", "Kahramankazan", "Beypazarı", "Elmadağ", "Şereflikoçhisar", "Akyurt", "Nallıhan", "Haymana", "Kızılcahamam", "Bala", "Kalecik", "Ayaş", "Güdül", "Çamlıdere", "Evren"], "İstanbul": ["Esenyurt", "Küçükçekmece", "Bağcılar", "Pendik", "Ümraniye", "Bahçelievler", "Üsküdar", "Sultangazi", "Maltepe", "Gaziosmanpaşa", "Kartal", "Kadıköy", "Esenler", "Kağıthane", "Fatih", "Avcılar", "Başakşehir", "Sarıyer", "Sultanbeyli", "Güngören", "Zeytinburnu", "Şişli", "Arnavutköy", "Beykoz", "Tuzla", "Çekmeköy", "Büyükçekmece", "Beylikdüzü", "Bakırköy", "Beşiktaş", "Silivri", "Çatalca", "Şile", "Adalar"]};function ilD() {const il = document.getElementById('ilSelect').value;const s = document.getElementById('ilceSelect');s.innerHTML = '<option value="">İlçe Seçiniz</option>';if(il && v[il]) {v[il].forEach(i => {s.innerHTML += '<option value="'+i+'">'+i+'</option>';});} else if (il) { s.innerHTML += '<option value="Merkez">Merkez</option>'; }}</script>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, sinif, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const vMi = await Kullanici.findOne({ kullaniciAdi });
        if (vMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        await new Kullanici({ kullaniciAdi, sifre, sinif, il, ilce, okul }).save();
        res.send("<script>alert('Başarılı!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
    res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi));
});

app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı yok.");
    const mod = req.query.mod || 'soru';
    let ic = "";
    if (mod === 'profil') {
        ic = `<div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><h2>Profil</h2><p><b>Ad:</b> ${k.kullaniciAdi}</p><p><b>Sınıf:</b> ${k.sinif}</p><p><b>Okul:</b> ${k.okul}</p><p><b>Puan:</b> ${k.puan}</p></div>`;
    } else {
        const srlar = await Soru.find();
        if (!srlar.length) ic = "Soru yok.";
        else if (!req.query.basla) ic = `<div style="text-align:center; margin-top:100px;"><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold;">SORU ÇÖZMEYE BAŞLA</a></div>`;
        else {
            const s = srlar[k.soruIndex % srlar.length];
            ic = `<div style="max-width:800px; margin:auto; padding:20px; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><div>Puan: ${k.puan} | ⏱️ <span id="timer">00:00</span></div><h2>${s.soruMetni}</h2>${[0,1,2,3].map(i=>`<form method="POST" action="/cevap"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${s._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0"><button type="submit" onclick="document.getElementById('gs'+${i}).value=sn;" style="width:100%; text-align:left; padding:15px; margin-bottom:5px; cursor:pointer;">${s.secenekler[i].metin}</button></form>`).join('')}</div><script>let sn=0; setInterval(()=>{sn++; let d=Math.floor(sn/60),s=sn%60; document.getElementById('timer').innerText=(d<10?'0'+d:d)+":"+(s<10?'0'+s:s)},1000);</script>`;
        }
    }
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#1a73e8; color:white; padding:20px;"><a href="/panel/${k.kullaniciAdi}?mod=soru" style="display:block; color:white; padding:10px;">📖 Soru Çöz</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="display:block; color:white; padding:10px;">👤 Profilim</a><a href="/" style="display:block; color:white; padding:10px;">Çıkış</a></div><div style="flex:1; padding:30px;">${ic}</div></div>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId); const k = await Kullanici.findOne({ kullaniciAdi });
    if (s && k) {
        s.cozulmeSayisi++;
        const dMu = parseInt(secilenIndex) === s.dogruCevapIndex;
        if (dMu) { s.dogruSayisi++; k.puan += 10; }
        s.ortalamaSure = ((s.ortalamaSure * (s.cozulmeSayisi - 1)) + parseInt(gecenSure)) / s.cozulmeSayisi;
        await s.save(); k.soruIndex++; await k.save();
    }
    res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
});

app.get('/admin', async (req, res) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş!'); }
    const tumS = await Soru.find(); const mod = req.query.mod || 'list';
    let ic = mod === 'ekle' ? `<form action="/soru-ekle" method="POST">Sınıf: <input name="sinif" value="8"> Ders: <input name="ders"><br><textarea name="soruMetni" placeholder="Soru"></textarea><br>${[0,1,2,3].map(i=>`Şık ${i}: <input name="metin${i}"><input type="radio" name="dogruCevap" value="${i}"><br>`).join('')}<button>KAYDET</button></form>` : tumS.map(s=>`<div>${s.soruMetni} <form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button>SİL</button></form></div>`).join('');
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif;"><div style="width:250px; background:#202124; color:white; padding:20px;"><a href="/admin?mod=list" style="color:white; display:block;">📋 Liste</a><a href="/admin?mod=ekle" style="color:white; display:block;">➕ Ekle</a></div><div style="flex:1; padding:30px;">${ic}</div></div>`);
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin');
});

app.post('/soru-sil', async (req, res) => { await Soru.findByIdAndDelete(req.body.id); res.redirect('/admin'); });
app.listen(PORT, () => console.log(`🚀 Sunucu Hazır!`));
