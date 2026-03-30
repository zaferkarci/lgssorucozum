const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI (Kendi linkini buraya yapıştır!)
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/?appName=lgssorucozum";

mongoose.connect(dbURI).then(() => console.log("✅ Bağlantı Tamam")).catch(err => console.log("❌ Hata:", err.message));

// 2. MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({ kullaniciAdi: String, sifre: String }));
const Soru = mongoose.model('Soru', new mongoose.Schema({ 
    ders: String, 
    soruMetni: String, 
    secenekler: [String], 
    dogruCevap: String 
}));

// 3. ANA SAYFA VE PROFİL (Giriş Sonrası)
app.get('/', (req, res) => { /* Giriş Sayfası Kodun Buraya */ });
app.get('/profil/:isim', (req, res) => {
    const isim = req.params.isim;
    res.send(`
        <div style="text-align:center; padding-top:100px; font-family:sans-serif;">
            <h1>Merhaba, ${isim}! 👋</h1>
            <p>8. Sınıf LGS Matematik soruları seni bekliyor.</p>
            <a href="/soru-havuzu" style="background:#007bff; color:white; padding:20px; border-radius:15px; text-decoration:none; font-weight:bold; font-size:22px; display:inline-block;">🔍 MATEMATİK SORULARINI ÇÖZ</a>
        </div>
    `);
});

// 4. LGS MATEMATİK SORU EKRANI
app.get('/soru-havuzu', async (req, res) => {
    // Veritabanından rastgele 1 tane Matematik sorusu getirir
    const sorular = await Soru.find({ ders: "Matematik" });
    const soru = sorular[Math.floor(Math.random() * sorular.length)];

    if (!soru) return res.send("<h1>📚 Henüz Matematik sorusu yüklenmemiş!</h1><a href='/matematik-yukle'>Buraya Tıkla ve Soruları Yükle</a>");

    res.send(`
        <div style="max-width:600px; margin:50px auto; font-family:sans-serif; border:2px solid #007bff; padding:30px; border-radius:20px; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.1);">
            <span style="background:#007bff; color:white; padding:5px 15px; border-radius:20px; font-size:12px;">8. SINIF LGS MATEMATİK</span>
            <h2 style="margin-top:20px; line-height:1.5;">${soru.soruMetni}</h2>
            <div style="margin-top:30px;">
                ${soru.secenekler.map(s => `
                    <button onclick="cevapKontrol('${s}', '${soru.dogruCevap}')" 
                    style="display:block; width:100%; margin:10px 0; padding:15px; cursor:pointer; border:1px solid #ddd; border-radius:10px; background:white; font-size:18px; font-weight:bold;">
                        ${s}
                    </button>
                `).join('')}
            </div>
            <script>
                function cevapKontrol(secilen, dogru) {
                    if(secilen === dogru) { alert('✅ TEBRİKLER! DOĞRU CEVAP.'); location.reload(); }
                    else { alert('❌ MAALESEF YANLIŞ. TEKRAR DENE!'); }
                }
            </script>
            <br><a href="/profil/ogrenci" style="color:gray; text-decoration:none;">⬅ Profilime Dön</a>
        </div>
    `);
});

// 5. MATEMATİK SORULARINI VERİTABANINA YÜKLEME (SADECE BİR KEZ ÇALIŞTIR)
app.get('/matematik-yukle', async (req, res) => {
    const lgsSorulari = [
        { ders: "Matematik", soruMetni: "48 ve 72 sayılarının en büyük ortak böleni (EBOB) kaçtır?", secenekler: ["12", "24", "36", "48"], dogruCevap: "24" },
        { ders: "Matematik", soruMetni: "√144 + √25 işleminin sonucu kaçtır?", secenekler: ["13", "15", "17", "19"], dogruCevap: "17" },
        { ders: "Matematik", soruMetni: "2 üzeri 5 (2⁵) ifadesinin değeri kaçtır?", secenekler: ["16", "32", "64", "128"], dogruCevap: "32" }
    ];
    await Soru.insertMany(lgsSorulari);
    res.send("<h1>✅ LGS Matematik soruları başarıyla yüklendi!</h1><a href='/soru-havuzu'>Hemen Çözmeye Başla</a>");
});

app.listen(process.env.PORT || 3000);
