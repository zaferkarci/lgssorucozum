# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje: LGS Hazırlık Platformu (v4.5.8)

LGS'ye hazırlanan öğrenciler için soru çözüm ve takip platformu. Öğrenciler soruları çözer; doğru/yanlış ve çözüm süresine göre dinamik puan kazanır. Öğretmen, kurumsal yönetici ve admin rolleri öğrenci istatistiklerini ve zorluk raporlarını görür.

## Komutlar

```bash
# Geliştirme sunucusu (yerel)
node server.js

# Üretim başlatma
npm start
```

Ortam değişkenleri gerekli: `MONGO_URI`, `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`. E-posta için `NODEMAILER_*` değişkenleri. Render'da otomatik deploy: GitHub push → deploy.

## Mimari

### Giriş noktası
`server.js` — Express kurulumu, middleware'ler, session, cron zamanlaması ve route bağlamaları burada. Tüm route'lar `app.use('/', ...)` ile eklenir.

### Route'lar
- `routes/auth.js` — Kayıt, giriş, çıkış, şifre sıfırlama, referans kodu üretimi
- `routes/panel.js` — Öğrenci/öğretmen/veli/kurumsal paneli; soru çözme (`POST /cevap`), geçme (`POST /gec`), tüm istatistik ve profil işlemleri
- `routes/admin.js` — Admin paneli (Basic Auth + session); soru CRUD, kullanıcı yönetimi, zorluk raporu, puan simülasyonu, duplicate tespiti
- `routes/takip.js` — Takip/izleme ilişkileri ve öğrenci detay sayfası
- `routes/pdfyukle.js` — PDF/Word soru içe aktarma (mammoth)

### Models (MongoDB/Mongoose)
- `Kullanici` — Kullanıcı şeması: `rol`, `rolListesi`, `dersPuanlari`, `siralamaCache`, `gecilenSorular`
- `Soru` — Soru şeması: `zorlukKatsayisi`, `hamPuan`, `cozumSureleriTum`, `dogruCevapSureleri`
- `CevapKaydi` — Her çözüm kaydı: `kazanilanPuan`, `ikinciKezMi` flag
- `TakipIliski` — Öğretmen/veli ↔ öğrenci ilişkileri
- `Unite` — Ders/ünite/konu hiyerarşisi; soru filtreleri buradan beslenir
- `Kurum`, `KurumSinif`, `KurumUyelikIstek`, `ReferansKodu`, `Okul`, `Haber`, `Mesaj`, `YasakliKelime`, `PasswordReset`

### Services
- `services/lgsOrtalama.js` — **Tek kaynak**: LGS ağırlıklı ortalama formülü (Mat×4, Türkçe×4, Fen×4, İnkılap×1, Din×1, İng×1) / 15. Hem cron hem route'lar buradan kullanır.
- `services/gunlukHedef.js` — Günlük ders bazlı hedef hesabı (son 30 gün ortalaması)
- `services/aktivite.js` — Bugünkü aktivite özeti (giriş + çözüm sayıları)
- `services/duplicateTespit.js` — Bigram Dice benzerliği ile tekrar eden soru tespiti

### Puan Formülü
Cron `cronJobs.js`'de her gece 05:10'da tüm puanlar sıfırdan yeniden hesaplanır:
1. **Soru istatistikleri**: Her sorunun `zorlukKatsayisi` (Z, 1-5 arası), doğru oranı + süre kademesinden hesaplanır.
2. **Kullanıcı puanı**: `puan = Σ(Z × T_ref × hizBileseni × GE)` — doğru cevaplar için. `T_ogr` 10 sn altı 10 sn sayılır (tavan puan, anti-spam). `ikinciKezMi` kayıtlar `/cevap` anındaki puana güvenir, cron yeniden hesaplamaz.
3. **Sıralama**: Öğrenciler sınıf seviyesine göre ayrı sıralanır; `siralamaCache` alanına yazılır.

### Frontend
Tüm sayfalar EJS şablonları (`views/`). Client-side JS inline yazılır. `app.locals.puanFmt` helper'ı tüm EJS şablonlarında kullanılabilir. `public/style.css` global stil, `public/loading.html` Render uyandırma ekranı.

### Roller
`ogrenci` | `ogretmen` | `veli` | `kurumsal` | `moderator` | `admin` (session) | `demo` (etkisiz öğrenci)  
Bir kullanıcı `rolListesi` ile çoklu role sahip olabilir; aktif rol `aktifRol` alanında tutulur.

### Önemli İncelikler
- **LGS ortalaması**: `services/lgsOrtalama.js` TEK kaynak. EJS şablonlarında inline hesaplama da aynı formülü kullanır — birini değiştirirsen diğerini de güncelle (panel.ejs + takip-ogrenci-detay.ejs).
- **ikinciKezMi**: Geçilip tekrar çözülen soruların `CevapKaydi` kaydındaki `kazanilanPuan` değeri cron tarafından sıfırlanmaz; `/cevap` anında `1/5^gecisSayisi` formülüyle yazılmıştır.
- **EJS escape**: `<%= %>` HTML escape eder; inline style veya HTML çıktısı için `<%- %>` kullan (v4.3.58'de yaşanan bug: `display:none` bozulmuştu).
- **Admin yetki**: `adminKontrol()` session (`req.session.adminGirisli`) veya Basic Auth header kontrol eder.
- **Redirect güvenliği**: `donus` parametresi yalnızca `/` ile başlayan değerleri kabul eder (open-redirect koruması).
