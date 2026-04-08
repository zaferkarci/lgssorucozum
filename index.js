// --- LGS HAZIRLIK PLATFORMU - VERSİYON 2.0 (Sınırsız Görünürlük & Global Analitik) ---
const mongoose = require('mongoose');
const express = require('express');
const cron = require('node-cron');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ v2.0 Sistem Aktif")).catch(err => console.error("❌ Veritabanı:", err.message));

// --- MODELLER ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 }, // Toplam Sınırsız Skor
    toplamSure: { type: Number, default: 0 },
    sonKazanilanPuan: { type: Number, default: 0 }, // v2.0: Görünürlük için eklendi
    cozumSureleri: [{ soruId: String, sure: Number, kazanilanPuan: Number, tarih: { type: Date, default: Date.now } }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    guncelZorluk: { type: Number, default: 10 } // Sınırsız Karmaşıklık Skoru (Z-Score tabanlı)
}));

// --- GÜNLÜK SINIRSIZ SKOR GÜNCELLEME (05:00 AM) ---
cron.schedule('0 5 * * *', async () => {
    try {
        const tumSorular = await Soru.find({ cozulmeSayisi: { $gt: 0 } });
        const dersler = [...new Set(tumSorular.map(s => s.ders))];
        
        for (const ders of dersler) {
            const ds = tumSorular.filter(s => s.ders === ders);
            if (ds.length > 1) {
                const bo = ds.map(s => (s.dogruSayisi / s.cozulmeSayisi) * 100);
                const su = ds.map(s => s.ortalamaSure || 0);
                
                const mB = bo.reduce((a, b) => a + b, 0) / bo.length;
                const sB = Math.sqrt(bo.reduce((a, b) => a + Math.pow(b - mB, 2), 0) / bo.length) || 1;
                const mS = su.reduce((a, b) => a + b, 0) / su.length;
                const sS = Math.sqrt(su.reduce((a, b) => a + Math.pow(b - mS, 2), 0) / su.length) || 1;

                for (const s of ds) {
                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mB) / sB;
                    const zS = (s.ortalamaSure - mS) / sS;
                    const GE = Math.min(Math.max((Math.abs(zB) + Math.abs(zS)) / 20, 0.02), 0.10);
                    
                    // Karmaşıklık Skoru: Başarı düşükse ve süre uzunsa skor ucu açık şekilde artar.
                    const hamSkor = ((zS * 10) - (zB * 10)) * (GE * 100);
                    s.guncelZorluk = Math.max(parseFloat((20 + hamSkor).toFixed(2)), 1); 
                    await s.save();
                }
            }
        }
        console.log("✅ Sınırsız Karmaşıklık Skorları Yenilendi.");
    } catch (err) { console.error("❌ Analiz Hatası:", err.message); }
});
// --- GİRİŞ VE PANEL ARAYÜZÜ (v2.0 Sınırsız Görünürlük) ---

