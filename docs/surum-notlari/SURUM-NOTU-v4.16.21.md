# v4.16.21 — Soru düzenleyince filtre korunur (sınıf/ders tekrar seçilmesin)

## Sorun
Sorulara ünite/konu atarken: Sorular'ı sınıf/ders'e göre filtreleyip bir soruyu
DÜZENLE → kaydet yapınca liste filtresiz (Tümü) dönüyordu; her kayıttan sonra
sınıf/ders yeniden seçilmek zorunda kalınıyordu.

## Neden
Filtre URL query param'ında tutuluyor (filSinif/filDers/...). Ama:
- DÜZENLE linki bu paramları taşımıyordu.
- /soru-guncelle kaydetten sonra sabit '/admin?mod=soruListesi'e (filtresiz) dönüyordu.
(Not: /soru-durum-degistir'de v4.14.1'den beri "geri" kalıbı vardı; /soru-guncelle'de yoktu.)

## Çözüm — yalnız 3 nokta
- views/admin.ejs: soruListesi DÜZENLE linki artık filSinif/filDers/filUnite/filKonu/
  filCikti/filSurec'i taşır.
- views/admin.ejs: düzenleme formu (editSoru) bu filtreleri gizli input olarak POST eder.
- routes/admin.js: /soru-guncelle, req.body'deki filtrelerle '/admin?mod=soruListesi&...'
  şeklinde AYNI filtreye döner (mevcut v4.14.1 kalıbının aynısı).

Sonuç: filtrele → düzenle → kaydet → aynı filtreli listeye dön. Filtre dropdown'ları
da v4.16.15 fl_ cascade ile URL paramlarından geri yüklenir (sınıf/ders seçili kalır).

## %100 korunan
- Filtreleme mantığı, fl_ cascade, /soru-ekle, /soru-durum-degistir, diğer redirectler,
  cevap/servis/istatistik akışı, mevcut veri, satır sonları (admin.js LF, admin.ejs CRLF).

## Değişen dosyalar
- views/admin.ejs (DÜZENLE linki + gizli filtre alanları)
- routes/admin.js (/soru-guncelle filtreli redirect)
- package.json (4.16.20 -> 4.16.21)

## Test
- node --check admin.js geçti. admin.ejs ejs.compile ile derlendi.
- Redirect: dolu filtrede '/admin?mod=soruListesi&filSinif=6&filDers=Matematik&...';
  boş filtrede sade '/admin?mod=soruListesi' (simüle edildi).

## Git
```bash
git add -A
git commit -m "v4.16.21: Soru duzenleyince filtre korunur (sinif/ders tekrar secilmesin)"
git push
git tag v4.16.21
git push origin v4.16.21
```
