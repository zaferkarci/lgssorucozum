# v4.17.1 — Tam Öğrenme kartı analiz bitmeden gösterilmiyor

## Sorun
v4.17.0'da Tam Öğrenme kartı, zorunlu analiz (seviye tespiti) sürerken de görünüyordu.
Ancak ders/eksik/tam-öğrenme filtrelerinin TAMAMI yalnızca `analizTamamlandi` iken
uygulanıyor (routes/panel.js). Sonuç: analiz sürerken karta tıklayan öğrenciye
tam öğrenme konusu yerine analiz soruları gelirdi — kart yanıltıcı olurdu.

Mevcut "Eksiklerini Kapat" kartı bu nedenle zaten analiz sırasında gizleniyordu;
Tam Öğrenme kartına aynı koruma eklenmemişti.

## Çözüm — views/panel.ejs
- Kart koşuluna `(typeof analizTamamlandi === 'undefined' || analizTamamlandi)` eklendi.
- Artık akış tasarlandığı gibi: önce analiz → analiz bitince Tam Öğrenme / Eksiklerini
  Kapat kartları görünür.

## Test
- panel.ejs derlendi; izole render: analiz bitmiş -> kart GÖRÜNÜR, analiz sürüyor -> gizli.

## Değişen dosyalar
- views/panel.ejs
- package.json (4.17.0 -> 4.17.1)
