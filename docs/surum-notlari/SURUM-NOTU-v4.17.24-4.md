# v4.17.24-4 — Takvim gün sayısı ayın uzunluğuna göre (28 / 29 / 30 / 31)

> Ara güncelleme, **v4.17.24-3'ün üstüne** yüklenir (yalnız değişen dosyalar). `package.json` değişmedi (4.17.24).

## Ne değişti — services/gunlukTakvim.js, views/gunluk-takvim-kart.ejs
- Veli paneli ve öğretmen/kurumsal **Takip** sekmesindeki takvim kartı artık sabit 30 gün değil, **"Son 1 Ay"** gösterir:
  gün sayısı ayın uzunluğuna göre **28, 29, 30 veya 31** olur.
- Kural: pencere bugünden bir ay geriye gider. Başlangıç = geçen ayın aynı günü + 1 gün.
  - 15 Ekim → 16 Eylül – 15 Ekim = **30 gün** (Eylül 30 çeker)
  - 15 Ocak → 16 Aralık – 15 Ocak = **31 gün**
  - 15 Mart → 16 Şubat – 15 Mart = **28 gün** (artık yılda 29)
  - Bugün **ayın son günüyse** tam o ay görünür: 28 Şubat → 1–28 Şubat (28), 29 Şubat 2028 → 29 gün, 30 Kasım → 1–30 Kasım (30),
    31 Aralık → 1–31 Aralık (31).
- Kaydırma davranışı aynı: her gün bir gün sola kayar, **en sağdaki gün bugündür**, kart açılınca bugüne kaydırılmış gelir.
- Kart başlığında aralık ve gün sayısı yazar: "📅 Son 1 Ay — Günlük 2 Soru (16 Eylül – 15 Ekim · 30 gün)".
- "Tamamlanan" sütunu `N / gün sayısı` (ör. 27 / 31). Rengi gün sayısına oranlanır (üçte ikisi ve üstü yeşil, üçte biri ve üstü
  turuncu, altı kırmızı; 30 günde önceki 20 / 10 eşikleriyle aynı).
- Ayın 1'i önüne ince bir ayraç çizgisi kondu; ay adı tablo sola kaydırılınca da öğrenci sütununun yanında görünür kalır.
- Tablo ekrana sığmıyorsa altta "← Önceki günleri görmek için tabloyu sola kaydırın" ipucu çıkar.
- Değişmeyenler: yeşil ✓ (o gün ≥ 2 soru), kırmızı ✗, bugün turuncu; İstanbul gün sınırları; yetki (veli yalnız kendi onaylı
  çocuklarını, öğretmen/kurumsal onaylı öğrencilerini görür); `/takip/gunluk-takvim` adresi ve routes/takip.js aynı.

## Test (yerel demo)
- 2023–2033 arasındaki her gün (4018 tarih) için pencere bağımsız bir formülle karşılaştırıldı: uzunluk hep 28–31, son gün bugün,
  günler ardışık, ilk gün doğru — hata 0.
- Sahte saatle API: 27/28 Şubat, 1/15/29/30/31 Mart, 30 Nisan (UTC 20:59 ve 21:30 — İstanbul gece yarısı sınırı), 30 Haziran,
  30 Eylül, 15 Ekim, 30 Kasım, 31 Aralık. Her gün için sayılar beklenenle birebir; gün sınırındaki (00:00:00 ve 23:59:59) kayıtlar
  doğru güne düştü; pencere dışındaki gün sayılmadı.
- Tarayıcı: veli (2 çocuk), öğretmen (6 öğrenci), telefon (390 px; sayfa yatay taşmıyor, bugün görünür). Konsol hatası yok.

## Değişen dosyalar (v4.17.24-3'e göre)
- services/gunlukTakvim.js
- views/gunluk-takvim-kart.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.24-4.md
