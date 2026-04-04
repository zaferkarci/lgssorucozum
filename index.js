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
    ortalamaSure: { type: Number, default: 0 }
}));

// --- YOLLAR ---
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
        icerik = `<div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><h2>Profil Bilgileri</h2><p><b>Kullanıcı Adı:</b> ${k.kullaniciAdi}</p><p><b>Sınıf:</b> ${k.sinif}. Sınıf</p><p><b>Okul:</b> ${k.okul}</p><p><b>İl/İlçe:</b> ${k.il} / ${k.ilce}</p><p><b>Toplam Puan:</b> ${k.puan}</p><p><b>Çözülen Soru:</b> ${k.soruIndex}</p></div>`;
    } else {
        const sorular = await Soru.find();
        if (!sorular.length) {
            icerik = `<div style="text-align:center; margin-top:50px;"><h2>Soru bulunamadı.</h2><p>Lütfen admin panelinden soru ekleyiniz.</p></div>`;
        } else if (!req.query.basla) {
            icerik = `<div style="text-align:center; margin-top:100px;"><h1 style="color:#1a73e8;">Hazır mısın?</h1><p>Sıradaki soruyu çözmek için butona tıkla.</p><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="display:inline-block; padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold; font-size:18px;">SORU ÇÖZMEYE BAŞLA</a></div>`;
        } else {
            const soru = sorular[k.soruIndex % sorular.length];
            const dersSorulari = await Soru.find({ ders: soru.ders, cozulmeSayisi: { $gt: 0 } });
            let zorlukEtiketi = "Çok Kolay"; let zorlukRengi = "#27ae60";
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
            icerik = `<div style="max-width:800px; margin:auto; font-family:sans-serif; padding:20px; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #eee;"><span><b>${k.kullaniciAdi}</b> | Puan: ${k.puan}</span><div style="color:red; font-weight:bold;">⏱️ <span id="timer">00:00</span> / 05:00 dk</div></div><div style="margin-bottom:15px;"><span style="background:${zorlukRengi}; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold;">Zorluk: ${zorlukEtiketi}</span> <span style="background:#3498db; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold; margin-left:5px;">Ders: ${soru.ders}</span></div>${soru.soruOnculu ? `<div style="background:#f1f3f4; padding:15px; border-radius:8px; margin-bottom:15px;">${soru.soruOnculu}</div>` : ""}${soru.soruResmi ? `<div style="text-align:center; margin-bottom:15px;"><img src="${soru.soruResmi}" style="max-width:100%; border-radius:8px;"></div>` : ""}<h2 style="font-size:20px; color:#202124; margin-bottom:20px;">${soru.soruMetni}</h2><div style="display:grid; gap:10px;">${[0,1,2,3].map(i => { const s = soru.secenekler[i]; if(!s) return ""; return `<form method="POST" action="/cevap" style="margin:0;"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0"><button type="submit" onclick="document.getElementById('gs${i}').value=saniye;" style="width:100%; text-align:left; padding:15px; background:white; border:2px solid #f1f3f4; border-radius:10px; cursor:pointer; display:block;"><b>${harfler[i]})</b> ${s.metin || ""} ${s.gorsel ? `<br><img src="${s.gorsel}" style="max-width:150px; margin-top:5px;">` : ""}</button></form>`; }).join('')}</div></div><script>let saniye = 0; let timerInterval = setInterval(() => { saniye++; let dk = Math.floor(saniye/60); let sn = saniye%60; document.getElementById('timer').innerText = (dk<10?'0'+dk:dk)+":"+(sn<10?'0'+sn:sn); if(saniye >= 300) { clearInterval(timerInterval); if(confirm('Süreniz doldu! Sıradaki soruya geçmek istiyor musunuz?')) { window.location.href='/panel/${encodeURIComponent(k.kullaniciAdi)}?basla=true'; } } }, 1000);</script>`;
        }
    }

    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#1a73e8; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">LGS Hazırlık</h2><a href="/panel/${k.kullaniciAdi}?mod=soru" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soru'?'#1557b0':''};">📖 Soru Çöz</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='profil'?'#1557b0':''};">👤 Profilim</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış Yap</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
});

