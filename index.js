// --- LGS HAZIRLIK PLATFORMU - VERSİYON 2.1 (v1.7 Form Yapısı Entegre Edildi) ---
const mongoose = require('mongoose');
const express = require('express');
const cron = require('node-cron');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ v2.1 (Form v1.7) Aktif")).catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER (v1.7'nin tüm alanları geri getirildi) ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    sonKazanilanPuan: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number, kazanilanPuan: Number, tarih: { type: Date, default: Date.now } }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, 
    soruOnculu: String, // v1.7'den geri gelen alan
    soruMetni: String, 
    soruResmi: String,  // v1.7'den geri gelen alan
    secenekler: [
        { metin: String, gorsel: String } // v1.7 görsel desteği
    ],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    guncelZorluk: { type: Number, default: 10 }
}));
// --- GÜNLÜK SINIRSIZ SKOR HESAPLAMA (05:00 AM) - v2.1 Mekanizması Tam Koruma ---
cron.schedule('0 5 * * *', async () => {
    try {
        // Sadece en az 1 kez çözülmüş soruları analize al
        const tumSorular = await Soru.find({ cozulmeSayisi: { $gt: 0 } });
        const dersler = [...new Set(tumSorular.map(s => s.ders))];
        
        for (const ders of dersler) {
            const ds = tumSorular.filter(s => s.ders === ders);
            if (ds.length > 1) {
                // İstatistiksel veri setlerini oluştur
                const bo = ds.map(s => (s.dogruSayisi / s.cozulmeSayisi) * 100);
                const su = ds.map(s => s.ortalamaSure || 0);
                
                // Matematiksel Ortalamalar
                const mB = bo.reduce((a, b) => a + b, 0) / bo.length;
                const mS = su.reduce((a, b) => a + b, 0) / su.length;
                
                // Standart Sapma Hesaplamaları
                const sB = Math.sqrt(bo.reduce((a, b) => a + Math.pow(b - mB, 2), 0) / bo.length) || 1;
                const sS = Math.sqrt(su.reduce((a, b) => a + Math.pow(b - mS, 2), 0) / su.length) || 1;

                for (const s of ds) {
                    // Z-Skoru Analizi: Başarı (zB) ve Süre (zS)
                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mB) / sB;
                    const zS = (s.ortalamaSure - mS) / sS;
                    
                    // Gelişim Katsayısı (GE): Dinamik zorluk esnekliği
                    const GE = Math.min(Math.max((Math.abs(zB) + Math.abs(zS)) / 20, 0.02), 0.10);
                    
                    // v2.1 Karmaşıklık Formülü: Skor ucu açık ve sınırsızdır.
                    const hamSkor = ((zS * 10) - (zB * 10)) * (GE * 100);
                    s.guncelZorluk = Math.max(parseFloat((20 + hamSkor).toFixed(2)), 1); 
                    await s.save();
                }
            }
        }
        console.log("✅ Sınırsız Karmaşıklık Analizi Tamamlandı.");
    } catch (err) { 
        console.error("❌ Motor Hatası:", err.message); 
    }
});
// --- ÖĞRENCİ PANELİ VE GÖRSEL DESTEKLİ SORU EKRANI (v1.7 & v2.1 Hibrit) ---

