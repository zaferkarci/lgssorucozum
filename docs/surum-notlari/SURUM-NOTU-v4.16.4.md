# v4.16.4 — Duello metinlerinde "dusman" yerine "rakip" (TAM PROJE)

Çalışan TÜM proje. v4.16.3 üzerine kuruludur. Yalnız kullanıcı metni.

## Değişiklik
Oyun/duello metinlerinde kullaniciya gorunen "dusman" ifadesi "rakip" ile
degistirildi (daha yumusak bir dil):
- Kurallar penceresi: "komsu bir RAKIP hucresine tiklayarak duello..."
- Duello onay penceresi: "Bu rakip hucresine duello acmak ister misin?"
- Hata mesaji: "Yalniz kendi topragina komsu rakip hucresine duello acabilirsin."

Ic kod (degisken adi `dusman`, kod yorumu) AYNEN korundu — kullaniciya gorunmez,
davranis degismedi.

## Değişen dosyalar (v4.16.3 tabanına göre)
- routes/oyun.js   (3 kullanici-metni: dusman -> rakip)
- package.json     (4.16.3 -> 4.16.4)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- oyun.js node --check geçti. Satir sonu korundu (CRLF).

## Git
```bash
git add -A
git commit -m "v4.16.4: duello metinlerinde dusman yerine rakip"
git push
git tag v4.16.4
git push origin v4.16.4
```
