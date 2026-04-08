// --- LGS HAZIRLIK PLATFORMU - VERSİYON 2.1 (Sınırsız Görünürlük & Tam Tasarım) ---
const mongoose = require('mongoose');
const express = require('express');
const cron = require('node-cron');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ v2.1 Sistem Aktif")).catch(err => console.error("❌ Veritabanı:", err.message));

// --- MODELLER ---
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
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    guncelZorluk: { type: Number, default: 10 }
}));
// --- GÜNLÜK SINIRSIZ SKOR HESAPLAMA (05:00 AM) - v2.0 İle %100 Aynı Mantık ---
cron.schedule('0 5 * * *', async () => {
    try {
        const tumSorular = await Soru.find({ cozulmeSayisi: { $gt: 0 } });
        const dersler = [...new Set(tumSorular.map(s => s.ders))];
        
        for (const ders of dersler) {
            const ds = tumSorular.filter(s => s.ders === ders);
            if (ds.length > 1) {
                // Başarı oranları ve sürelerin listelenmesi
                const bo = ds.map(s => (s.dogruSayisi / s.cozulmeSayisi) * 100);
                const su = ds.map(s => s.ortalamaSure || 0);
                
                // Ortalama ve Standart Sapma Hesaplamaları (Z-Score İçin)
                const mB = bo.reduce((a, b) => a + b, 0) / bo.length;
                const sB = Math.sqrt(bo.reduce((a, b) => a + Math.pow(b - mB, 2), 0) / bo.length) || 1;
                const mS = su.reduce((a, b) => a + b, 0) / su.length;
                const sS = Math.sqrt(su.reduce((a, b) => a + Math.pow(b - mS, 2), 0) / su.length) || 1;

                for (const s of ds) {
                    // Sorunun global başarısındaki sapma (zB) ve süresindeki sapma (zS)
                    const zB = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mB) / sB;
                    const zS = (s.ortalamaSure - mS) / sS;
                    
                    // Gelişim Katsayısı (GE): Sapmaların şiddetine göre 0.02 - 0.10 arası ağırlık
                    const GE = Math.min(Math.max((Math.abs(zB) + Math.abs(zS)) / 20, 0.02), 0.10);
                    
                    // v2.1 Karmaşıklık Formülü: Negatif zB (düşük başarı) ve Pozitif zS (yüksek süre) skoru ucu açık artırır.
                    const hamSkor = ((zS * 10) - (zB * 10)) * (GE * 100);
                    s.guncelZorluk = Math.max(parseFloat((20 + hamSkor).toFixed(2)), 1); 
                    await s.save();
                }
            }
        }
        console.log("✅ Günlük Sınırsız Soru Skorları Başarıyla Güncellendi.");
    } catch (err) { 
        console.error("❌ Karmaşıklık Motoru Hatası:", err.message); 
    }
});
// --- GİRİŞ, KAYIT VE ÖĞRENCİ PANELİ (v2.0 Tasarımı Tam Koruma) ---

app.get('/', (req, res) => {
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;"><div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;"><h2 style="color:#1a73e8;">LGS Hazırlık v2.1</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div></div>`);
});

app.get('/kayit', (req, res) => {
    const iller = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif; padding:20px;"><div style="background:white; padding:30px; border-radius:15px; width:450px;"><h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt</h2><form action="/kayit-yap" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><select name="sinif" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${s === 8 ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select><select name="il" id="ilSelect" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İl Seçiniz...</option>${iller.map(il => `<option value="${il}">${il}</option>`).join('')}</select><input name="okul" placeholder="Okulunuzun Adı" required style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDI TAMAMLA</button></form></div></div>`);
});

