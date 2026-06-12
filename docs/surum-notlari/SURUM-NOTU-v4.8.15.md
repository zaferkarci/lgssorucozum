# v4.8.15 — Görselli PDF tamamlanınca "Sorular Sayfasına Git" butonu (TAM PROJE)

Çalışan TÜM proje. v4.8.14 üzerine kuruludur.

## Ne eklendi
Görselli PDF yükleme akışında, sorular kaydedilip "ADIM 3: başarı" ekranı çıkınca,
artık "📋 Sorular Sayfasına Git" butonu var (mevcut "📄 Yeni PDF Yükle" butonunun
yanında). Bu buton doğrudan admin sorular listesine (`/admin?mod=soruListesi`) götürür.

## Değişen dosyalar (v4.8.14 tabanına göre)
- views/gorselli-pdf-yukle.ejs  (başarı ekranına yönlendirme butonu)
- package.json                  (4.8.14 → 4.8.15)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- EJS derleme geçti; CRLF korundu (stray LF: 0).

## Git
```bash
git add -A
git commit -m "v4.8.15: gorselli pdf basari ekranina sorular sayfasi butonu"
git push
git tag v4.8.15
git push origin v4.8.15
```
