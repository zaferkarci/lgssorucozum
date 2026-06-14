# v4.11.1 — Her kullanıcı yalnız kendi sınıf gezegenini görür (TAM PROJE)

Çalışan TÜM proje. v4.11.0 üzerine kuruludur.

## Değişiklik
Öğrenci/demo kullanıcılar yalnız KENDİ sınıf seviyesindeki gezegeni (dünyayı)
görebilir. Zaten oyuncuCoz tüm oynama uçlarında öğrencinin sınıfını zorluyordu
(başka sınıf verisi gelmiyordu); bu sürüm kabuk URL'sini de kanonikleştirir:
- routes/oyun.js, GET /oyun/:sinif: admin değilse ve URL'deki sınıf kendi sınıfından
  farklıysa, öğrenci kendi dünyasına (/oyun/<kendi-sinif>) yönlendirilir.

Böylece bir öğrenci /oyun/8 gibi bir adrese gitse bile kendi sınıf gezegenine döner.
Admin önizlemesi tüm dünyaları görmeye devam eder.

## Değişen dosyalar (v4.11.0 tabanına göre)
- routes/oyun.js   (shell'de kanonik yonlendirme)
- package.json     (4.11.0 -> 4.11.1)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/oyun.js node --check geçti; EOL korundu (CRLF, stray LF: 0).

## Git
```bash
git add -A
git commit -m "v4.11.1: ogrenci yalniz kendi sinif gezegenini gorur (kanonik yonlendirme)"
git push
git tag v4.11.1
git push origin v4.11.1
```
