# v4.16.29 — Hızlı geçişte istediğin soruya doğrudan atlama

## İstek
Geçişlerde sadece Önceki/Sonraki değil, istenen soruya doğrudan gidebilmek.

## Yapılanlar — views/admin.ejs
- Düzenleme sayfası navigatöründeki "i / N" sayacı, filtredeki TÜM soruları
  listeleyen bir açılır menüye (select) dönüştürüldü. Her seçenek:
  "<sıra>. soru · No: <soruNo>". Seçilince o sorunun düzenleme sayfası açılır
  (filtre parametreleri korunur). Mevcut soru seçili gelir; yanında "/ N" toplam.
- ◀ Önceki / Sonraki ▶ / Listeye dön aynen korundu.

## %100 korunan
- Navigatör (v4.16.27), önizleme (v4.16.28), düzenleme formu, filtre, diğer kod.
- Sadece merkez sayaç → açılır menü. CRLF korundu.

## Test
- admin.ejs ejs.compile ile derlendi.
- Navigatör render edildi: menüde tüm sorular, mevcut seçili, her seçenek doğru
  düzenleme URL'si + filtre; onchange ile gidiş; Önceki/Sonraki korunuyor; "/ N".

## Değişen dosyalar
- views/admin.ejs (sayaç → soruya git açılır menüsü)
- package.json (4.16.28 -> 4.16.29)

## Git
```bash
git add -A
git commit -m "v4.16.29: Hizli geciste istenen soruya dogrudan atlama (acilir menu)"
git push
git tag v4.16.29
git push origin v4.16.29
```
