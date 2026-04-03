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
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 }
}));

// --- YOLLAR ---
app.get('/', (req, res) => {
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;"><div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;"><h2 style="color:#1a73e8;">LGS Hazırlık</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div></div>`);
});

app.get('/kayit', (req, res) => {
    const iller = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif; padding:20px;"><div style="background:white; padding:30px; border-radius:15px; width:450px;"><h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt</h2><form action="/kayit-yap" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><select name="il" id="ilSelect" onchange="ilDegisti()" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İl Seçiniz...</option>${iller.map(il => `<option value="${il}" ${il === "Aydın" ? "selected" : ""}>${il}</option>`).join('')}</select><select name="ilce" id="ilceSelect" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İlçe Seçiniz</option></select><input name="okul" placeholder="Okulunuzun Adı" required style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDI TAMAMLA</button></form></div></div><script>const veriler = {"Aydın": ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim", "Çine", "İncirliova", "Germencik", "Bozdoğan", "Kuyucak", "Köşk", "Sultanhisar", "Karacasu", "Yenipazar", "Buharkent", "Koçarlı", "Karpuzlu"], "İzmir": ["Konak", "Bornova", "Buca", "Karşıyaka", "Balçova", "Bayraklı", "Çiğli", "Gaziemir", "Karabağlar", "Narlıdere", "Aliağa", "Bayındır", "Bergama", "Beydağ", "Çeşme", "Dikili", "Foça", "Güzelbahçe", "Karaburun", "Kemalpaşa", "Kınık", "Kiraz", "Menderes", "Menemen", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"], "Ankara": ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan", "Altındağ", "Pursaklar", "Gölbaşı", "Polatlı", "Çubuk", "Kahramankazan", "Beypazarı", "Elmadağ", "Şereflikoçhisar", "Akyurt", "Nallıhan", "Haymana", "Kızılcahamam", "Bala", "Kalecik", "Ayaş", "Güdül", "Çamlıdere", "Evren"], "İstanbul": ["Esenyurt", "Küçükçekmece", "Bağcılar", "Pendik", "Ümraniye", "Bahçelievler", "Üsküdar", "Sultangazi", "Maltepe", "Gaziosmanpaşa", "Kartal", "Kadıköy", "Esenler", "Kağıthane", "Fatih", "Avcılar", "Başakşehir", "Sarıyer", "Sultanbeyli", "Güngören", "Zeytinburnu", "Şişli", "Arnavutköy", "Beykoz", "Tuzla", "Çekmeköy", "Büyükçekmece", "Beylikdüzü", "Bakırköy", "Beşiktaş", "Silivri", "Çatalca", "Şile", "Adalar"]};function ilDegisti() {const il = document.getElementById('ilSelect').value;const ilceSelect = document.getElementById('ilceSelect');ilceSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';if(il && veriler[il]) {veriler[il].forEach(ilce => {const s = (il === "Aydın" && ilce === "Nazilli") ? "selected" : "";ilceSelect.innerHTML += '<option value="'+ilce+'" '+s+'>'+ilce+'</option>';});} else if (il) { ilceSelect.innerHTML += '<option value="Merkez">Merkez</option>'; }}window.onload = ilDegisti;</script>`);
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
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const sorular = await Soru.find();
    if (!sorular.length) return res.send("Soru yok.");
    const soru = sorular[k.soruIndex % sorular.length];
    
    const dersSorulari = await Soru.find({ ders: soru.ders, cozulmeSayisi: { $gt: 0 } });
    let zorlukEtiketi = "Orta"; let zorlukRengi = "#f39c12";
    if (dersSorulari.length > 1 && soru.cozulmeSayisi > 0) {
        const basariOranlari = dersSorulari.map(s => (s.dogruSayisi / s.cozulmeSayisi) * 100);
        const sureler = dersSorulari.map(s => s.ortalamaSure || 0);
        const mBasari = basariOranlari.reduce((a, b) => a + b, 0) / basariOranlari.length;
        const sBasari = Math.sqrt(basariOranlari.reduce((a, b) => a + Math.pow(b - mBasari, 2), 0) / basariOranlari.length) || 1;
        const mSure = sureler.reduce((a, b) => a + b, 0) / sureler.length;
        const sSure = Math.sqrt(sureler.reduce((a, b) => a + Math.pow(b - mSure, 2), 0) / sureler.length) || 1;
        const zB = (((soru.dogruSayisi / soru.cozulmeSayisi) * 100) - mBasari) / sBasari;
        const zS = (soru.ortalamaSure - mSure) / sSure;
        const skor = (zS * 0.5) - (zB * 0.5);
        if (skor < -1.2) { zorlukEtiketi = "Çok Kolay"; zorlukRengi = "#27ae60"; }
        else if (skor < -0.5) { zorlukEtiketi = "Kolay"; zorlukRengi = "#2ecc71"; }
        else if (skor < 0.5) { zorlukEtiketi = "Orta"; zorlukRengi = "#f39c12"; }
        else if (skor < 1.2) { zorlukEtiketi = "Zor"; zorlukRengi = "#e67e22"; }
        else { zorlukEtiketi = "Çok Zor"; zorlukRengi = "#c0392b"; }
    }

    const harfler = ["A","B","C","D"];
    res.send(`<div style="max-width:800px; margin:20px auto; font-family:sans-serif; padding:20px; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #eee;"><span><b>${k.okul}</b> | <b>${k.kullaniciAdi}</b> | Puan: ${k.puan}</span><div style="color:red; font-weight:bold;">⏱️ <span id="timer">00:00</span> / 05:00</div></div><div style="margin-bottom:15px;"><span style="background:${zorlukRengi}; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold;">Zorluk: ${zorlukEtiketi}</span> <span style="background:#3498db; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold; margin-left:5px;">Ders: ${soru.ders}</span></div>${soru.soruOnculu && soru.soruOnculu.trim() !== "" ? `<div style="background:#f1f3f4; padding:15px; border-radius:8px; margin-bottom:15px;">${soru.soruOnculu}</div>` : ""}${soru.soruResmi && soru.soruResmi.trim() !== "" ? `<div style="text-align:center; margin-bottom:15px;"><img src="${soru.soruResmi}" style="max-width:100%; border-radius:5px;" onerror="this.parentElement.style.display='none'"></div>` : ""}<h2 style="font-size:20px; color:#202124; margin-bottom:20px;">${soru.soruMetni}</h2><div style="display:grid; gap:10px;">${[0,1,2,3].map(i => { const s = soru.secenekler[i]; if(!s) return ""; return `<form method="POST" action="/cevap" style="margin:0;"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0"><button type="submit" onclick="document.getElementById('gs${i}').value=saniye;" style="width:100%; text-align:left; padding:15px; background:white; border:2px solid #f1f3f4; border-radius:10px; cursor:pointer; display:block;"><b>${harfler[i]})</b> ${s.metin || ""} ${s.gorsel && s.gorsel.trim() !== "" ? `<br><img src="${s.gorsel}" style="max-width:150px; margin-top:5px;" onerror="this.style.display='none'">` : ""}</button></form>`; }).join('')}</div></div><script>let saniye = 0; const timerElement = document.getElementById('timer');const interval = setInterval(() => { saniye++; let dk = Math.floor(saniye / 60); let sn = saniye % 60; timerElement.innerText = (dk < 10 ? '0'+dk : dk) + ":" + (sn < 10 ? '0'+sn : sn); if (saniye >= 300) { clearInterval(interval); window.location.href='/soru/${k.kullaniciAdi}?timeout=true'; } }, 1000);</script>`);
});