app.get('/', (req, res) => {
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;"><div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;"><h2 style="color:#1a73e8;">LGS Hazırlık v2.0</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div></div>`);
});

app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const mod = req.query.mod || 'soru';

    let icerik = "";
    if (mod === 'profil') {
        // v2.0: Sınırsız Verimlilik Skoru (Puan / Soru Oranı)
        let verimlilik = k.soruIndex > 0 ? (k.puan / k.soruIndex).toFixed(2) : 0;
        icerik = `
        <div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
            <h2 style="color:#1a73e8;">Kişisel Başarı Raporu</h2>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
                <div style="background:#e8f0fe; padding:15px; border-radius:10px;">
                    <small>Toplam Sınırsız Puan</small>
                    <div style="font-size:24px; font-weight:bold; color:#1967d2;">${k.puan.toLocaleString()}</div>
                </div>
                <div style="background:#e6ffed; padding:15px; border-radius:10px;">
                    <small>Verimlilik Skoru</small>
                    <div style="font-size:24px; font-weight:bold; color:#188038;">${verimlilik}</div>
                </div>
            </div>
            <p style="margin-top:20px;"><b>Okul:</b> ${k.okul} | <b>İl/İlçe:</b> ${k.il}/${k.ilce}</p>
            <p><b>Son Çözülen Soru Puanı:</b> <span style="color:#e67e22; font-weight:bold;">+${k.sonKazanilanPuan.toFixed(2)}</span></p>
        </div>`;
    } else {
        const sorular = await Soru.find();
        if (!sorular.length) {
            icerik = `<h2>Soru bulunamadı.</h2>`;
        } else if (!req.query.basla) {
            icerik = `
            <div style="text-align:center; margin-top:100px;">
                <h1 style="color:#1a73e8;">Hoş Geldin, ${k.kullaniciAdi}!</h1>
                <p>Sınırsız Karmaşıklık Motoru senin için yeni bir soru hazırladı.</p>
                <a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="display:inline-block; padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold;">BAŞLA</a>
            </div>`;
        } else {
            const soru = sorular[k.soruIndex % sorular.length];
            const sSkor = soru.guncelZorluk || 10;
            
            icerik = `
            <div style="max-width:800px; margin:auto; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.1); overflow:hidden;">
                <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#5f6368;">${soru.ders} - ${soru.konu}</span>
                    <span style="background:#fff7e6; color:#d48806; padding:4px 12px; border-radius:15px; font-weight:bold; border:1px solid #ffe58f;">
                        💎 Potansiyel Puan: ${sSkor.toFixed(2)}
                    </span>
                </div>
                <div style="padding:25px;">
                    <p style="font-size:18px; line-height:1.6;">${soru.soruMetni}</p>
                    <div id="soruSure" style="text-align:right; font-weight:bold; color:#ea4335;">⏱️ 0s</div>
                    <form action="/cevap" method="POST" id="cevapForm">
                        <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
                        <input type="hidden" name="soruId" value="${soru._id}">
                        <input type="hidden" name="gecenSure" id="gecenSure" value="0">
                        <div style="display:grid; gap:10px; margin-top:20px;">
                            ${soru.secenekler.map((s, i) => `
                                <button name="secilenIndex" value="${i}" style="padding:15px; text-align:left; border:2px solid #eee; border-radius:8px; background:white; cursor:pointer; font-size:16px;" onmouseover="this.style.borderColor='#1a73e8'" onmouseout="this.style.borderColor='#eee'">
                                    <b>${["A","B","C","D"][i]})</b> ${s.metin}
                                </button>
                            `).join('')}
                        </div>
                    </form>
                </div>
            </div>
            <script>
                let sn = 0; setInterval(() => { sn++; document.getElementById('soruSure').innerText = '⏱️ ' + sn + 's'; document.getElementById('gecenSure').value = sn; }, 1000);
            </script>`;
        }
    }
    // Sidebar ve Layout gönderimi (v2.0 renkleri ile)
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#1a73e8; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">LGS PRO v2.0</h2><a href="/panel/${k.kullaniciAdi}?mod=soru" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soru'?'#1557b0':''};">📖 Sınırsız Soru</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='profil'?'#1557b0':''};">📊 Başarı Analizi</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış</a></div><div style="flex:1; padding:30px;">${icerik}</div></div>`);
});
// --- PUAN HESAPLAMA VE SONUÇ EKRANI (v2.0 Sınırsız Görünürlük) ---

