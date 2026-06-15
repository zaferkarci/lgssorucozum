# v4.14.1 — Soru durum butonları küçük tasarım + işlem sonrası filtre korunur (TAM PROJE)

Çalışan TÜM proje. v4.14.0 üzerine kuruludur.

## 1) Küçük buton tasarımı
Sorular listesindeki hızlı durum aksiyonları artık kompakt, ikonlu küçük butonlar:
- ▶ Yayinla  (yesil #2e7d32)
- ⏸ Duraklat (turuncu #ef6c00)
- ✎ Taslak   (gri-mavi #546e7a)
Daha kucuk padding/font (11px), yuvarlatilmis kose. (views/admin.ejs, inline stil.)

## 2) İşlem sonrası filtre KORUNUR (son sorguda kal)
Önceden bir soruyu yayinla/duraklat/taslak yapinca liste `/admin?mod=soruListesi`'ye
(filtresiz) donuyor, sinif/ders/unite/konu secimini her seferinde yeniden yapmak
gerekiyordu. Artik:
- Kartlardaki durum formlari mevcut filtreyi action'a tasir
  (`/soru-durum-degistir?filSinif=..&filDers=..&filUnite=..&filKonu=..`).
- routes/admin.js: /soru-durum-degistir, islem sonrasi AYNI filtreyle
  `/admin?mod=soruListesi&filSinif=..` adresine geri doner.
Boylece son yapilan sorgu (filtre) korunur; her seferinde yeniden secim gerekmez.

## Değişen dosyalar (v4.14.0 tabanına göre)
- routes/admin.js   (/soru-durum-degistir redirect'i filtreyi korur)
- views/admin.ejs   (kucuk buton tasarimi + action'da _filtreQS)
- package.json      (4.14.0 -> 4.14.1)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- admin.js node --check, admin.ejs ejs.compile gecti; satir sonlari korundu
  (admin.ejs CRLF, admin.js LF — orijinal formatlar).
- Degisiklik sayilari dogrulandi: 9 action + 9 buton (3'er tip), 1 _filtreQS.

## Git
```bash
git add -A
git commit -m "v4.14.1: soru durum butonlari kucuk tasarim + islem sonrasi filtre korunur"
git push
git tag v4.14.1
git push origin v4.14.1
```
