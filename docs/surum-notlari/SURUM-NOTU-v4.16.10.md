# v4.16.10 — Veli davet linki üretimi durduruldu + davet kartı kaldırıldı (TAM PROJE)

Çalışan TÜM proje. v4.16.9 üzerine kuruludur.

## Değişiklik
1) views/panel.ejs — Veli panelindeki "🔗 Çocuğum üye değil — davet linki oluştur"
   KARTI (başlık, açıklama, "+ Yeni davet linki üret" butonu/formu ve üretilen
   davet linkleri listesi) TAMAMEN kaldırıldı.
2) routes/panel.js — POST /veli/davet-uret artık davet kodu ÜRETMEZ; yalnızca
   panele geri yönlendirir (route 404'e düşmesin diye korundu, ama üretim durdu).

Veli panelindeki diğer bölümler AYNEN korundu: "🔍 Çocuğum üye — öğrenci ekle"
kartı, çocuk listesi ve çıkış. Veli davet kodları veri yüklemesi ve veliKopyala
yardımcı fonksiyonu kod tabanında bırakıldı (artık kullanılmıyor, zararsız).

## Değişen dosyalar (v4.16.9 tabanına göre)
- views/panel.ejs   (veli davet kartı kaldırıldı)
- routes/panel.js   (/veli/davet-uret üretimi durduruldu)
- package.json      (4.16.9 -> 4.16.10)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- panel.js node --check; panel.ejs EJS compile geçti. Satır sonları CRLF korundu.
- Doğrulama: panel.ejs'te davet formu/butonu 0; endpoint referansKoduUret çağırmıyor;
  "öğrenci ekle" kartı ve çıkış yerinde.

## Git
```bash
git add -A
git commit -m "v4.16.10: veli davet linki uretimi durduruldu ve davet karti kaldirildi"
git push
git tag v4.16.10
git push origin v4.16.10
```
