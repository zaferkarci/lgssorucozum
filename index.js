const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MONGODB BAĞLANTISI 
const dbURI = "mongodb+srv://zaferkarci:Uras0203@lgssorucozum.nlmudhf.mongodb.net/?appName=lgssorucozum";

mongoose.connect(dbURI, {
    serverSelectionTimeoutMS: 5000 // 5 saniye içinde bağlanamazsa hata ver, dondurma!
})
.then(() => console.log("✅ VERİTABANI BAĞLANDI!"))
.catch(err => console.log("❌ BAĞLANTI HATASI:", err.message));

// 2. MODELLER
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({ kullaniciAdi: String, sifre: String }));
const Soru = mongoose.model('Soru', new mongoose.Schema({ 
    konu: String, 
    soruMetni: String, 
    secenekler: [String], 
    dogruCevap: String 
}));

// 3. PROFİL SAYFASI
app.get('/profil/:isim', (req, res) => {
    const isim = req.params.isim;
    res.send(`
        <div style="text-align:center; padding-top:100px; font-family:sans-serif; background:#f4f4f4; height:100vh; margin:0;">
            <div style="background:white; display:inline-block; padding:40px; border-radius:20px; box-shadow:0 5px 15px rgba(0,0,0,0.1);">
                <h1>Merhaba, ${isim}! 👋</h1>
                <p>8. Sınıf LGS Matematik Kampı Başladı.</p>
                <a href="/soru-havuzu" style="background:#007bff; color:white; padding:20px 40px; border-radius:50px; text-decoration:none; font-weight:bold; font-size:22px; display:inline-block; box-shadow:0 4px 10px rgba(0,123,255,0.4);">🚀 SORULARI ÇÖZ</a>
            </div>
        </div>
    `);
});

// 4. LGS MATEMATİK SORU EKRANI (A, B, C, D Formatlı)
app.get('/soru-havuzu', async (req, res) => {
    const sorular = await Soru.find();
    const soru = sorular[Math.floor(Math.random() * sorular.length)];
    const harfler = ["A", "B", "C", "D"];

    if (!soru) return res.send("<h1>📚 Soru bulunamadı!</h1><a href='/lgs-yukle'>Soruları Yükle</a>");

    res.send(`
        <div style="max-width:600px; margin:50px auto; font-family:sans-serif; border:2px solid #007bff; padding:30px; border-radius:20px; background:white; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
            <div style="text-align:center; margin-bottom:20px;">
                <span style="background:#e7f1ff; color:#007bff; padding:5px 15px; border-radius:20px; font-weight:bold;">${soru.konu}</span>
            </div>
            <h2 style="line-height:1.6; color:#333;">${soru.soruMetni}</h2>
            <div style="margin-top:30px;">
                ${soru.secenekler.map((s, index) => `
                    <button onclick="kontrol('${s}', '${soru.dogruCevap}')" 
                    style="display:flex; align-items:center; width:100%; margin:15px 0; padding:15px; cursor:pointer; border:2px solid #eee; border-radius:12px; background:white; font-size:18px; text-align:left; transition:0.2s;">
                        <b style="background:#007bff; color:white; width:30px; height:30px; display:flex; justify-content:center; align-items:center; border-radius:50%; margin-right:15px;">${harfler[index]}</b>
                        ${s}
                    </button>
                `).join('')}
            </div>
            <script>
                function kontrol(s, d) {
                    if(s === d) { alert('✅ TEBRİKLER! DOĞRU.'); location.reload(); }
                    else { alert('❌ YANLIŞ! TEKRAR DENE.'); }
                }
            </script>
            <div style="text-align:center; margin-top:20px;">
                <a href="/profil/ogrenci" style="color:#999; text-decoration:none;">⬅ Profile Dön</a>
            </div>
        </div>
    `);
});

// 5. GENİŞLETİLMİŞ LGS MATEMATİK SORU BANKASI
app.get('/lgs-yukle', async (req, res) => {
    const yeniSorular = [
        { konu: "Çarpanlar ve Katlar", soruMetni: "Aralarında asal iki sayının EBOB'u kaçtır?", secenekler: ["0", "1", "2", "Sayılardan küçüğü"], dogruCevap: "1" },
        { konu: "Üslü İfadeler", soruMetni: "5⁻² ifadesinin değeri aşağıdakilerden hangisidir?", secenekler: ["-25", "1/10", "1/25", "25"], dogruCevap: "1/25" },
        { konu: "Kareköklü İfadeler", soruMetni: "√162 sayısı hangi iki tam sayı arasındadır?", secenekler: ["11-12", "12-13", "13-14", "14-15"], dogruCevap: "12-13" },
        { konu: "Veri Analizi", soruMetni: "Bir daire grafiğinde 360°'lik açının %25'i kaç dereceye karşılık gelir?", secenekler: ["45", "60", "90", "120"], dogruCevap: "90" },
        { konu: "Olasılık", soruMetni: "Bir zar atıldığında üst yüze gelen sayının asal sayı olma olasılığı kaçtır?", secenekler: ["1/6", "1/3", "1/2", "2/3"], dogruCevap: "1/2" }
    ];
    await Soru.deleteMany({}); // Eski test sorularını temizler
    await Soru.insertMany(yeniSorular);
    res.send("<h1>✅ Yeni Nesil LGS Soruları Yüklendi!</h1><a href='/soru-havuzu'>Hemen Başla</a>");
});

app.listen(process.env.PORT || 3000);
