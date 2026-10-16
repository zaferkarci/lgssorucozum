# v4.17.25-1 — "Soruyu Gör" penceresi sadeleştirildi: yalnız "İşaretlenen" ve "Doğru"

> Ara güncelleme, v4.17.25'in üstüne yüklenir (yalnız değişen dosyalar). `package.json` değişmedi (4.17.25).

## Ne değişti
- Yanlış cevapta öğrencinin seçtiği şık kırmızı ve yanında yalnız **"✗ İşaretlenen"** yazar (önceden "Öğrencinin cevabı" /
  "Senin cevabın").
- Doğru şık yeşil ve yanında yalnız **"✓ Doğru"** yazar. Doğru çözülen sorularda yalnız doğru şık işaretlenir
  (önceki "· Öğrencinin cevabı" eki kaldırıldı).
- Şıkların altındaki kırmızı "Öğrencinin cevabı: X şıkkı" satırı ve eski kayıtlar için çıkan gri not kaldırıldı.
  Yeşil "Doğru cevap: X şıkkı" satırı eskiden beri olduğu gibi duruyor.
- Aynı değişiklik üç sayfada: öğrencinin kendi paneli (views/panel.ejs), öğretmen/veli/kurum öğrenci sayfası
  (views/takip-ogrenci-detay.ejs), yönetici Kullanıcı Detay (views/admin-kullanici-detay.ejs).

## Test (yerel demo, gerçek tarayıcı)
- Öğrenci, veli, öğretmen, kurum yöneticisi ve yönetici sayfalarında: yanlış A → A kırmızı "✗ İşaretlenen" + C yeşil "✓ Doğru";
  doğru D → yalnız D yeşil "✓ Doğru"; eski (şıksız) kayıt → yalnız doğru şık yeşil. Sayfa hatası yok.

## Değişen dosyalar (v4.17.25'e göre)
- views/panel.ejs
- views/takip-ogrenci-detay.ejs
- views/admin-kullanici-detay.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.25-1.md
