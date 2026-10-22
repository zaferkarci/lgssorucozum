# Sürüm Notu — v4.17.29-1

**Tarih:** 22 Ekim 2026
**Tür:** Aynı gün güncellemesi (package.json değişmedi, 4.17.29)

## Admin › Kullanıcılar listesi: sınıf/şube

### 1) Sınıf filtresinde şubeler
- "Tüm Sınıflar" açılır listesinde öğrencisi olan her sınıf kendi başlığı altında gruplanır:
  - `8. Sınıf (tümü)` — o seviyedeki tüm öğrenciler (eski davranış)
  - `8A`, `8B`, `8C` … — yalnız o şube
- Şubeler kayıtlı öğrencilerin `sube` alanından otomatik çıkarılır; elle liste tutulmaz.
- İl / ilçe / okul seçiliyse yalnız o kapsamdaki öğrencilerin şubeleri listelenir.
- Öğrencisi olmayan seviyeler ve Mezun eskisi gibi tek satırdır.
- URL değeri: `kullaniciSinif=8` (seviye) veya `kullaniciSinif=8-A` (şube). Eski bağlantılar çalışmaya devam eder.
- Şube karşılaştırması büyük/küçük harf ve baştaki/sondaki boşluk farkını yok sayar (Türkçe büyük harf).

### 2) Sınıf sütununda şube
- Öğrencilerin Sınıf hücresinde sınıf ve şube birlikte yazılır: `7A`, `8C`.
- Şubesi girilmemiş öğrencide yalnız sınıf yazar (`7`); Mezun değişmedi.
- Öğrenci olmayan rollerde (ÖĞR/YÖN/VELİ/DEMO rozetleri) değişiklik yok.

## Değişen dosyalar
- `routes/admin.js` — filtre mantığı (seviye/şube), `sinifSubeSecenekleri` hesaplanıp şablona gönderilir
- `views/admin.ejs` — sınıf filtresi (optgroup + şubeler), Sınıf hücresine şube eklendi
- `docs/surum-notlari/SURUM-NOTU-v4.17.29-1.md` — bu not

## Test (demo)
- 8A seçimi: 21 öğrenci (veritabanı sayımıyla aynı)
- 7. Sınıf (tümü): 7 öğrenci (7A, 7C ve şubesiz 7)
- Veritabanı yapısı değişmedi; sunucuda yeniden başlatma yeterli.
