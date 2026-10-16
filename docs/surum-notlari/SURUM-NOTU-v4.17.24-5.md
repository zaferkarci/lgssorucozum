# v4.17.24-5 — Öğrencinin kendi "Soruyu Gör" penceresinde de yanlış cevap KIRMIZI, doğru cevap YEŞİL

> Ara güncelleme, v4.17.24-4'ün üstüne yüklenir (yalnız değişen dosyalar). `package.json` değişmedi (4.17.24).

## Sorun
- v4.17.24'te kırmızı/yeşil işaretleme yalnız **öğrenci detay sayfasına** (`/takip/ogrenci/<ad>`: öğretmen, veli, kurum
  yöneticisi, yönetici görünümü) eklenmişti. Öğrencinin **kendi panelindeki** (Profilim > Ders İstatistikleri > Çözülen Sorular >
  Soruyu Gör) pencerede yalnız doğru şık yeşil görünüyordu; seçtiği yanlış şık hiç işaretlenmiyordu.
- Ayrıca öğrenci paneli cevapları okurken seçilen şık alanını (`secilenIndex`) veritabanından hiç çekmiyordu.

## Ne değişti — routes/panel.js, views/panel.ejs
- Öğrenci paneli cevap listesini okurken `secilenIndex` de alınır.
- Öğrencinin "Soruyu Gör" düğmesi o satırdaki cevabın seçimini ve sonucunu pencereye iletir (aynı soru birden çok kez
  çözüldüyse her satır kendi cevabını gösterir).
- Yanlış cevapta: seçilen şık **kırmızı** çerçeve/zemin, kırmızı harf kutusu ve "✗ Senin cevabın" etiketi; altında
  "✗ Senin cevabın: A şıkkı". **Doğru şık yeşil** ("✓ Doğru") ve "✓ Doğru cevap: C şıkkı" satırı.
- Doğru cevapta: doğru şıkta "✓ Doğru · Senin cevabın".
- Seçimi kaydedilmemiş eski cevaplarda yalnız doğru şık yeşil görünür ve gri not çıkar
  ("Bu cevapta seçtiğin şık kaydedilmemiş…").
- Öğretmen, veli ve kurum yöneticisinin gördüğü sayfa (views/takip-ogrenci-detay.ejs) değişmedi; orada aynı görünüm
  v4.17.24'ten beri vardır ("Öğrencinin cevabı" etiketiyle).

## Önemli: eski kayıtlar
- Sistem öğrencinin hangi şıkkı seçtiğini **v4.17.24 yüklendikten sonra** kaydetmeye başladı. Bundan önce çözülen yanlışlarda
  seçilen şık bilinmez, sonradan da bulunamaz; o satırlarda yalnız doğru şık yeşil + gri not görünür. Kırmızı işaret, v4.17.24
  sunucuya yüklendikten sonra çözülen sorularda çıkar.

## Test (yerel demo)
- Öğrenci gerçek `POST /cevap` ile 3 cevap verdi (yanlış A, doğru D, yanlış D) + 1 eski (şıksız) yanlış kayıt.
  Kayıtlarda secilenIndex = 0, 3, 3, (yok).
- Gerçek tarayıcıda dört rol: **öğrenci** (kendi paneli), **veli**, **öğretmen**, **kurum yöneticisi** (öğrenci detay sayfası).
  Hepsinde: yanlış A → A kırmızı + C yeşil; doğru D → D yeşil "Doğru · …cevabı"; yanlış D → D kırmızı + B yeşil; eski kayıt →
  yalnız yeşil doğru şık + gri not. Pencere gerçek tıklamayla açıldı, sayfa hatası yok.

## Değişen dosyalar (v4.17.24-4'e göre)
- routes/panel.js
- views/panel.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.24-5.md
