# v4.13.2 — Her öğrenci KENDİ sınıf gezegenini görür (grade-8 zorlaması kaldırıldı) (TAM PROJE)

Çalışan TÜM proje. v4.13.1 üzerine kuruludur.

## Sorun
v4.13.1'de eklenen `/oyun -> /oyun/8` yönlendirmesi, öğrenci-oturumu olarak
çözülemeyen her istekte (oturumda öğrenci girişi yoksa / yapışkan admin) kullanıcıyı
8. sınıf gezegenine gönderiyordu. Bu yüzden "tüm öğrenciler 8. sınıfı görüyor"
durumu oluşuyordu.

## Çözüm
O sabit `/oyun/8` yönlendirmesi KALDIRILDI. Artık:
- Oturumdaki öğrenci/kullanıcı KENDİ sınıf seviyesine (Kullanici.sinif — soruların
  filtrelendiği aynı alan) göre yönlendirilir: 5->/oyun/5, 6->/oyun/6, 7->/oyun/7,
  8->/oyun/8.
- Tüm-dünya seçicisi (YONETICI ONIZLEMESI) yalnız oturumda sınıflı kullanıcı OLMAYAN
  saf admin içindir; gerçek öğrenciler buraya hiç düşmez.

Hiçbir yerde öğrenci için sabit 8. sınıf varsayılanı yoktur (doğrulandı).

## Değişen dosyalar (v4.13.1 tabanına göre)
- routes/oyun.js   (picker'daki sabit /oyun/8 yonlendirmesi kaldirildi)
- package.json     (4.13.1 -> 4.13.2)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/oyun.js node --check geçti; EOL korundu (CRLF, stray LF: 0).

## Dogrulama (lutfen boyle test edin)
GIZLI (incognito) pencere acin (yapiskan admin olmasin), bir 5. sinif ogrenci
hesabiyla giris yapip /oyun'a gidin -> /oyun/5 (5. sinif gezegeni) acilmali.
6/7/8 icin de ayni: kendi siniflarini gorurler.

## Git
```bash
git add -A
git commit -m "v4.13.2: ogrenci kendi sinif gezegenini gorur - sabit grade-8 yonlendirmesi kaldirildi"
git push
git tag v4.13.2
git push origin v4.13.2
```
