// --- LGS HAZIRLIK PLATFORMU - VERSİYON 4.3.49 (Modüler Yapı) ---
// v4.3.49 değişiklikleri (MINIMUM_COZUM 50 → 5):
//   • Soru zorluk katsayısı (Z) hesabındaki örneklem ağırlığı eşiği 50'den
//     5'e düşürüldü. Az çözümlü sorularda Z artık 3'e yapışmıyor, 5 çözüm
//     sonrası gerçek zorluğa kayıyor.
//   • Etki: Küçük kitlede (şu an 7-8 öğrenci) soruların büyük çoğunluğu
//     N=5'i aştığı için Z değerleri gerçeği yansıtacak. "106 puan" gibi
//     az veriden kaynaklı uçurumlar azalır.
//   • Risk: Çok az veride (N=5-15) Z biraz dalgalanır. Stabilite N büyüdükçe
//     gelir. Mevcut kitle ölçeğinde bu kabullenilen denge.
//   • Soru Puan Detayı sayfasındaki "yapışkanlık" uyarısı da 5'e güncellendi.
//   • Değişen yerler: cronJobs.js (Z hesabı), routes/panel.js (kullanılmayan
//     zorlukGuncelle fonksiyonu — bütünlük için), routes/admin.js (uyarı eşiği).
// --- VERSİYON 4.3.48 (Modüler Yapı) ---
// v4.3.48 değişiklikleri (soru puan detayı sayfası):
//   • Admin > İçerik > 🔬 Soru Puan Detayı sayfası eklendi.
//   • En az 1 kez çözülmüş tüm soruları listeler. Her sorunun:
//     - Cron Z (zorlukKatsayisi), etiket (Kolay/Orta/Zor vs.)
//     - Ham Puan (gerçekleşmiş ortalama)
//     - N (çözüm sayısı), D (doğru sayısı), Doğru %
//     - T_ref (ortalama süre), σ_sure (sürelerin std sapması)
//     - hizBileseni, GE (puan formülü çarpanları)
//     - Örnek puan (ortalama hızdaki öğrencinin alacağı puan)
//   • Yapışkanlık uyarısı: N<50 olan soruların satırı sarı arka planda
//     gösterilir, Z değeri "3'e yakın çekilmiş olabilir" notuyla.
//   • Filtreler: ders, sınıf, zorluk aralığı (URL parametreleriyle).
//   • HİÇBİR VERİYİ DEĞİŞTİRMEZ — salt-okunur.
// --- VERSİYON 4.3.47 (Modüler Yapı) ---
// v4.3.47 değişiklikleri (puan simülasyonu — gerçek sıralama mantığı):
//   • v4.3.45/46'da simülasyon "tüm öğrencileri" toplam puana göre
//     sıralıyordu. Bu, gerçek Türkiye sıralamasıyla aynı değildi.
//   • Düzeltme:
//     - Sadece nitelikli (≥10 doğru cevap) öğrenciler sıralanır
//     - Sıralama kriteri "ortToplam" (ders puanlarının ortalamalarının
//       toplamı) — cron'daki gerçek mantıkla birebir
//   • Nitelikli olmayanlar tabloda "NİTELİKSİZ" rozeti ile gösterilir,
//     sıra hücresi boş (—).
//   • Simülasyon artık ana sayfadaki "Genel sıralama" ile aynı sayıyı
//     verir.
// --- VERSİYON 4.3.46 (Modüler Yapı) ---
// v4.3.46 değişiklikleri (puan simülasyonu yetki düzeltmesi):
//   • v4.3.45'te /admin/puan-simulasyon route'unun yetki kontrolü yanlıştı
//     (req.session.kullaniciAdi !== 'admin' kontrolü ile herkesi reddediyordu).
//     Admin paneli Basic Auth kullanıyor — diğer admin route'larıyla aynı
//     adminKontrol(req, res) çağrısı yapıldı.
// --- VERSİYON 4.3.45 (Modüler Yapı) ---
// v4.3.45 — v4.3.41 üstüne sadece "Puan Simülasyonu" eklendi.
//   • Admin > Sistem > 📊 Puan Simülasyonu sayfası eklendi.
//   • v4.3.42'deki yeni puan formülünü (Z = cron Z) tüm öğrencilerin
//     cevap geçmişine uygular, mevcut puanlarıyla kıyaslar.
//   • SADECE OKUR — hiçbir veri değiştirilmez. CevapKaydi / Kullanici /
//     Soru hiçbiri yazılmaz, salt simülasyon.
//   • URL ile filtre: /admin/puan-simulasyon?kullanici=berat,enesaydin27
//   • Bu versiyon v4.3.42'nin puanlama değişikliklerini İÇERMEZ — sadece
//     simülasyon aracı. Karar verdikten sonra v4.3.42 ayrı deploy edilir.
// --- VERSİYON 4.3.41 (Modüler Yapı) ---
// v4.3.41 değişiklikleri (mobil uyumu — admin paneli):
//   • Admin üst barı mobilde dikey: logo → ana nav (yatay kaydırılabilir)
//     → sağdaki blok (Hesapla / Merhaba / Çıkış) alta düşer, küçülür.
//     Üst bar yüksekliği sabit yerine esnek.
//   • Admin ana içerik padding'i mobilde küçülür.
//   • Admin'deki sabit kolonlu grid'ler (3'lü kurum istatistik, 5'li
//     sıralama, modal şıklar) mobilde tek/iki kolona iner.
//   • Tüm .tablo class'lı tablolar mobilde yatay kaydırılabilir (v4.3.38
//     kuralı), padding'ler küçülür.
//   • admin-kullanici-detay sayfası: 340px+1fr ana düzen mobilde alt alta,
//     istatistik grid'i 3'ten 2'ye (çok dar telefonda 1'e) iner.
//   • Mevcut 700px media query (admin alt nav) korundu, dokunulmadı.
//   • Masaüstü görünümü değişmedi.
//   • Bu mobil uyumlu hale getirme adımları tamamlandı (öğrenci + admin).
// --- VERSİYON 4.3.40 (Modüler Yapı) ---
// v4.3.40 değişiklikleri (mobil uyumu — takip-ogrenci-detay):
//   • Öğrenci istatistik detay sayfası (/takip/ogrenci/:ad) mobil uyumlu.
//     Bu sayfa veliler için kritik — çocuk istatistiklerine çoğunlukla
//     telefondan bakılır.
//   • Üst barda 2 link var ("ÖĞRETMEN GÖRÜNÜMÜ" rozeti + "Takip'e Dön").
//     Hamburger kuralından muaf (yeni class: ptopbar-nav-detay). Mobilde
//     rozet gizlenir, "Takip'e Dön" linki küçültülüp kalır.
//   • Soru detay modalı mobilde kenarlardan az boşluk, iç padding küçük.
//   • Modal içi şıklar grid'ine secenekler class'ı eklendi — mobilde
//     v4.3.37 kuralıyla tek kolona iner.
//   • Yanlış sorular tablosu zaten overflow-x:auto wrapper içindeydi,
//     dokunulmadı.
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.39 (Modüler Yapı) ---
// v4.3.39 değişiklikleri (mobil uyumu — kalan öğrenci sayfaları):
//   • Şifremi unuttum / şifre yenile sayfaları: sabit 350px genişlikli
//     auth-card mobilde tam genişliğe iner, padding küçülür (≤420px).
//   • İletişim sayfası: üst boşluk ve kart padding'i mobilde küçülür
//     (≤480px). Kapsayıcı zaten esnekti.
//   • Öğrenci tarafının tüm sayfaları artık mobil uyumlu (giriş, kayıt,
//     panel, soru çözme, profil, takip, iletişim, şifre işlemleri).
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.38 (Modüler Yapı) ---
// v4.3.38 değişiklikleri (mobil uyumu — Adım 2b: profil/takip/kurum):
//   • Profil sayfası ana düzeni (içerik + sağ yan kolon) mobilde alt alta
//     dizilir. Kurum üyeleri özet kartları (3'lü) ve profil formları tek
//     kolona iner.
//   • Takip istatistik panelindeki 4'lü metrik grid mobilde tek kolon,
//     5'li sıralama grid'i 2 kolon olur.
//   • Geniş tablolar (kurum üyeleri, takip listeleri — .tablo class'lı)
//     mobilde yatay kaydırılabilir hale geldi, taşma yok.
//   • Yeni yardımcı class'lar: mobil-tekkolon, mobil-ikikolon.
//   • auto-fit/auto-fill minmax grid'lere dokunulmadı (zaten responsive).
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.37 (Modüler Yapı) ---
// v4.3.37 değişiklikleri (mobil: şıklar alt alta):
//   • Telefonda (≤760px) tüm soruların şıkları tek kolona dizilir —
//     sorunun sikDizilimi 'yatay' (4'lü) veya 'ikili' (2'li) ayarlı olsa
//     bile mobilde alt alta gösterilir.
//   • .secenekler grid container'ına media query'de grid-template-columns
//     1fr !important uygulandı (inline style'ı ezmek için).
//   • Takip/istatistik sayfasındaki JS ile üretilen şık grid'ine de
//     'secenekler' class'ı eklendi — o da mobilde tek kolon olur.
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.36 (Modüler Yapı) ---
// v4.3.36 değişiklikleri (mobil uyumu — Adım 2a: üst bar + soru çözme):
//   • Panel üst barı mobilde hamburger menüye (☰) dönüşür. ≤760px'de nav
//     linkleri gizlenir, hamburger butonuna tıklanınca dikey açılır panel
//     olarak görünür. Dışına tıklayınca kapanır.
//   • Üst bar mobilde küçülür: logo/avatar/kullanıcı bilgisi kompakt.
//   • Soru çözme ekranı mobil uyumlu: soru kartı sabit yükseklik yerine
//     esner, padding'ler küçülür, soru metni ve şıklar dokunmatik için
//     uygun boyuta gelir.
//   • Çok dar telefonlar (≤380px) için ek küçültme.
//   • style.css'e media query eklendi. Masaüstü görünümü değişmedi.
//   • Sonraki adım (2b): profil, takip, kurum, veli modları.
// --- VERSİYON 4.3.35 (Modüler Yapı) ---
// v4.3.35 değişiklikleri (mobil uyumu — Adım 1: giriş + kayıt sayfaları):
//   • Giriş ve kayıt sayfaları mobil/tablet uyumlu hale getirildi.
//   • ≤640px (telefon): sol mavi tanıtım paneli ile sağ form alt alta
//     dizilir, sayfa tam ekran kaplar (border-radius/gölge kalkar).
//     Tanıtım özellik kartları ve puan kutusu mobilde gizlenir — sade
//     giriş/kayıt ekranı.
//   • ≤900px (tablet): sabit genişlik yerine esnek genişlik.
//   • Giriş için public/style.css'e, kayıt için kayit.ejs <style> bloğuna
//     media query eklendi. Masaüstü görünümü değişmedi.
//   • Sonraki adımlar: panel/soru çözme ekranı, sonra diğer öğrenci
//     sayfaları.
// --- VERSİYON 4.3.34 (Modüler Yapı) ---
// v4.3.34 değişiklikleri (demo hesabı sınıf seçici):
//   • Demo hesabı soru çözme ekranının üstündeki dropdown'dan sınıf
//     seviyesini değiştirebilir. Sınıf listesi Unite koleksiyonundaki
//     sınıflardan gelir.
//   • Yeni endpoint: POST /demo/sinif-degistir — demo'nun sinif alanını
//     günceller, idx=0'a döner (yeni sınıfın ilk sorusundan başlar).
//   • Seçili sınıfta soru yoksa, boş ekranda da sınıf seçici gösterilir —
//     demo başka sınıfa geçebilir, sıkışmaz.
//   • Yalnızca demo rolü etkilenir, diğer roller dokunulmadı.
// --- VERSİYON 4.3.33 (Modüler Yapı) ---
// v4.3.33 değişiklikleri (demo / etkisiz öğrenci hesabı):
//   • Yeni rol: 'demo'. Admin "demo" tipi davet kodu üretir, o kodla
//     açılan hesap etkisiz bir öğrenci hesabıdır.
//   • Demo hesabı tüm soruları görür, ileri-geri tek tek geçer (moderatör
//     gibi navigasyon), cevap verebilir ve doğru/yanlış bandını görür.
//   • ANCAK: demo cevabı HİÇBİR ŞEY KAYDETMEZ. /cevap route'u demo için
//     erken çıkar — CevapKaydi yok, puan yok, süre yok, zorluk güncellenmez.
//     Aynı soru tekrar tekrar cevaplanabilir.
//   • Demo hesabı soru çözmediği için sıralama/puan tablosunda görünmez.
//   • Demo kayıt formu öğrenci gibi (sınıf seçer) — soruları sınıfına göre
//     listeler. refTip='demo', rol='demo'.
//   • gecerliTipler'e 'demo' eklendi (admin + auth).
// --- VERSİYON 4.3.32 (Modüler Yapı) ---
// v4.3.32 değişiklikleri (cevap sonucu üst bant bildirimi):
//   • Öğrenci bir soruyu cevaplayınca, yeni soru sayfasının üstünde 5 sn
//     görünen kayan bant (toast) belirir. Bant kaybolurken arkada yeni
//     soru zaten hazır — "yeni soru anında gelir".
//   • Doğru cevap: yeşil bant + beyaz tik (CSS çizim) + "Doğru cevap!" +
//     sorunun zorluk katsayısı ve seviyesi (örn "3.2 (orta)").
//   • Yanlış cevap: kırmızı bant + beyaz çarpı (CSS çizim) + "Yanlış
//     cevap" + zorluk + "Profilinde ders istatistiklerinden bu soruyu
//     tekrar görebilirsin" bilgisi.
//   • /cevap route'u sonucu redirect'e ekler: ?sonuc=dogru|yanlis&z=KATSAYI
//   • Zorluk seviyesi metni zorluk raporundaki bantlarla aynı: 1.0-1.4
//     çok kolay, 1.5-2.4 kolay, 2.5-3.4 orta, 3.5-4.4 zor, 4.5-5.0 çok zor.
//   • Bant gösterildikten sonra URL parametreleri temizlenir — sayfa
//     yenilenince bant tekrar çıkmaz.
// --- VERSİYON 4.3.31 (Modüler Yapı) ---
// v4.3.31 değişiklikleri (kurum yöneticisi davet linki üretimi):
//   • Kurum yöneticisi (kurumsal rol) profil sayfasındaki "Davet linklerin"
//     bölümünden öğrenci / öğretmen / veli tipinde davet linki üretebilir.
//   • Tip seçici dropdown + "Üret" butonu. Sınırsız üretim — günlük tavan
//     veya otomatik yenileme yok, yönetici istediği kadar üretir.
//   • Üretilen linkler kurumsalın kendi listesinde tip etiketiyle görünür
//     (👨‍🎓 ÖĞRENCİ / 👩‍🏫 ÖĞRETMEN / 👪 VELİ).
//   • Yeni endpoint: POST /kurum/davet-uret (rolListesi'nde 'kurumsal'
//     olan kullanıcı için çalışır).
//   • Öğretmenlerin mevcut otomatik öğrenci kodu sistemi korundu — bu
//     özellik yalnızca kurumsal moda ek.
// --- VERSİYON 4.3.30 (Modüler Yapı) ---
// v4.3.30 değişiklikleri (admin: veli etiketi + referans tip düzeltme):
//   • Admin kullanıcı listesinde veli rolüne 👪 VELİ etiketi eklendi
//     (öğretmen ve yöneticide olduğu gibi). İsim yanında "👪 VELİ" rozeti,
//     sınıf hücresinde turuncu "VELİ" kısaltması.
//   • BUG FIX: Veli'nin ürettiği davet linki admin referans listesinde
//     yanlış "VELİ" etiketi gösteriyordu. tip='veli' kodu çift amaçlı —
//     admin üretirse veli kaydı, bir veli üretirse ÖĞRENCİ kaydı yaptırır.
//     Artık her referansa gercekTip hesaplanır: olusturan bir veli
//     kullanıcıysa etiket "👨‍🎓 ÖĞRENCİ" gösterilir.
// --- VERSİYON 4.3.29 (Modüler Yapı) ---
// v4.3.29 değişiklikleri (admin: filtreler ünitelerden beslenir):
//   • Soru filtreleme (soruListesi) ve Zorluk Raporu filtrelerinin
//     sınıf/ders/ünite/konu seçenekleri artık Soru koleksiyonu yerine
//     Unite koleksiyonundan üretilir. Kademeli: sınıf seçilince o sınıfın
//     dersleri, ders seçilince üniteleri, ünite seçilince konuları.
//   • Zorluk Raporuna kendi filtre formu eklendi (önceden "Sorular
//     sekmesinden filtrele" diyordu, artık sayfa içinde filtre var).
//   • /api/unite-bilgi artık 'siniflar' listesini de döndürür.
//   • PDF Yükle sayfası: sınıf ve ders dropdownları statik (1-12 / 6 ders)
//     yerine ünitelerden gelir. Akış: sınıf seç → dersler yüklenir →
//     ders seç → üniteler/konular yüklenir.
//   • Soru Ekle formu: sınıf dropdownı da ünitelerden gelir (ders zaten
//     öyleydi). editSoru'da kayıtlı sınıf seçili gelir.

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
