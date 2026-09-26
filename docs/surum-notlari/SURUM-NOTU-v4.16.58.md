# v4.16.58 — Ayarlar sayfası kart yapısına geçti

## İstek
Ayarlar sayfasındaki bölümler kart haline gelsin; kartta açıklamanın bir kısmı görünsün;
değer girişi ve değişiklik karta tıklayınca açılan AYRI bir sayfada yapılsın.

## Yapılanlar
### views/admin.ejs
- `mod=ayarlar` artık bir KART LİSTESİ (responsive grid, hover efektli):
  1. "⚙️ Sıralama Ayarları" — kısa açıklama + durum rozeti (AÇIK/KAPALI) + mevcut eşik.
  2. "📚 Günlük Soru Limitleri" — kısa açıklama + "Normal: N soru/gün · Analizde: M soru/gün".
  Kartlarda giriş alanı YOK, yalnızca özet ve "Düzenle →".
- Yeni alt sayfalar (tam açıklama + form + Kaydet + "← Ayarlar" dönüş linki):
  * `mod=ayar-siralama` — 30 günlük ortalama eşiği.
  * `mod=ayar-limit` — standart günlük limit + analiz limiti.

### routes/admin.js
- `ayar-siralama` ve `ayar-limit` modlarında da ayar değerleri yükleniyor.
- **KRİTİK: /admin/ayar-kaydet yeniden yazıldı.** Önceden her kaydetmede ÜÇ ayar birden
  yazılıyordu; formlar bölününce tek alanlı bir form diğer ayarları varsayılana
  döndürürdü (veri kaybı). Artık yalnızca `req.body`'de GÖNDERİLEN alanlar güncelleniyor
  (hasOwnProperty kontrolü).
- Kaydetme sonrası `donus` alanıyla gelinen alt sayfaya geri dönülür (yalnız /admin ile
  başlayan yollar kabul edilir — açık yönlendirme koruması).

### views/admin.ejs (nav)
- sistemModlari'na yeni modlar eklendi; "⚙️ Ayarlar" nav linki alt sayfalarda da aktif görünür.

## %100 korunan
- Ayarların kendisi, doğrulama kuralları (eşik -1/boş=kapalı; limit 1-500 varsayılan 2;
  analiz 1-999 varsayılan 20), diğer tüm ekranlar.

## Test
- node --check admin.js geçti; admin.ejs derlendi.
- Render: kart listesi (linkler, AÇIK/KAPALI rozeti, özet değerler, giriş alanı YOK);
  ayar-siralama (değer 0.1, donus doğru, limit inputları sızmıyor);
  ayar-limit (7 ve 33 doğru, siralama inputu sızmıyor);
  duyuru/yedek/sifirla/kullanicilar regresyonsuz.
- Kısmi kaydetme simülasyonu: sıralama kaydedilince limitler korundu; limitler
  kaydedilince eşik korundu; eşik boş bırakılınca -1 (kapalı) oldu.

## Değişen dosyalar
- routes/admin.js, views/admin.ejs
- package.json (4.16.57 -> 4.16.58)