app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const mod = req.query.mod || 'soru';

    let icerik = "";
    if (mod === 'profil') {
        let verimlilik = k.soruIndex > 0 ? (k.puan / k.soruIndex).toFixed(2) : 0;
        icerik = `<div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><h2 style="color:#1a73e8;">Kişisel Başarı Raporu</h2><div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;"><div style="background:#e8f0fe; padding:15px; border-radius:10px;"><small>Toplam Sınırsız Puan</small><div style="font-size:24px; font-weight:bold; color:#1967d2;">${k.puan.toLocaleString()}</div></div><div style="background:#e6ffed; padding:15px; border-radius:10px;"><small>Verimlilik Skoru</small><div style="font-size:24px; font-weight:bold; color:#188038;">${verimlilik}</div></div></div><p style="margin-top:20px;"><b>Okul:</b> ${k.okul}</p><p><b>Son Kazanılan Puan:</b> <span style="color:#e67e22; font-weight:bold;">+${k.sonKazanilanPuan.toFixed(2)}</span></p></div>`;
    } else {
        const sorular = await Soru.find();
        if (!sorular.length) {
            icerik = `<div style="text-align:center; margin-top:50px;"><h2>Soru bulunamadı.</h2></div>`;
        } else if (!req.query.basla) {
            icerik = `<div style="text-align:center; margin-top:100px;"><h1 style="color:#1a73e8;">Hoş Geldin, ${k.kullaniciAdi}!</h1><p>Sınırsız Karmaşıklık Motoru yeni bir soru hazırladı.</p><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="display:inline-block; padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold; font-size:18px;">BAŞLA</a></div>`;
        } else {
            const soru = sorular[k.soruIndex % sorular.length];
            const sSkor = soru.guncelZorluk || 10;
            icerik = `<div style="max-width:800px; margin:auto; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.1); overflow:hidden;"><div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:bold; color:#5f6368;">${soru.ders} - ${soru.konu}</span><span style="background:#fff7e6; color:#d48806; padding:4px 12px; border-radius:15px; font-weight:bold; border:1px solid #ffe58f;">💎 Potansiyel Puan: ${sSkor.toFixed(2)}</span></div><div style="padding:25px;"><p style="font-size:18px; line-height:1.6;">${soru.soruMetni}</p><div id="soruSure" style="text-align:right; font-weight:bold; color:#ea4335;">⏱️ 0s</div><form action="/cevap" method="POST" id="cevapForm"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="gecenSure" id="gecenSure" value="0"><div style="display:grid; gap:10px; margin-top:20px;">${soru.secenekler.map((s, i) => `<button name="secilenIndex" value="${i}" style="padding:15px; text-align:left; border:2px solid #eee; border-radius:8px; background:white; cursor:pointer; font-size:16px;"><b>${["A","B","C","D"][i]})</b> ${s.metin}</button>`).join('')}</div></form></div></div><script>let sn=0; setInterval(()=>{sn++; document.getElementById('soruSure').innerText='⏱️ '+sn+'s'; document.getElementById('gecenSure').value=sn;},1000);</script>`;
        }
    }
    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#1a73e8; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">LGS PRO v2.1</h2><a href="/panel/${k.kullaniciAdi}?mod=soru" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soru'?'#1557b0':''};">📖 Sınırsız Soru</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='profil'?'#1557b0':''};">📊 Başarı Analizi</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
});
// --- CEVAP İŞLEME VE SINIRSIZ SONUÇ EKRANI (v2.0 Tasarımı Tam Koruma) ---

app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        
        if (!s || !k) return res.redirect('/');

        s.cozulmeSayisi += 1;
        const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
        if (dogruMu) s.dogruSayisi += 1;
        
        const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
        s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;
        await s.save();

        let kazanilanPuan = 0;
        if (dogruMu) {
            // v2.0 Sınırsız Puanlama Algoritması
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
            // v2.0 Logaritmik Verim Denklemi
            kazanilanPuan = Math.max(parseFloat(((Z_katsayi * T_ref * Math.log2(1 + (T_ref / T_ogr))) * GE).toFixed(2)), 0.1);
        }

        k.puan += kazanilanPuan;
        k.sonKazanilanPuan = kazanilanPuan;
        k.toplamSure += parseInt(gecenSure);
        k.cozumSureleri.push({ soruId: s._id, sure: parseInt(gecenSure), kazanilanPuan: kazanilanPuan });
        k.soruIndex += 1;
        await k.save();

        // v2.0 Sonuç Ekranı Tasarımı
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
// --- ADMIN PANELI (v2.1: Sınırsız Veri Takibi & Düzenleme Entegrasyonu) ---

