// --- LGS HAZIRLIK PLATFORMU - VERSİYON 4.3.8 (Modüler Yapı) ---
// v4.3.8 değişiklikleri (v4.3.7 hatasını düzeltir + otomatik istek akışı):
//   • Kurum Üyeliği kartı doğru yere taşındı: Profil → Genel sekmesi içinde,
//     Kişisel Bilgiler'in hemen altında. v4.3.7'de Güvenlik sekmesinin dışına
//     yanlış yerleştirilmişti, hiç görünmüyordu.
//   • Otomatik istek gönderme:
//     - Yeni öğretmen kayıt olunca beyan ettiği okul kayıtlı kurumsa otomatik
//       katılma isteği oluşturulur (kullanıcı butona basmaz).
//     - Yeni kurumsal kullanıcı kayıt olunca o okuldaki mevcut öğretmenler için
//       toplu istekler oluşturulur.
//     - Lazy fix: panel açılışında eski öğretmenler için kurum varsa otomatik
//       istek oluşturulur (geçmiş kullanıcılar için).
//   • Kişisel Bilgiler kartında "Görev yaptığınız okul" alanı:
//     - İstek beklemede ise "— (kurum onayı bekleniyor)" gri italik
//     - Onaylandıysa veya hiç istek yoksa beyan ettiği okul görünür
//   • Kurum Üyeliği kartı durum durumlarına göre:
//     - Kuruma bağlı: yeşil "✓ Kuruma bağlısın"
//     - Bekleyen istek: sarı "⏳ Kurum yöneticisinin onayını bekliyor. Kurum
//       yöneticisiyle iletişime geçiniz."
//     - Reddedilmiş: kırmızı + tekrar istek butonu
//     - Kurum yok: gri "Kurumsal yönetici kayıt olunca burada bildirim düşecek"
//   • Buton metni: "Çalıştığın kuruma katılmak için istek gönder"
//   • Onaylanmadan öğretmenin istatistik görünürlüğüne dokunulmadı — öğretmen
//     sadece kendi davet ettiği öğrencileri görür (mevcut davranış aynen).
//   • Üst nav grup butonlarının renkleri düzeltildi (header beyaz arka plana
//     uygun gri-mavi metin, hover/active koyu mavi). Önceki sürümde beyaz
//     header'a beyaz metin nedeniyle metinler görünmüyordu, sadece emoji'ler
//     görünüyordu.
//   • Alt nav satırının solunda küçük grup etiketi (örn. "İÇERİK", "SİSTEM")
//     eklendi — kullanıcı hangi grupta olduğunu net görüyor.

const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// Session middleware
const session = require('express-session');
const MongoStore = require('connect-mongo');
app.use(session({
    secret: process.env.SESSION_SECRET || 'lgs-sistem-gizli-anahtar-degistir',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: dbURI, collectionName: 'sessions' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 gün
}));

// Kullanıcı oturum kontrolü middleware
function oturumKontrol(req, res, next) {
    if (!req.session || !req.session.kullaniciAdi) {
        return res.redirect('/');
    }
    next();
}
app.locals.oturumKontrol = oturumKontrol;

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/panel'));
app.use('/', require('./routes/admin'));
app.use('/', require('./routes/pdfyukle'));
app.use('/', require('./routes/takip'));

// Health check — loading.html bu endpoint'i izler
app.get('/health', (req, res) => res.json({ durum: 'hazir' }));

// Günlük cron job — her gün 05:10 (Europe/Istanbul)
const cron = require('node-cron');
const { gunlukHesapla } = require('./cronJobs');
cron.schedule('10 5 * * *', async () => {
    console.log('⏰ Cron tetiklendi (05:10 Istanbul):', new Date().toISOString());
    try {
        await gunlukHesapla();
    } catch (err) {
        console.error('❌ Cron çalıştırma hatası:', err && err.stack || err);
    }
}, { timezone: 'Europe/Istanbul' });

// Sunucu açıldıktan sonra: son hesaplama 24 saatten eskiyse otomatik tetikle
// (Render uyandırma / restart durumunda 05:10 kaçırıldıysa kurtarma)
const Kullanici = require('./models/Kullanici');
async function basladiktanSonraKontrol() {
    try {
        const sonHesap = await Kullanici.findOne({ siralamaCacheTarih: { $ne: null } })
            .sort({ siralamaCacheTarih: -1 })
            .select('siralamaCacheTarih')
            .lean();
        const simdi = new Date();
        const sonTarih = sonHesap && sonHesap.siralamaCacheTarih;
        const yas = sonTarih ? (simdi - new Date(sonTarih)) / 1000 / 60 / 60 : Infinity; // saat
        console.log('📅 Son hesaplama:', sonTarih ? new Date(sonTarih).toISOString() : 'hiç', '|', yas === Infinity ? 'ilk' : yas.toFixed(1) + ' saat önce');
        if (yas > 24) {
            console.log('⚠️ Son hesaplama 24 saatten eski — şimdi tetikleniyor');
            try { await gunlukHesapla(); } catch (e) { console.error('❌ Başlangıç hesaplama hatası:', e && e.stack || e); }
        }
    } catch (err) {
        console.error('❌ Başlangıç kontrol hatası:', err && err.message || err);
    }
}
// 30 sn gecikmeyle çalıştır — sunucu tamamen ayağa kalksın
setTimeout(basladiktanSonraKontrol, 30 * 1000);

// Manuel tetikleme (admin için)
// v4.1.24: önce session kontrolü; admin paneline girişli kullanıcı tekrar
// şifre sormadan butona basabilir. Session yoksa eski Basic Auth davranışı.
app.post('/admin/cron-tetikle', async (req, res) => {
    let yetkili = req.session && req.session.adminGirisli === true;
    if (!yetkili) {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) return res.status(401).send('Yetkisiz');
        const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
        if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASSWORD) return res.status(401).send('Yetkisiz');
        if (req.session) req.session.adminGirisli = true;
        yetkili = true;
    }
    try {
        await gunlukHesapla();
        res.send('<script>alert("Hesaplama tamamlandı!"); window.location.href="/admin";</script>');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// Ünite Excel şablonu indir
app.get('/unite-sablon-indir', (req, res) => {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const veri = [
        ['Sınıf', 'Ders', 'Ünite', 'Ünite Adı', 'Alt Konu'],
        [8, 'Matematik', '1. Ünite', 'Çarpanlar ve Katlar', 'Çarpanlar ve Katlar'],
        [null, null, null, null, 'Üslü İfadeler'],
        [8, 'Matematik', '2. Ünite', 'Cebirsel İfadeler', 'Cebirsel İfadeler'],
        [null, null, null, null, 'Denklemler'],
        [8, 'Fen Bilimleri', '1. Ünite', 'Mevsimler ve İklim', 'Mevsimlerin Oluşumu'],
        [null, null, null, null, 'İklim ve Hava Hareketleri'],
        [8, 'Türkçe', '1. Ünite', 'Sözcükte Anlam', 'Sözcükte Anlam'],
        [null, null, null, null, 'Cümlede Anlam'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(veri);
    ws['!cols'] = [{wch:8},{wch:18},{wch:12},{wch:30},{wch:35}];
    XLSX.utils.book_append_sheet(wb, ws, 'Ünite ve Konular');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="unite_konular_sablonu.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));
