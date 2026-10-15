# v4.17.24-2 — Soru inceleme pencerelerinde `\color` (renkli kare) formülleri bozuk görünüyordu

> Ara güncelleme (package.json değişmedi: 4.17.24). Yalnız 2 dosya; **v4.17.24-1'in üstüne** yüklenir.

## Belirti
Öğrencinin kendi panelinde **Çözülen Sorular > Soru İnceleme** penceresinde (ve öğretmenin **Soruyu Gör** penceresinde) renkli kare
içeren sorularda (`${\color{orange}\blacksquare}$` gibi) kareler yerine kırmızı **`\color orange ■`** yazısı çıkıyor, her formül
**iki kez** görünüyordu. Aynı soru soru çözme sayfasında ve admin önizlemesinde doğru görünüyordu.

## Neden
- İki pencere de içeriği yazdıktan sonra MathJax'i **art arda iki kez** çalıştırıyordu: önce `mathRenderSonra(...)`, hemen arkasından
  aynı elemana ikinci bir `MathJax.typesetPromise(...)`.
- `\color` MathJax'te ilk kullanıldığında eklenti **anında yüklenir** (internetten). Bu yükleme sürerken iki çağrı birbirine girer:
  formüller ikilenir ve eklenti düzgün kaydolmadığı için `\color` "tanımsız komut" olarak ham yazı kalır (aynı sayfada sonraki
  açılışlarda da). Soru çözme sayfasında matematik sayfa açılırken **tek** çağrıyla çizildiği için orada sorun yoktu.
- Bu yüzden yalnız `\color` gibi sonradan yüklenen eklentileri kullanan sorularda görünüyordu; sıradan formüller etkilenmiyordu.

## Düzeltme — views/panel.ejs, views/takip-ogrenci-detay.ejs
- `soruGoster` içindeki ikinci (gereksiz) `MathJax.typesetPromise` çağrısı kaldırıldı; matematik yalnız `mathRenderSonra` ile, bir kez çizilir.
- Başka hiçbir şey değişmedi (v4.17.24'teki kırmızı/yeşil şık gösterimi aynı).

## Test (yerel demo, MathJax 3.2.2 ile)
- Soru: "Tahtaya yazılan ◼ sayısının…" + "Buna göre ◼ + ◼ + ◼ işleminin sonucu kaçtır?" (turuncu, kırmızı, mavi).
- ESKİ kod, öğrenci penceresi ilk açılış: 8 formül kutusu (ikilenmiş), ham `\color` yazısı; ekran görüntüsündeki durumun aynısı.
- ESKİ kod, öğretmen penceresi: 8 kutu, ham `\color`, renkli öğe 0/8/0.
- YENİ kod: öğrenci ve öğretmen penceresinde 4 kutu, ham yazı yok, turuncu/kırmızı/mavi kareler görünüyor; pencere kapatılıp
  yeniden açılınca da doğru.

## Değişen dosyalar
- views/panel.ejs, views/takip-ogrenci-detay.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.24-2.md (yeni)
- package.json DEĞİŞMEDİ (4.17.24)
