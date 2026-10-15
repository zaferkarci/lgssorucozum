# v4.17.24-3 — Veli ve öğretmen için "Son 30 Gün — Günlük 2 Soru" takvimi

> Ara güncelleme (package.json değişmedi: 4.17.24). **v4.17.24-2'nin üstüne** yüklenir (2 dosya değişti, 2 dosya yeni).

## Ne eklendi
- **Veli paneli** ve **öğretmen/kurumsal Takip sekmesi**, "📊 Bugünün Aktivitesi" kartının hemen altında yeni kart:
  **📅 Son 30 Gün — Günlük 2 Soru**.
- Her takip edilen öğrenci için bir satır, soldan sağa **son 30 gün** (en soldaki 29 gün önce, **en sağdaki bugün**):
  - Günde **en az 2 soru** çözüldüyse **yeşil ✓**
  - 0 veya 1 soru çözüldüyse **kırmızı ✗**
  - **Bugün** gün henüz bitmediği için **turuncu** (içinde o ana kadarki soru sayısı); 2 soruya ulaşınca yeşile döner.
    (Aksi halde sabah saatlerinde her çocuk "kırmızı" görünürdü.)
- Takvim her gün bir gün **sola kayar** (sabit "ay" değil, hep son 30 gün). Sayfa açılınca en sağdaki gün (bugün) görünecek şekilde
  sona kaydırılır; geçmişi görmek için sola kaydırılır (telefonda parmakla). Öğrenci adı ve "Tamamlanan" sütunu sabit kalır.
- Başlıkta ay adları (Eylül | Ekim …), gün harfi (P S Ç P C C P) ve gün numarası; hafta sonları ve bugün ayrı tonda.
- Sağda **Tamamlanan: N / 30** (kaç günde hedef tutturuldu).
- Öğrenci adına tıklayınca o öğrencinin istatistik sayfası açılır. Hücrenin üstüne gelince "14 Ekim: 5 soru çözüldü" gibi bilgi çıkar.
- Öğretmende birden çok öğrenci alt alta listelenir (sınıf, sonra ada göre); çok olursa kart içinde dikey kaydırılır.

## Kurallar / ölçü
- Sayılan: o gün **cevaplanan her soru** (CevapKaydi) — "Bugünün Aktivitesi" kartıyla aynı ölçü. Atlanan ("Geç") soru sayılmaz.
- Gün sınırı **Europe/Istanbul 00:00** (sistemin diğer yerleriyle aynı, sabit UTC+3). Gece yarısına bölünen iki cevap iki ayrı güne düşer.
- Giriş yapmak tek başına yeşil yapmaz; ölçü çözülen soru sayısıdır.

## Yetki (kimse başkasının öğrencisini görmez)
- Yeni uç: `GET /takip/gunluk-takvim` — yetki ve öğrenci seçimi "Bugünün Aktivitesi" ile **aynı**:
  veli yalnız kendi çocuklarını (onaylı **veli** ilişkisi), öğretmen/kurumsal yalnız onaylı takip ettiklerini görür.
  Bekleyen / reddedilen ilişkiler görünmez; `?kullanici=` parametresi normal kullanıcıda yok sayılır; öğrenci rolü 403, oturumsuz 401.
  Yönetici görünümünde görüntülenen kullanıcının öğrencileri gösterilir. Yanıt `no-store`.

## Teknik
- services/gunlukTakvim.js (yeni): son 30 günün cevaplarını (yalnız `kullaniciAdi, tarih`) tek sorguda çeker, Istanbul günlerine böler.
  MongoDB tarih/saat dilimi fonksiyonlarına bağlı değildir.
- views/gunluk-takvim-kart.ejs (yeni): kartın ortak parçası (HTML + stil + script); `views/panel.ejs` veli paneline ve Takip sekmesine
  `include` ile eklenir. Adlar DOM'a `textContent` ile yazılır.
- routes/takip.js: yeni uç. views/panel.ejs: iki `include` satırı.
- Öğrencinin kendi paneli, öğrenci detay sayfası, puan/sıralama hesapları **değişmedi**.

## Test (yerel demo)
- 3 öğrenci, 2 veli + 1 çocuksuz veli, 1 öğretmen; bekleyen ve reddedilen ilişkiler dahil.
- Gün desenleri: bugün 1 soru (turuncu), 2 soru (yeşil), 5 soru, 0 soru, 1 soru (kırmızı), aynı günün ilk ve son saniyesinde birer cevap
  (= 2, yeşil), gece yarısına bölünen iki cevap (1 + 1, ikisi de kırmızı), pencerenin ilk saniyesindeki 2 cevap (yeşil),
  pencerenin 1 gün dışındaki 3 cevap (sayılmadı). Tüm desen beklendiği gibi çıktı; 30 gün: 16 Eylül → 15 Ekim.
- Yetki: veli1 yalnız kendi çocuğunu gördü (`?kullanici=başkası` yok sayıldı); veli2 beklemedeki çocuğu görmedi; öğretmen reddedilen
  öğrenciyi görmedi; öğrenci 403; oturumsuz 401; yönetici görünümünde ilgili kullanıcının verisi.
- Tarayıcı (gerçek sayfa): veli (masaüstü + 390 px telefon, sayfa yana taşmıyor), öğretmen (2 satır), çocuksuz veli ("Takip edilen
  öğrenci yok"), veli ve öğretmen Takip sekmesi; sona kaydırma çalıştı; JS hatası yok. Diğer kartlar etkilenmedi.

## Değişen dosyalar
- Yeni: services/gunlukTakvim.js, views/gunluk-takvim-kart.ejs
- Değişen: routes/takip.js, views/panel.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.24-3.md (yeni)
- package.json DEĞİŞMEDİ (4.17.24)
