const mongoose = require('mongoose');
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı"));

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
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif; padding:20px;"><div style="background:white; padding:30px; border-radius:15px; width:450px;"><h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt</h2><form action="/kayit-yap" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><select name="sinif" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">Sınıf Seçiniz</option>${[1,2,3,4,5,6,7,8,9,10,11,12].map(s=>`<option value="${s}" ${s===8?'selected':''}>${s}. Sınıf</option>`).join('')}</select><select name="il" id="ilS" onchange="ilD()" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İl Seçiniz...</option>${iller.map(il=>`<option value="${il}">${il}</option>`).join('')}</select><select name="ilce" id="ilceS" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İlçe Seçiniz</option></select><input name="okul" placeholder="Okul" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer;">KAYDI TAMAMLA</button></form></div></div><script>const v={"Aydın":["Efeler","Nazilli","Söke","Kuşadası","Didim","Çine"],"İzmir":["Konak","Bornova","Buca","Karşıyaka"],"Ankara":["Çankaya","Keçiören","Yenimahalle"],"İstanbul":["Esenyurt","Kadıköy","Üsküdar","Pendik"]};function ilD(){const i=document.getElementById('ilS').value,s=document.getElementById('ilceS');s.innerHTML='<option value="">İlçe Seçiniz</option>';if(i&&v[i]){v[i].forEach(l=>{s.innerHTML+='<option value="'+l+'">'+l+'</option>'});}else if(i){s.innerHTML+='<option value="Merkez">Merkez</option>'}}</script>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sinif, il, ilce, okul } = req.body;
    try {
        await new Kullanici({ kullaniciAdi, sifre, sinif, il, ilce, okul }).save();
        res.send("<script>alert('Başarılı!'); window.location.href='/';</script>");
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
    res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi));
});

app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Yok");
    const mod = req.query.mod || 'soru';
    let ic = "";
    if (mod === 'profil') ic = `<div style="background:#fff; padding:20px; border-radius:10px;"><h2>Profil</h2><p>Ad: ${k.kullaniciAdi}</p><p>Puan: ${k.puan}</p><p>Sınıf: ${k.sinif}</p></div>`;
    else {
        const sr = await Soru.find();
        if (!sr.length) ic = "Soru yok.";
        else if (!req.query.basla) ic = `<div style="text-align:center; margin-top:100px;"><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px;">SORU ÇÖZMEYE BAŞLA</a></div>`;
        else {
            const s = sr[k.soruIndex % sr.length];
            ic = `<div style="max-width:800px; margin:auto; background:#fff; padding:20px; border-radius:10px;"><div>⏱️ <span id="timer">00:00</span></div><h2>${s.soruMetni}</h2>${[0,1,2,3].map(i=>`<form method="POST" action="/cevap"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${s._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0"><button type="submit" onclick="document.getElementById('gs'+${i}).value=sn;" style="width:100%; text-align:left; padding:10px; margin-bottom:5px;">${s.secenekler[i].metin}</button></form>`).join('')}</div><script>let sn=0; setInterval(()=>{sn++; let d=Math.floor(sn/60),s=sn%60; document.getElementById('timer').innerText=(d<10?'0'+d:d)+":"+(s<10?'0'+s:s)},1000);</script>`;
        }
    }
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:200px; background:#1a73e8; color:white; padding:20px;"><a href="/panel/${k.kullaniciAdi}?mod=soru" style="color:#fff; display:block; padding:10px;">Soru Çöz</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="color:#fff; display:block; padding:10px;">Profil</a><a href="/" style="color:#fff; display:block; padding:10px;">Çıkış</a></div><div style="flex:1; padding:20px;">${ic}</div></div>`);
});

app.post('/cevap', async (req, res) => {
    const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
    const s = await Soru.findById(soruId), k = await Kullanici.findOne({ kullaniciAdi });
    if (s && k) {
        s.cozulmeSayisi++;
        if (parseInt(secilenIndex) === s.dogruCevapIndex) { s.dogruSayisi++; k.puan += 10; }
        s.ortalamaSure = ((s.ortalamaSure * (s.cozulmeSayisi - 1)) + parseInt(gecenSure)) / s.cozulmeSayisi;
        k.soruIndex++; await s.save(); await k.save();
    }
    res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
});

app.get('/admin', async (req, res) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş!'); }
    const tum = await Soru.find(), mod = req.query.mod || 'list';
    let ic = mod === 'ekle' ? `<form action="/soru-ekle" method="POST">Sınıf: <input name="sinif" value="8"> Ders: <input name="ders"><br><textarea name="soruMetni"></textarea><br>${[0,1,2,3].map(i=>`Şık ${i}: <input name="metin${i}"><input type="radio" name="dogruCevap" value="${i}"><br>`).join('')}<button>KAYDET</button></form>` : tum.map(s=>`<div>${s.soruMetni} <form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button>SİL</button></form></div>`).join('');
    res.send(`<div style="display:flex; min-height:100vh;"><div style="width:200px; background:#202124; color:#fff; padding:20px;"><a href="/admin?mod=list" style="color:#fff; display:block;">Liste</a><a href="/admin?mod=ekle" style="color:#fff; display:block;">Ekle</a></div><div style="flex:1; padding:20px;">${ic}</div></div>`);
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin');
});

app.post('/soru-sil', async (req, res) => { await Soru.findByIdAndDelete(req.body.id); res.redirect('/admin'); });
app.listen(PORT, () => console.log(`🚀 Hazır` ));