app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        
        if (!s || !k) return res.redirect('/');

        // 1. Soru İstatistiklerini Güncelle
        s.cozulmeSayisi += 1;
        const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
        if (dogruMu) s.dogruSayisi += 1;
        
        const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
        s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;
        await s.save();

        let kazanilanPuan = 0;

        if (dogruMu) {
            // 2. v2.0 Sınırsız Puanlama Algoritması
            let Z_katsayi = s.guncelZorluk || 10;
            let GE = 0.05; 
            
            // Ders bazlı dinamik gelişim katsayısı hesaplama
            const ds = await Soru.find({ ders: s.ders, cozulmeSayisi: { $gt: 0 } });
            if (ds.length > 1) {
                const bo = ds.map(x => (x.dogruSayisi / x.cozulmeSayisi) * 100);
                const su = ds.map(x => x.ortalamaSure || 0);
                const mB = bo.reduce((a, b) => a + b, 0) / bo.length;
                const sB = Math.sqrt(bo.reduce((a, b) => a + Math.pow(b - mB, 2), 0) / bo.length) || 1;
                const mS = su.reduce((a, b) => a + b, 0) / su.length;
                const sS = Math.sqrt(su.reduce((a, b) => a + Math.pow(b - mS, 2), 0) / su.length) || 1;
                
                const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mB) / sB;
                const zS = (s.ortalamaSure - mS) / sS;
                GE = Math.min(Math.max((Math.abs(zB) + Math.abs(zS)) / 20, 0.02), 0.10);
            }

            const T_ref = s.ortalamaSure || 60;
            const T_ogr = Math.max(parseInt(gecenSure), 1);
            
            // Logaritmik Verim Denklemi
            kazanilanPuan = Math.max(parseFloat(((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE).toFixed(2)), 0.1);
        }

        // 3. Kullanıcı Verilerini Güncelle
        k.puan += kazanilanPuan;
        k.sonKazanilanPuan = kazanilanPuan;
        k.toplamSure += parseInt(gecenSure);
        k.cozumSureleri.push({ soruId: s._id, sure: parseInt(gecenSure), kazanilanPuan: kazanilanPuan });
        k.soruIndex += 1;
        await k.save();

        // 4. v2.0 Görünürlük Ekranı: "Tebrikler/Sonuç" sayfası
        res.send(`
            <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;">
                <div style="background:white; padding:40px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); text-align:center; max-width:400px; width:90%;">
                    <div style="font-size:60px; margin-bottom:10px;">${dogruMu ? '🎉' : '😕'}</div>
                    <h2 style="color:${dogruMu ? '#34a853' : '#ea4335'};">${dogruMu ? 'Doğru Cevap!' : 'Yanlış Cevap'}</h2>
                    
                    <div style="margin:20px 0; padding:20px; background:#f8f9fa; border-radius:15px;">
                        <p style="margin:0; color:#666;">Bu Sorudan Kazanılan</p>
                        <div style="font-size:32px; font-weight:bold; color:#1a73e8;">+${kazanilanPuan.toFixed(2)}</div>
                        <p style="margin:0; font-size:12px; color:#999;">Sınırsız Karmaşıklık Puanı</p>
                    </div>

                    <div style="display:flex; justify-content:space-around; margin-bottom:25px; color:#555; font-size:14px;">
                        <span>⏱️ ${gecenSure} saniye</span>
                        <span>💎 Toplam: ${k.puan.toFixed(2)}</span>
                    </div>

                    <a href="/panel/${encodeURIComponent(k.kullaniciAdi)}?basla=true" style="display:block; padding:15px; background:#1a73e8; color:white; text-decoration:none; border-radius:10px; font-weight:bold;">SIRADAKİ SORUYA GEÇ</a>
                </div>
            </div>
        `);

    } catch (err) { res.status(500).send("Hata: " + err.message); }
});
// --- KAYIT VE ADMIN YÖNETİMİ (v2.0 Sınırsız Veri Takibi) ---

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, sinif, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        await new Kullanici({ kullaniciAdi, sifre, sinif, il, ilce, okul }).save();
        res.send("<script>alert('v2.0 Dünyasına Hoş Geldin!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Giriş başarısız!'); window.history.back();</script>");
    res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi));
});