app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Yetki Gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        let editSoru = null; 
        if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);
        
        const tumSorular = await Soru.find().sort({ guncelZorluk: -1 });
        const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');

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
                                <td style="padding:12px; border-bottom:1px solid #eee; display:flex; gap:10px; align-items:center;">
                                    <!-- v2.1: Düzenle Butonu Entegrasyonu -->
                                    <a href="/admin?duzenle=${s._id}&mod=soruEkle" style="color:#1a73e8; font-weight:bold; text-decoration:none; font-size:12px; border:1px solid #1a73e8; padding:4px 8px; border-radius:4px;">DÜZENLE</a>
                                    
                                    <form action="/soru-sil" method="POST" style="margin:0;">
                                        <input type="hidden" name="id" value="${s._id}">
                                        <button style="color:red; background:none; border:1px solid red; border-radius:4px; padding:4px 8px; cursor:pointer; font-weight:bold; font-size:12px;">SİL</button>
                                    </form>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`;
        } else if (mod === 'soruEkle') {
            icerik = `
            <div style="background:white; padding:25px; border-radius:12px;">
                <h3 style="color:#202124;">${editSoru ? '💎 Soruyu Güncelle' : '➕ Yeni Nesil Soru Ekle'}</h3>
                <form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST" style="display:grid; gap:12px; max-width:600px;">
                    ${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <input name="ders" value="${editSoru ? editSoru.ders : ''}" placeholder="Ders (Matematik, Türkçe...)" required style="padding:12px; border:1px solid #ddd; border-radius:6px;">
                        <input name="konu" value="${editSoru ? editSoru.konu : ''}" placeholder="Konu Başlığı" required style="padding:12px; border:1px solid #ddd; border-radius:6px;">
                    </div>
                    <textarea name="soruMetni" placeholder="Soru Metni" required style="padding:12px; border:1px solid #ddd; border-radius:6px; height:120px; font-family:sans-serif;">${editSoru ? editSoru.soruMetni : ''}</textarea>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        ${[0,1,2,3].map(i => `
                            <input name="metin${i}" value="${editSoru ? editSoru.secenekler[i].metin : ''}" placeholder="${String.fromCharCode(65+i)} Şıkkı Metni" required style="padding:10px; border:1px solid #ddd; border-radius:6px;">
                        `).join('')}
                    </div>
                    <select name="dogruCevap" style="padding:12px; border:1px solid #ddd; border-radius:6px; background:#fff;">
                        ${[0,1,2,3].map(i => `<option value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'selected' : ''}>Doğru Cevap: ${String.fromCharCode(65+i)}</option>`).join('')}
                    </select>
                    <button style="padding:15px; background:#34a853; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:16px;">${editSoru ? 'DEĞİŞİKLİKLERİ KAYDET' : 'SORUYU SİSTEME EKLE'}</button>
                </form>
            </div>`;
        }
        res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#202124; color:white; padding:20px; box-sizing:border-box;"><h2 style="text-align:center; margin-bottom:30px;">🛠️ Analitik</h2><a href="/admin?mod=soruListesi" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; margin-bottom:10px; background:${mod==='soruListesi'?'#3c4043':''};">📋 Soru Analizi</a><a href="/admin?mod=soruEkle" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soruEkle'?'#3c4043':''};">➕ Soru Ekle</a><hr style="margin:20px 0; opacity:0.2;"><a href="/" style="color:#ffcccc; text-decoration:none; padding:10px; display:block;">Çıkış Yap</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
    } else { res.status(401).send('Yetkisiz Erişim!'); }
});

app.post('/soru-guncelle', async (req, res) => {
    try {
        const { id, ders, konu, soruMetni, dogruCevap } = req.body;
        await Soru.findByIdAndUpdate(id, { 
            ders, konu, soruMetni, 
            secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }], 
            dogruCevapIndex: parseInt(dogruCevap) 
        });
        res.redirect('/admin?mod=soruListesi');
    } catch (e) { res.status(500).send("Güncelleme Hatası: " + e.message); }
});

app.post('/soru-ekle', async (req, res) => {
    try {
        await new Soru({ ...req.body, secenekler: [{ metin: req.body.metin0 }, { metin: req.body.metin1 }, { metin: req.body.metin2 }, { metin: req.body.metin3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
        res.redirect('/admin?mod=soruListesi');
    } catch (e) { res.status(500).send("Ekleme Hatası: " + e.message); }
});

app.post('/soru-sil', async (req, res) => { 
    await Soru.findByIdAndDelete(req.body.id); 
    res.redirect('/admin?mod=soruListesi'); 
});

app.listen(PORT, () => console.log(`🚀 v2.1 Sınırsız Görünürlük Sistemi Yayında!`));
