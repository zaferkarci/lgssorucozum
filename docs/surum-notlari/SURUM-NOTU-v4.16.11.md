# v4.16.11 — v4.16.10 geri alındı (veli davet kartı + /veli/davet-uret iade) (TAM PROJE)

Çalışan TÜM proje. v4.16.10 üzerine kuruludur.

## Neden
v4.16.10'da YANLIŞ kart kaldırılmıştı. Kaldırılan: veli panelindeki
"🔗 Çocuğum üye değil — davet linki oluştur" kartı ve POST /veli/davet-uret
üretimi. Asıl kastedilen kart profil sekmesindeki "DAVET LİNKLERİN" idi (farklı yer).

## Bu sürümde
v4.16.10'daki iki değişiklik GERİ ALINDI (v4.16.9 haline döndürüldü):
1. views/panel.ejs — veli davet kartı geri eklendi (form + "+ Yeni davet linki üret"
   butonu + üretilen linkler listesi).
2. routes/panel.js — POST /veli/davet-uret yeniden kod üretir (orijinal hali).

Profil sekmesindeki "DAVET LİNKLERİN" kartına DOKUNULMADI (henüz). Başka hiçbir
şey değişmedi.

## Değişen dosyalar (v4.16.10 tabanına göre)
- views/panel.ejs   (veli davet kartı geri yüklendi = v4.16.9 hali)
- routes/panel.js   (/veli/davet-uret geri yüklendi = v4.16.9 hali)
- package.json      (4.16.10 -> 4.16.11)
panel.ejs ve panel.js, v4.16.9 ile BİREBİR aynı (diff ile doğrulandı).

## Test
- panel.js node --check; panel.ejs EJS compile geçti. CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.11: v4.16.10 geri alindi - veli davet karti ve /veli/davet-uret iade edildi"
git push
git tag v4.16.11
git push origin v4.16.11
```