app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Yetki Gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        const tumSorular = await Soru.find().sort({ guncelZorluk: -1 }); // En zor sorular en üstte
        const mod = req.query.mod || 'soruListesi';

        let icerik = "";
        if (mod === 'soruListesi') {
            icerik = `
            <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                <h3 style="margin-bottom:20px; color:#202124;">Sınırsız Karmaşıklık Analiz Listesi</h3>
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                    <thead>
                        <tr style="background:#f8f9fa; text-align:left;">
                            <th style="padding:12px; border-bottom:2px solid #eee;">Ders/Konu</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Karmaşıklık Skoru</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Başarı Oranı</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Ort. Süre</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tumSorular.map(s => {
                            const basari = s.cozulmeSayisi > 0 ? ((s.dogruSayisi / s.cozulmeSayisi) * 100).toFixed(1) : 0;
                            return `
                            <tr>
                                <td style="padding:12px; border-bottom:1px solid #eee;"><b>[${s.ders}]</b><br>${s.konu}</td>
                                <td style="padding:12px; border-bottom:1px solid #eee; color:#1a73e8; font-weight:bold;">💎 ${s.guncelZorluk.toFixed(2)}</td>
                                <td style="padding:12px; border-bottom:1px solid #eee;">%${basari} <small>(${s.cozulmeSayisi} Çözüm)</small></td>
                                <td style="padding:12px; border-bottom:1px solid #eee;">${s.ortalamaSure.toFixed(1)}s</td>
                                <td style="padding:12px; border-bottom:1px solid #eee;">
                                    <form action="/soru-sil" method="POST"><input type="hidden" name="id" value="${s._id}"><button style="color:red; background:none; border:none; cursor:pointer;">Sil</button></form>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`;
        } else if (mod === 'soruEkle') {
            icerik = `<h3>Yeni Nesil Soru Ekle</h3>
            <form action="/soru-ekle" method="POST" style="display:grid; gap:10px; max-width:600px;">
                <select name="ders" required style="padding:10px;">
                    <option>Matematik</option><option>Türkçe</option><option>Fen Bilimleri</option>
                </select>
                <input name="konu" placeholder="Konu Başlığı" required style="padding:10px;">
                <textarea name="soruMetni" placeholder="Soru Metni" style="padding:10px; height:100px;"></textarea>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <input name="metin0" placeholder="A Şıkkı" required style="padding:10px;">
                    <input name="metin1" placeholder="B Şıkkı" required style="padding:10px;">
                    <input name="metin2" placeholder="C Şıkkı" required style="padding:10px;">
                    <input name="metin3" placeholder="D Şıkkı" required style="padding:10px;">
                </div>
                <select name="dogruCevap" style="padding:10px;">
                    <option value="0">Doğru Cevap: A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>
                </select>
                <button style="padding:15px; background:#34a853; color:white; border:none; border-radius:8px; font-weight:bold;">SİSTEME KAYDET</button>
            </form>`;
        }
        res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#202124; color:white; padding:20px; box-sizing:border-box;"><h2 style="text-align:center;">🛠️ Analitik</h2><a href="/admin?mod=soruListesi" style="display:block; color:white; text-decoration:none; padding:15px; background:${mod==='soruListesi'?'#3c4043':''};">📋 Soru Analizi</a><a href="/admin?mod=soruEkle" style="display:block; color:white; text-decoration:none; padding:15px; background:${mod==='soruEkle'?'#3c4043':''};">➕ Soru Ekle</a><hr><a href="/" style="color:#ffcccc; text-decoration:none;">Çıkış</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
    } else { res.status(401).send('Yetkisiz Erişim!'); }
});

app.post('/soru-ekle', async (req, res) => {
    try {
        await new Soru({ ...req.body, secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
        res.redirect('/admin?mod=soruListesi');
    } catch (e) { res.send(e.message); }
});

app.post('/soru-sil', async (req, res) => {
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin?mod=soruListesi');
});

app.listen(PORT, () => console.log(`🚀 v2.0 Yayında! Port: ${PORT}`));
