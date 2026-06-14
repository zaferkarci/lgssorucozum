# v4.12.0 — Öğrenci hesabı yapışkan admin yüzünden önizlemeye düşmesin (TAM PROJE)

Çalışan TÜM proje. v4.11.1 üzerine kuruludur.

## Sorun
"ulkemkarci" gibi bir ÖĞRENCİ hesabı, oyunda tüm 5/6/7/8 gezegenlerini görüyor ve
çok yüksek altına sahip görünüyordu (admin önizleme davranışı).

Kök neden: `adminGirisli` session bayrağı YAPIŞKAN. Geliştirici aynı tarayıcıda bir
kez /admin'e (Basic Auth) girince bayrak kalıcı oluyor; sonra aynı tarayıcıda bir
öğrenci hesabıyla girilince oyunun `adminMi` kontrolü hâlâ true görüyor ve öğrenciyi
ADMIN ÖNİZLEMESİNE (tüm dünyalar + test altını) sokuyordu.

## Çözüm
routes/oyun.js `oyuncuCoz`: artık ÖNCE oturum kullanıcısına bakıyor. Oturumdaki
kullanıcı gerçek ogrenci/demo ise, admin Basic-Auth aynı tarayıcıda yapışkan kalsa
bile KENDİ kimliğiyle, KENDİ sınıf gezegeninde, GERÇEK altınıyla (puan-harcanan)
oynar; admin araçları gösterilmez. Admin önizleme (tüm dünyalar + test altını +
araçlar) yalnız ogrenci/demo oturumu OLMAYAN saf admin için geçerli.

GET /oyun seçicisi de aynı mantığı kullanır: öğrenci/demo oturumu kendi gezegenine
yönlendirilir (yapışkan admin olsa bile); tüm-dünya seçicisi yalnız saf admin
önizlemesinde gösterilir.

Not: Bu düzeltme ogrenci/demo rollü hesaplar içindir. Eğer ulkemkarci gercekten
moderator/admin ROLLÜ bir hesapsa, oyun onu (rolü geregi) onizleme olarak gormeye
devam eder — o durumda hesabin rolu/sinifi gozden gecirilmeli.

## Değişen dosyalar (v4.11.1 tabanına göre)
- routes/oyun.js   (oyuncuCoz oturum onceligi + picker)
- package.json     (4.11.1 -> 4.12.0)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/oyun.js node --check geçti; EOL korundu (CRLF, stray LF: 0).
- oyuncuCoz simulasyonu: ogrenci+yapiskan-admin -> admin:false + kendi sinifi;
  saf admin -> onizleme; normal ogrenci -> kendi sinifi; moderator+admin ->
  onizleme; anonim -> ok:false. Hepsi dogru.

## Git
```bash
git add -A
git commit -m "v4.12.0: ogrenci oturumu yapiskan admin yuzunden onizlemeye dusmesin"
git push
git tag v4.12.0
git push origin v4.12.0
```