app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const mod = req.query.mod || 'soru';

    let icerik = "";
    if (mod === 'profil') {
        let verimlilik = k.soruIndex > 0 ? (k.puan / k.soruIndex).toFixed(2) : 0;
        icerik = `<div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><h2 style="color:#1a73e8;">Başarı Raporu</h2><div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;"><div style="background:#e8f0fe; padding:15px; border-radius:10px;"><small>Toplam Sınırsız Puan</small><div style="font-size:24px; font-weight:bold; color:#1967d2;">${k.puan.toLocaleString()}</div></div><div style="background:#e6ffed; padding:15px; border-radius:10px;"><small>Verimlilik</small><div style="font-size:24px; font-weight:bold; color:#188038;">${verimlilik}</div></div></div><p style="margin-top:20px;"><b>Okul:</b> ${k.okul}</p><p><b>Son Kazanılan:</b> <span style="color:#e67e22; font-weight:bold;">+${k.sonKazanilanPuan.toFixed(2)}</span></p></div>`;
    } else {
        const sorular = await Soru.find();
        if (!sorular.length) {
            icerik = `<h2>Soru bulunamadı.</h2>`;
        } else if (!req.query.basla) {
            icerik = `<div style="text-align:center; margin-top:100px;"><h1 style="color:#1a73e8;">Hazır mısın?</h1><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="display:inline-block; padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold;">BAŞLA</a></div>`;
        } else {
            const soru = sorular[k.soruIndex % sorular.length];
            const sSkor = soru.guncelZorluk || 10;
            
            icerik = `
            <div style="max-width:800px; margin:auto; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.1); overflow:hidden;">
                <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#5f6368;">${soru.ders} - ${soru.konu}</span>
                    <span style="background:#fff7e6; color:#d48806; padding:4px 12px; border-radius:15px; font-weight:bold; border:1px solid #ffe58f;">💎 Değer: ${sSkor.toFixed(2)}</span>
                </div>
                <div style="padding:25px;">
                    <!-- v1.7 Öncül ve Soru Resmi -->
                    ${soru.soruOnculu ? `<div style="background:#f1f3f4; padding:15px; border-radius:8px; margin-bottom:15px; font-style:italic;">${soru.soruOnculu}</div>` : ''}
                    ${soru.soruResmi ? `<img src="${soru.soruResmi}" style="max-width:100%; border-radius:8px; margin-bottom:15px; display:block; margin-left:auto; margin-right:auto;">` : ''}
                    
                    <p style="font-size:18px; font-weight:bold; line-height:1.6;">${soru.soruMetni}</p>
                    <div id="soruSure" style="text-align:right; font-weight:bold; color:#ea4335; margin-bottom:10px;">⏱️ 0s</div>
                    
                    <form action="/cevap" method="POST" id="cevapForm">
                        <input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}">
                        <input type="hidden" name="soruId" value="${soru._id}">
                        <input type="hidden" name="gecenSure" id="gecenSure" value="0">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                            ${soru.secenekler.map((s, i) => `
                                <button name="secilenIndex" value="${i}" style="padding:15px; text-align:left; border:2px solid #eee; border-radius:10px; background:white; cursor:pointer;">
                                    <b>${["A","B","C","D"][i]})</b> ${s.metin}
                                    ${s.gorsel ? `<br><img src="${s.gorsel}" style="max-width:100%; margin-top:10px; border-radius:5px;">` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </form>
                </div>
            </div>
            <script>let sn=0; setInterval(()=>{sn++; document.getElementById('soruSure').innerText='⏱️ '+sn+'s'; document.getElementById('gecenSure').value=sn;},1000);</script>`;
        }
    }
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#1a73e8; color:white; padding:20px; box-sizing:border-box;"><h2 style="text-align:center;">LGS v2.1+</h2><a href="/panel/${k.kullaniciAdi}?mod=soru" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soru'?'#1557b0':''};">📖 Soru Çöz</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='profil'?'#1557b0':''};">📊 Profilim</a><hr style="opacity:0.3;"><a href="/" style="color:#ffcccc; text-decoration:none; padding:15px; display:block;">Çıkış</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
});
// --- PUANLAMA VE SONUÇ EKRANI (v2.1 Hassasiyet ve v1.7 Görsellik Uyumu) ---

app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        
        if (!s || !k) return res.redirect('/');

        // 1. İstatistikleri Güncelle
        s.cozulmeSayisi += 1;
        const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
        if (dogruMu) s.dogruSayisi += 1;
        
        const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
        s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;
        await s.save();

        let kazanilanPuan = 0;
        if (dogruMu) {
            // 2. v2.1 Sınırsız Puanlama Algoritması (Z-Score & Logaritma)
            let Z_katsayi = s.guncelZorluk || 10;
            let GE = 0.05; 
            
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
            
            // v2.1 Logaritmik Verim Hesabı
            kazanilanPuan = Math.max(parseFloat(((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE).toFixed(2)), 0.1);
        }

        // 3. Kullanıcı Verilerini Güncelle
        k.puan += kazanilanPuan;
        k.sonKazanilanPuan = kazanilanPuan;
        k.toplamSure += parseInt(gecenSure);
        k.cozumSureleri.push({ soruId: s._id, sure: parseInt(gecenSure), kazanilanPuan: kazanilanPuan });
        k.soruIndex += 1;
        await k.save();

        // 4. v2.1 Şeffaf Sonuç Ekranı
        res.send(`
            <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;">
                <div style="background:white; padding:40px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); text-align:center; max-width:400px; width:90%;">
                    <div style="font-size:60px; margin-bottom:10px;">${dogruMu ? '🚀' : '📚'}</div>
                    <h2 style="color:${dogruMu ? '#34a853' : '#ea4335'};">${dogruMu ? 'Harika, Doğru!' : 'Bir Sonrakine Odaklan'}</h2>
                    
                    <div style="margin:20px 0; padding:20px; background:#f8f9fa; border-radius:15px; border:1px solid #eee;">
                        <p style="margin:0; color:#666; font-size:14px;">Kazanılan Sınırsız Skor</p>
                        <div style="font-size:36px; font-weight:bold; color:#1a73e8;">+${kazanilanPuan.toFixed(2)}</div>
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-bottom:25px; color:#555; font-size:13px; background:#fff; padding:10px; border-radius:8px;">
                        <span>⏱️ <b>${gecenSure}s</b> Süre</span>
                        <span>💎 Toplam: <b>${k.puan.toFixed(2)}</b></span>
                    </div>

                    <a href="/panel/${encodeURIComponent(k.kullaniciAdi)}?basla=true" style="display:block; padding:16px; background:#1a73e8; color:white; text-decoration:none; border-radius:12px; font-weight:bold; transition: 0.3s; box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);">SIRADAKİ SORUYA GEÇ</a>
                </div>
            </div>
        `);

    } catch (err) { res.status(500).send("Hata: " + err.message); }
});
// --- ADMIN PANELI (v1.7 Giriş Alanları & v2.1 Düzenleme Yeteneği) ---

app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş Gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        let editSoru = null; 
        if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);
        
        const tumSorular = await Soru.find().sort({ guncelZorluk: -1 });
        const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');

        let icerik = "";
        if (mod === 'soruListesi') {
            icerik = `<div style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05);"><h3>Sınırsız Analiz Listesi</h3><table style="width:100%; border-collapse:collapse; font-size:14px;"><thead><tr style="background:#f8f9fa; text-align:left;"><th style="padding:12px;">Ders/Konu</th><th style="padding:12px;">Skor</th><th style="padding:12px;">Başarı</th><th style="padding:12px;">İşlem</th></tr></thead><tbody>${tumSorular.map(s => `<tr><td style="padding:12px; border-bottom:1px solid #eee;"><b>[${s.ders}]</b><br>${s.konu}</td><td style="padding:12px; border-bottom:1px solid #eee; color:#1a73e8; font-weight:bold;">💎 ${s.guncelZorluk.toFixed(2)}</td><td style="padding:12px; border-bottom:1px solid #eee;">%${s.cozulmeSayisi > 0 ? ((s.dogruSayisi / s.cozulmeSayisi) * 100).toFixed(1) : 0}</td><td style="padding:12px; border-bottom:1px solid #eee; display:flex; gap:10px;"><a href="/admin?duzenle=${s._id}&mod=soruEkle" style="color:#1a73e8; font-weight:bold; text-decoration:none; border:1px solid #1a73e8; padding:4px 8px; border-radius:4px;">DÜZENLE</a><form action="/soru-sil" method="POST" style="margin:0;"><input type="hidden" name="id" value="${s._id}"><button style="color:red; background:none; border:1px solid red; border-radius:4px; padding:4px 8px; cursor:pointer; font-weight:bold;">SİL</button></form></td></tr>`).join('')}</tbody></table></div>`;
        } else if (mod === 'soruEkle') {
            icerik = `
            <div style="background:white; padding:25px; border-radius:12px;">
                <h3>${editSoru ? '💎 Soruyu Güncelle' : '➕ v1.7 Tipi Detaylı Soru Ekle'}</h3>
                <form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST" style="display:grid; gap:10px; max-width:700px;">
                    ${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                        <input name="sinif" value="${editSoru ? editSoru.sinif : '8'}" placeholder="Sınıf" required style="padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <input name="ders" value="${editSoru ? editSoru.ders : ''}" placeholder="Ders" required style="padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <input name="konu" value="${editSoru ? editSoru.konu : ''}" placeholder="Konu" required style="padding:10px; border:1px solid #ddd; border-radius:6px;">
                    </div>
                    <textarea name="soruOnculu" placeholder="Soru Öncülü (v1.7)" style="padding:10px; border:1px solid #ddd; border-radius:6px; height:60px;">${editSoru ? (editSoru.soruOnculu || '') : ''}</textarea>
                    <input name="soruResmi" value="${editSoru ? (editSoru.soruResmi || '') : ''}" placeholder="Soru Resim URL (v1.7)" style="padding:10px; border:1px solid #ddd; border-radius:6px;">
                    <textarea name="soruMetni" placeholder="Soru Metni" required style="padding:10px; border:1px solid #ddd; border-radius:6px; height:80px;">${editSoru ? editSoru.soruMetni : ''}</textarea>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f9f9f9; padding:10px; border-radius:8px;">
                        ${[0,1,2,3].map(i => `
                            <div style="border:1px solid #eee; padding:5px;">
                                <input name="metin${i}" value="${editSoru ? editSoru.secenekler[i].metin : ''}" placeholder="${String.fromCharCode(65+i)} Şıkkı Metni" required style="width:100%; padding:8px; margin-bottom:5px; box-sizing:border-box;">
                                <input name="gorsel${i}" value="${editSoru ? (editSoru.secenekler[i].gorsel || '') : ''}" placeholder="${String.fromCharCode(65+i)} Resim URL" style="width:100%; padding:8px; box-sizing:border-box;">
                            </div>
                        `).join('')}
                    </div>
                    
                    <select name="dogruCevap" style="padding:12px; border:1px solid #ddd; border-radius:6px;">
                        ${[0,1,2,3].map(i => `<option value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'selected' : ''}>Doğru Cevap: ${String.fromCharCode(65+i)}</option>`).join('')}
                    </select>
                    <button style="padding:15px; background:#34a853; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">${editSoru ? 'DEĞİŞİKLİKLERİ KAYDET' : 'DETAYLI SORUYU EKLE'}</button>
                </form>
            </div>`;
        }
        res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#202124; color:white; padding:20px; box-sizing:border-box;"><h2 style="text-align:center;">🛠️ Admin</h2><a href="/admin?mod=soruListesi" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soruListesi'?'#3c4043':''};">📋 Analiz Listesi</a><a href="/admin?mod=soruEkle" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soruEkle'?'#3c4043':''};">➕ Soru Ekle</a><hr><a href="/" style="color:#ffcccc; text-decoration:none; padding:10px; display:block;">Çıkış</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
    } else { res.status(401).send('Yetki Yok!'); }
});

app.post('/soru-guncelle', async (req, res) => {
    const { id, sinif, ders, konu, soruOnculu, soruResmi, soruMetni, dogruCevap } = req.body;
    await Soru.findByIdAndUpdate(id, { sinif, ders, konu, soruOnculu, soruResmi, soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(dogruCevap) });
    res.redirect('/admin?mod=soruListesi');
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({ ...req.body, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

app.post('/soru-sil', async (req, res) => { await Soru.findByIdAndDelete(req.body.id); res.redirect('/admin?mod=soruListesi'); });
app.listen(PORT, () => console.log(`🚀 v2.1 (v1.7 Formuyla) Yayında!`));
