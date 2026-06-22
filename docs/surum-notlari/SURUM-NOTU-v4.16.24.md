# v4.16.24 — Üniteler listesi sınıf → ünite → konu sırasına göre

## İstek
Kayıtlı Üniteler tablosu sınıf seviyesine göre (sonra ünite, sonra konu) listelensin.

## Yapılanlar — routes/admin.js (2 satır)
- Liste sıralaması: { ders:1, sira:1, uniteNo:1 } → { sinif:1, ders:1, sira:1, uniteNo:1 }.
  Artık SINIF birincil; aynı sınıf içinde ders, sonra (manuel) sira, sonra uniteNo.
  (Konu sırası zaten ünite içi konular dizisinden geliyor → satırlar konu sırasıyla.)
- Manuel ünite sıralaması (/unite-sirala) grubu: { ders } → { sinif, ders }.
  ↑/↓ artık aynı SINIF+ders içinde yer değiştirir (sınıf sınırını aşmaz).

## Sonuç
- Üniteler: sınıf (5→6→7→8) → ders → ünite no → (ünite içi) konu sırası.
- v4.16.23 manuel ↑/↓ sıralaması korunur; default (sira=0) sınıf→ünite verir.

## %100 korunan
- sira alanı/akışı, editör ↑/↓, konuYapisi, /unite-ekle, /unite-guncelle, servis,
  cevap/istatistik, mevcut veri, satır sonları (admin.js LF).

## Değişen dosyalar
- routes/admin.js (sort + /unite-sirala grup)
- package.json (4.16.23 -> 4.16.24)

## Test
- node --check admin.js geçti. Sıralama simülasyonu: 5→6→8, ders ve uniteNo doğru.

## Git
```bash
git add -A
git commit -m "v4.16.24: Uniteler listesi sinif-unite-konu sirasina gore"
git push
git tag v4.16.24
git push origin v4.16.24
```
