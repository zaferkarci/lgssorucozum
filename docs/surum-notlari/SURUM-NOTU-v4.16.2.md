# v4.16.2 — "Tüm üniteler / Tüm konular" kartları kaldırıldı (TAM PROJE)

Çalışan TÜM proje. v4.16.1 üzerine kuruludur. Yalnız UI değişikliği.

## Değişiklik
Kart tabanlı ünite/konu seçiminde yeşil "▶ Tüm üniteler (bu dersi çöz)" ve
"▶ Tüm konular (bu üniteyi çöz)" kartları kaldırıldı. Akış artık net:
Ders → Ünite → Konu (çözmeye başlamak için konuya inilir).

Not: Tüm dersi çözmek isteyen, üstteki "veya bir ders seç" kart grid'inden
ilgili dersi seçerek devam edebilir (o akış aynen duruyor).

## Değişen dosyalar (v4.16.1 tabanına göre)
- views/panel.ejs   (iki "Tümünü çöz" kart satırı kaldırıldı)
- package.json      (4.16.1 -> 4.16.2)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- panel.ejs ejs.compile; kart istemci JS izole syntax — geçti.
- Kalan "Tüm üniteler/konular" kart referansı: 0. Satır sonu korundu (CRLF).

## Git
```bash
git add -A
git commit -m "v4.16.2: tum uniteler ve tum konular kartlari kaldirildi"
git push
git tag v4.16.2
git push origin v4.16.2
```