app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (s && k) {
            s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
            if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;
            const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
            s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;
            await s.save();

            if (dogruMu) {
                const dersSorulari = await Soru.find({ ders: s.ders, cozulmeSayisi: { $gt: 0 } });
                let Z_katsayi = 1; 
                if (dersSorulari.length > 1 && s.cozulmeSayisi > 1) {
                    const basariOranlari = dersSorulari.map(soru => (soru.dogruSayisi / soru.cozulmeSayisi) * 100);
                    const sureler = dersSorulari.map(soru => soru.ortalamaSure || 0);
                    const mBasari = basariOranlari.reduce((a, b) => a + b, 0) / basariOranlari.length;
                    const sBasari = Math.sqrt(basariOranlari.reduce((a, b) => a + Math.pow(b - mBasari, 2), 0) / basariOranlari.length) || 1;
                    const mSure = sureler.reduce((a, b) => a + b, 0) / sureler.length;
                    const sSure = Math.sqrt(sureler.reduce((a, b) => a + Math.pow(b - mSure, 2), 0) / sureler.length) || 1;
                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mBasari) / sBasari;
                    const zS = (s.ortalamaSure - mSure) / sSure;
                    const zorluk = (zS * 0.5) - (zB * 0.5);
                    if (zorluk < -1.2) Z_katsayi = 1;
                    else if (zorluk < -0.5) Z_katsayi = 2;
                    else if (zorluk < 0.5) Z_katsayi = 3;
                    else if (zorluk < 1.2) Z_katsayi = 4;
                    else Z_katsayi = 5;
                }
                const T_ref = s.ortalamaSure || 60;
                const T_ogr = Math.max(parseInt(gecenSure), 1);
                const GE = 0.05;
                const kazanilanPuan = Math.round((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE) || 1;
                k.puan += Math.max(kazanilanPuan, 1);
            }
            k.toplamSure += parseInt(gecenSure) || 0;
            k.cozumSureleri.push({ soruId: soruId, sure: parseInt(gecenSure) || 0 });
            k.soruIndex += 1;
            await k.save();
        }
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
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
        const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');

        let icerik = "";
        if (mod === 'soruEkle') {
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>${editSoru ? 'Soru Düzenle' : 'Yeni Soru Ekle'}</h3><form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST">${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}Sınıf: <select name="sinif">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select> Ders: <select name="ders">${dersler.map(d => `<option value="${d}" ${editSoru && editSoru.ders === d ? 'selected' : ''}>${d}</option>`).join('')}</select><br><br><input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruOnculu" placeholder="Öncül (Opsiyonel)" style="width:98%; height:60px; padding:10px; margin-bottom:10px; border:1px solid #ddd;">${editSoru ? editSoru.soruOnculu : ''}</textarea><input name="soruResmi" placeholder="Soru Görsel URL (Opsiyonel)" value="${editSoru ? editSoru.soruResmi : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruMetni" placeholder="Soru Metni" style="width:98%; height:80px; padding:10px; margin-bottom:10px; border:1px solid #ddd;" required>${editSoru ? editSoru.soruMetni : ''}</textarea><div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px;"><p>Şıklar (Doğru seçeneği işaretleyin):</p>${[0,1,2,3].map(i => `<div style="margin-bottom:8px; display:flex; align-items:center; gap:10px;"><b>${String.fromCharCode(65+i)}:</b> <input name="metin${i}" placeholder="Metin" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].metin : ''}" style="flex:2;"> <input name="gorsel${i}" placeholder="Görsel URL" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].gorsel : ''}" style="flex:1;"> <input type="radio" name="dogruCevap" value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''} required></div>`).join('')}</div><button style="background:#34a853; color:white; padding:12px 30px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDET</button></form></div>`;
        } else {
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>Tüm Sorular</h3><div style="display:grid; gap:10px;">${tumSorular.map((s, i) => `<div style="padding:15px; background:#fff; border:1px solid #eee; border-radius:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${i+1}.</b> [${s.sinif}. Sınıf - ${s.ders}] ${s.soruMetni.substring(0,50)}...</span><div><a href="/admin?duzenle=${s._id}&mod=soruEkle" style="color:#1a73e8; font-weight:bold; text-decoration:none; margin-right:10px;">DÜZENLE</a><form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">SİL</button></form></div></div>`).join('')}</div></div>`;
        }

        res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#202124; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">🛠️ Admin</h2><a href="/admin?mod=soruListesi" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soruListesi'?'#3c4043':''};">📋 Soruları Listele</a><a href="/admin?mod=soruEkle" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soruEkle'?'#3c4043':''};">➕ Yeni Soru Ekle</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış Yap</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

app.post('/soru-guncelle', async (req, res) => {
    await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) });
    res.redirect('/admin?mod=soruListesi');
});

app.post('/soru-sil', async (req, res) => {
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin?mod=soruListesi');
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));