app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (s && k) {
            if (secilenIndex !== undefined && secilenIndex !== "") {
                s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;
                const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
                if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;
                const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
                s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;
                await s.save();
                if (dogruMu) {
                    const dersSorulari = await Soru.find({ ders: s.ders, cozulmeSayisi: { $gt: 0 } });
                    let kazanilanPuan = 10;
                    if (dersSorulari.length > 1) {
                        const basariOranlari = dersSorulari.map(soru => (soru.dogruSayisi / soru.cozulmeSayisi) * 100);
                        const sureler = dersSorulari.map(soru => soru.ortalamaSure || 0);
                        const mBasari = basariOranlari.reduce((a, b) => a + b, 0) / basariOranlari.length;
                        const sBasari = Math.sqrt(basariOranlari.reduce((a, b) => a + Math.pow(b - mBasari, 2), 0) / basariOranlari.length) || 1;
                        const mSure = sureler.reduce((a, b) => a + b, 0) / sureler.length;
                        const sSure = Math.sqrt(sureler.reduce((a, b) => a + Math.pow(b - mSure, 2), 0) / sureler.length) || 1;
                        const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mBasari) / sBasari;
                        const zS = (s.ortalamaSure - mSure) / sSure;
                        const zorluk = (zS * 0.5) - (zB * 0.5);
                        if (zorluk < -1.2) kazanilanPuan = 5;
                        else if (zorluk < -0.5) kazanilanPuan = 8;
                        else if (zorluk < 0.5) kazanilanPuan = 12;
                        else if (zorluk < 1.2) kazanilanPuan = 16;
                        else kazanilanPuan = 22;
                    }
                    k.puan += kazanilanPuan;
                }
            }
            k.toplamSure += parseInt(gecenSure) || 0;
            k.cozumSureleri.push({ soruId: soruId, sure: parseInt(gecenSure) || 0 });
            k.soruIndex += 1;
            await k.save();
        }
        res.redirect('/soru/' + encodeURIComponent(kullaniciAdi));
    } catch (err) { res.status(500).send("Hata: " + err.message); }
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
        res.send(`<div style="max-width:900px; margin:30px auto; font-family:sans-serif; padding:20px; background:#fdfdfd; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.1);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>🛠️ Admin Paneli</h2><button onclick="document.getElementById('formAlan').style.display='block'" style="background:#1a73e8; color:white; padding:10px 25px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">SORULAR</button></div><div id="formAlan" style="display:${editSoru ? 'block' : 'none'}; background:#fff; padding:25px; border:1px solid #e0e0e0; border-radius:12px; margin-bottom:30px;"><form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST">${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}Sınıf: <select name="sinif">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select> Ders: <select name="ders">${dersler.map(d => `<option value="${d}" ${(editSoru ? editSoru.ders === d : d === "Matematik") ? 'selected' : ''}>${d}</option>`).join('')}</select><br><br><input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruOnculu" placeholder="Öncül" style="width:98%; height:60px; padding:10px; margin-bottom:10px; border:1px solid #ddd;">${editSoru ? editSoru.soruOnculu : ''}</textarea><input name="soruResmi" placeholder="Soru Görsel URL" value="${editSoru ? editSoru.soruResmi : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruMetni" placeholder="Soru Metni" style="width:98%; height:80px; padding:10px; margin-bottom:10px; border:1px solid #ddd;" required>${editSoru ? editSoru.soruMetni : ''}</textarea><div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px;"><p>Şıklar (Doğru cevabı seçiniz):</p>${[0,1,2,3].map(i => `<div style="margin-bottom:8px; display:flex; align-items:center; gap:5px;"><b>${String.fromCharCode(65+i)}:</b> <input name="metin${i}" placeholder="Metin" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].metin : ''}" style="width:40%;"> <input name="gorsel${i}" placeholder="Görsel URL" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].gorsel : ''}" style="width:30%;"> <input type="radio" name="dogruCevap" value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''} required></div>`).join('')}</div><button style="background:#34a853; color:white; padding:12px 30px; border:none; border-radius:8px; cursor:pointer;">KAYDET</button><button type="button" onclick="document.getElementById('formAlan').style.display='none'" style="background:#5f6368; color:white; padding:12px 20px; border:none; border-radius:8px; cursor:pointer; margin-left:10px;">KAPAT</button></form><hr style="margin:30px 0;"><div style="display:grid; gap:10px;">${tumSorular.map((s, i) => `<div style="padding:15px; background:#fff; border:1px solid #eee; border-radius:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${i+1}.</b> ${s.soruMetni.substring(0,50)}...</span><div><a href="/admin?duzenle=${s._id}" style="color:#1a73e8; font-weight:bold; text-decoration:none; margin-right:10px;">DÜZENLE</a><form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">SİL</button></form></div></div>`).join('')}</div></div></div>`);
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/soru-ekle', async (req, res) => { await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save(); res.redirect('/admin'); });
app.post('/soru-guncelle', async (req, res) => { await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }); res.redirect('/admin'); });
app.post('/soru-sil', async (req, res) => { await Soru.findByIdAndDelete(req.body.id); res.redirect('/admin'); });
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Sunucu aktif: ${PORT}`));
