# v4.16.28 — Hızlı geçişte sorunun önizlemesi (düzenleme sayfasında)

## İstek
Sorular arasında geçerken (Önceki/Sonraki) düzenleme formunun yanı sıra sorunun
KENDİSİNİ — önizlemesini — görmek.

## Yapılanlar — views/admin.ejs
- Düzenleme sayfasında (soruEkle, editSoru varken) navigatörün altına "Soru
  Önizleme" paneli eklendi. Panel, mevcut /api/soru/:id ucundan soruyu çekip
  mevcut _soruOnizleHtml(s) ile render eder, adminMathRender ile LaTeX'i basar
  (soru listesi önizlemesiyle birebir aynı yol).
- Görseller v4.16.26 sayesinde büyük + tıkla-büyüt (lightbox admin.ejs'te zaten var).
- Yeni Soru'da (editSoru yok) panel çıkmaz.

## Akış
Liste → "İlk soruyu düzenle ▶" → düzenleme sayfası: üstte navigatör (◀ i/N ▶) +
hemen altında sorunun önizlemesi + altında düzenleme formu. Sonraki ▶ ile sıradaki
sorunun düzenleme sayfası açılır, önizleme o soruya güncellenir.

## %100 korunan
- Navigatör (v4.16.27), düzenleme formu, /api/soru, _soruOnizleHtml, adminMathRender,
  diğer tüm kod. Sadece önizleme paneli eklendi. CRLF korundu.

## Test
- admin.ejs ejs.compile ile derlendi.
- Önizleme bloğu render edildi: fetch /api/soru/<id> doğru, _soruOnizleHtml +
  adminMathRender çağrıları var; editSoru yokken panel boş.

## Değişen dosyalar
- views/admin.ejs (düzenleme sayfası soru önizleme paneli)
- package.json (4.16.27 -> 4.16.28)

## Git
```bash
git add -A
git commit -m "v4.16.28: Hizli geciste sorunun onizlemesi (duzenleme sayfasinda)"
git push
git tag v4.16.28
git push origin v4.16.28
```
