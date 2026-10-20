# v4.17.28-2 — Şık dizilimi varsayılanı her yerde "Yatay (Yan Yana)"

> Ara güncelleme, v4.17.28-1'in üstüne. `package.json` değişmedi (4.17.28).

## Sorun
- Soru ekleme formunda "Yatay (Yan Yana)" zaten varsayılandı; ama veritabanı (Soru modeli) varsayılanı hâlâ `dikey`ti.
- PDF'ten (normal ve görselli) kaydedilen sorular şık dizilimi göndermediği için hep `dikey` kaydediliyordu. Bu sorular
  düzenleme ekranında "Dikey" seçili açılıyor, öğrenciye de alt alta gösteriliyordu.

## Ne değişti
- models/Soru.js: `sikDizilimi` varsayılanı `yatay`.
- routes/pdfyukle.js (`/pdf-sorulari-kaydet`, normal ve görselli PDF): soruda geçerli bir dizilim yoksa `yatay` yazılır.
- routes/admin.js (soru ekle / güncelle): form alanı boş gelirse `yatay` (eskiden `dikey`).
- Formdaki seçim aynen çalışır: Dikey veya İkili seçilirse o kaydedilir.

## Önemli: mevcut sorular
- **Daha önce kaydedilmiş sorulara dokunulmadı.** Veritabanında `dikey` yazan sorular öyle kalır; düzenleme ekranında
  "Dikey" açılır. İstenirse ayrıca toplu güncellenebilir (şıkları uzun olanlar hariç tutularak).

## Test (yerel demo)
- PDF kaydı (dizilim gönderilmeden) → `yatay` kaydedildi; düzenleme ekranında "Yatay (Yan Yana)" seçili açıldı.
- Yeni soru formu "Yatay (Yan Yana)" ile açıldı. Model varsayılanı `yatay`.

## Değişen dosyalar
- models/Soru.js
- routes/pdfyukle.js
- routes/admin.js
- docs/surum-notlari/SURUM-NOTU-v4.17.28-2.md
