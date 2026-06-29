# v4.16.32 — Soru kaydetten sonra aynı düzenleme sayfasında kal

## İstek
Düzenleme sayfasında (mod=soruEkle&duzenle=...) Kaydet'e basınca listeye dönmesin,
aynı sorunun düzenleme sayfasında kalsın.

## Yapılanlar — routes/admin.js (/soru-guncelle, tek satır)
- Kaydetten sonraki yönlendirme mod=soruListesi → mod=soruEkle&duzenle=<id>.
  Filtreler (filSinif..filSurec) aynen korunur. Böylece kayıttan sonra navigatör +
  önizleme + form aynı soruda kalır; sonrakine geçmek istersen navigatörü kullanırsın.

## %100 korunan
- Kaydetme mantığı, doğrulama, filtre taşıma, diğer tüm route'lar. Sadece dönüş adresi.

## Test
- node --check admin.js geçti.

## Değişen dosyalar
- routes/admin.js
- package.json (4.16.31 -> 4.16.32)

## Git
```bash
git add -A
git commit -m "v4.16.32: Soru kaydetten sonra ayni duzenleme sayfasinda kal"
git push
git tag v4.16.32
git push origin v4.16.32
```
