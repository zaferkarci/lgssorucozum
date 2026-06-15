# v4.13.1 — Öğrenciler ASLA başka sınıf gezegenini görmesin (kesin) (TAM PROJE)

Çalışan TÜM proje. v4.13.0 üzerine kuruludur.

## Sorun
/oyun adresinde bazı kullanıcılar hâlâ "YONETICI ONIZLEMESI" seçicisini (tüm 5/6/7/8
dünya linkleri) görüyordu. Sebep: o oturum admin (adminGirisli=true, yapışkan) idi ve
oyuncuCoz'un öğrenci dalı yalnız rol == 'ogrenci'/'demo' olanları yakalıyordu; rolü
farklı (ör. kurumsal/moderator) ama sınıfı olan bir hesap ya da oturum kullanıcısı
olmayan admin, ADMIN ÖNİZLEMESİNE (tüm dünyalar) düşüyordu.

## Çözüm (iki katman)
1. routes/oyun.js `oyuncuCoz`: Oturumda kullanıcı varsa ve sınıf seviyesi (5-8)
   belirliyse, ROLÜ NE OLURSA OLSUN (ogrenci/demo/kurumsal/moderator...) yalnız KENDİ
   gezegeninde oynar (admin:false). Yapışkan admin (adminGirisli) olsa bile tüm-dünya
   önizlemesine DÜŞEMEZ. Önizleme yalnızca oturumda sınıflı kullanıcı OLMAYAN saf
   admin (Basic-Auth) içindir.
2. GET /oyun seçicisi: Çıplak /oyun ARTIK ASLA tüm dünyaları listelemez. Tüm-dünya
   seçicisi yalnızca açık istekle (/oyun?yonetici=1) gösterilir; saf admin çıplak
   /oyun'da tek bir dünyaya (/oyun/8) yönlendirilir (istediği dünyaya /oyun/<sinif>
   ile gidebilir).

Sonuç: Sınıfı olan hiçbir kullanıcı (gerçek öğrenciler dahil) başka sınıfın gezegenini
göremez; çıplak /oyun hiç kimseye tüm dünyaları listelemez.

## Değişen dosyalar (v4.13.0 tabanına göre)
- routes/oyun.js   (oyuncuCoz rol genislemesi + picker ?yonetici=1 kapisi)
- package.json     (4.13.0 -> 4.13.1)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/oyun.js node --check geçti; EOL korundu (CRLF, stray LF: 0).
- oyuncuCoz simulasyonu: ogrenci7+sticky-admin -> kendi(7); kurumsal6+sticky-admin ->
  kendi(6) (ARTIK kilitli); moderator8 -> kendi(8); saf admin -> onizleme;
  gecersiz-sinif+admin -> onizleme; gecersiz-sinif normal -> kapali. Hepsi dogru.

## Onemli (test ipucu)
Geliştirici tarayicisinda bir kez /admin'e (Basic Auth) girilince adminGirisli
YAPISKAN kalir. Ogrenci deneyimini dogru gormek icin GIZLI (incognito) pencerede,
yalnizca ogrenci hesabiyla giris yaparak test edin. Artik o ogrenci yalniz kendi
sinif gezegenini gorur.

## Git
```bash
git add -A
git commit -m "v4.13.1: sinifi olan her kullanici yalniz kendi gezegeni; ciplak /oyun tum dunyalari listelemez"
git push
git tag v4.13.1
git push origin v4.13.1
```
