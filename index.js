// --- LGS HAZIRLIK PLATFORMU - VERSİYON 1.6 ---
const mongoose = require('mongoose');
const express = require('express');
const cron = require('node-cron');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, 
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    guncelZorluk: { type: Number, default: 3 }
}));

cron.schedule('0 5 * * *', async () => {
    try {
        const tumSorular = await Soru.find({ cozulmeSayisi: { $gt: 0 } });
        const dersler = [...new Set(tumSorular.map(s => s.ders))];
        for (const ders of dersler) {
            const dersSorulari = tumSorular.filter(s => s.ders === ders);
            if (dersSorulari.length > 1) {
                const basariOranlari = dersSorulari.map(s => (s.dogruSayisi / s.cozulmeSayisi) * 100);
                const sureler = dersSorulari.map(s => s.ortalamaSure || 0);
                const mBasari = basariOranlari.reduce((a, b) => a + b, 0) / basariOranlari.length;
                const sBasari = Math.sqrt(basariOranlari.reduce((a, b) => a + Math.pow(b - mBasari, 2), 0) / basariOranlari.length) || 1;
                const mSure = sureler.reduce((a, b) => a + b, 0) / sureler.length;
                const sSure = Math.sqrt(sureler.reduce((a, b) => a + Math.pow(b - mSure, 2), 0) / sureler.length) || 1;
                for (const s of dersSorulari) {
                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mBasari) / sBasari;
                    const zS = (s.ortalamaSure - mSure) / sSure;
                    const zorlukSkoru = (zS * 0.5) - (zB * 0.5);
                    if (zorlukSkoru < -1.2) s.guncelZorluk = 1;
                    else if (zorlukSkoru < -0.5) s.guncelZorluk = 2;
                    else if (zorlukSkoru < 0.5) s.guncelZorluk = 3;
                    else if (zorlukSkoru < 1.2) s.guncelZorluk = 4;
                    else s.guncelZorluk = 5;
                    await s.save();
                }
            }
        }
    } catch (err) { console.error("Cron Hatası:", err.message); }
});
app.get('/', (req, res) => {
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;"><div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;"><h2 style="color:#1a73e8;">LGS Hazırlık</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div></div>`);
});

app.get('/kayit', (req, res) => {
    const iller = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif; padding:20px;"><div style="background:white; padding:30px; border-radius:15px; width:450px;"><h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt</h2><form action="/kayit-yap" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><select name="sinif" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">Sınıf Seçiniz</option>${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${s === 8 ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select><select name="il" id="ilSelect" onchange="ilDegisti()" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İl Seçiniz...</option>${iller.map(il => `<option value="${il}">${il}</option>`).join('')}</select><select name="ilce" id="ilceSelect" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İlçe Seçiniz</option></select><input name="okul" placeholder="Okulunuzun Adı" required style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDI TAMAMLA</button></form></div></div><script>const veriler = {"Aydın": ["Efeler", "Nazilli", "Söke"], "İzmir": ["Konak", "Bornova"], "Ankara": ["Çankaya", "Keçiören"], "İstanbul": ["Esenyurt", "Kadıköy"]};function ilDegisti() {const il = document.getElementById('ilSelect').value;const ilceSelect = document.getElementById('ilceSelect');ilceSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';if(il && veriler[il]) {veriler[il].forEach(ilce => {ilceSelect.innerHTML += '<option value="'+ilce+'">'+ilce+'</option>';});} else if (il) { ilceSelect.innerHTML += '<option value="Merkez">Merkez</option>'; }}</script>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, sinif, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
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
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const mod = req.query.mod || 'soru';
    let icerik = "";
    if (mod === 'profil') {
        let ortPuan = k.soruIndex > 0 ? (k.puan / k.soruIndex).toFixed(2) : 0;
        icerik = `<div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><h2>Profil Bilgileri</h2><p><b>Kullanıcı:</b> ${k.kullaniciAdi}</p><p><b>Sınıf:</b> ${k.sinif}</p><p><b>Okul:</b> ${k.okul}</p><p><b>Ortalama Puan:</b> ${ortPuan}</p><p><b>Çözülen:</b> ${k.soruIndex}</p></div>`;
    } else {
        const sorular = await Soru.find();
        if (!sorular.length) {
            icerik = `<div><h2>Soru bulunamadı.</h2></div>`;
        } else if (!req.query.basla) {
            icerik = `<div style="text-align:center; margin-top:100px;"><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold;">BAŞLA</a></div>`;
        } else {
            const soru = sorular[k.soruIndex % sorular.length];
            const zL = soru.guncelZorluk || 3;
            const harfler = ["A","B","C","D"];
            icerik = `<div style="max-width:800px; margin:auto; padding:20px; background:#fff; border-radius:12px;"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span><b>${k.kullaniciAdi}</b> | Ort: ${(k.puan / (k.soruIndex || 1)).toFixed(1)}</span><span id="timer">00:00</span></div><h2>${soru.soruMetni}</h2>${[0,1,2,3].map(i => `<form method="POST" action="/cevap"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0"><button type="submit" onclick="document.getElementById('gs${i}').value=saniye;" style="width:100%; text-align:left; padding:10px; margin-bottom:5px;"><b>${harfler[i]})</b> ${soru.secenekler[i].metin}</button></form>`).join('')}</div><script>let saniye = 0; setInterval(() => { saniye++; let dk = Math.floor(saniye/60); let sn = saniye%60; document.getElementById('timer').innerText = (dk<10?'0'+dk:dk)+":"+(sn<10?'0'+sn:sn); }, 1000);</script>`;
        }
    }
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:200px; background:#1a73e8; color:white; padding:20px;"><a href="/panel/${k.kullaniciAdi}?mod=soru" style="color:white; display:block; margin-bottom:10px;">Soru Çöz</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="color:white; display:block;">Profilim</a></div><div style="flex:1; padding:30px;">${icerik}</div></div>`);
});
app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (s && k) {
            s.cozulmeSayisi++;
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
            if (dogruMu) s.dogruSayisi++;
            s.ortalamaSure = ((s.ortalamaSure * (s.cozulmeSayisi - 1)) + parseInt(gecenSure)) / s.cozulmeSayisi;
            await s.save();
            if (dogruMu) {
                let Z_katsayi = s.guncelZorluk || 3;
                let GE = 0.05;
                const ds = await Soru.find({ ders: s.ders, cozulmeSayisi: { $gt: 0 } });
                if (ds.length > 1) {
                    const bo = ds.map(x => (x.dogruSayisi / x.cozulmeSayisi) * 100);
                    const su = ds.map(x => x.ortalamaSure || 0);
                    const mB = bo.reduce((a, b) => a + b) / bo.length;
                    const sB = Math.sqrt(bo.reduce((a, b) => a + Math.pow(b - mB, 2)) / bo.length) || 1;
                    const mS = su.reduce((a, b) => a + b) / su.length;
                    const sS = Math.sqrt(su.reduce((a, b) => a + Math.pow(b - mS, 2)) / su.length) || 1;
                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mB) / sB;
                    const zS = (s.ortalamaSure - mS) / sS;
                    GE = Math.min(Math.max((Math.abs(zB) + Math.abs(zS)) / 20, 0.02), 0.10);
                }
                const T_ref = s.ortalamaSure || 60;
                const T_ogr = Math.max(parseInt(gecenSure), 1);
                k.puan += Math.max(Math.round((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE), 1);
            }
            k.soruIndex++;
            await k.save();
        }
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
    } catch (err) { res.status(500).send("Hata"); }
});

app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        const tumSorular = await Soru.find();
        res.send(`<h1>Admin Paneli</h1><a href="/admin/ekle">Soru Ekle</a><br>${tumSorular.map(s => `<div>${s.soruMetni} <form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button>Sil</button></form></div>`).join('')}`);
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin');
});

app.post('/soru-sil', async (req, res) => {
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));
