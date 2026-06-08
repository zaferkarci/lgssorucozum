# v4.7.3 — TAM PAKET (hepsi bir arada)

Görselli PDF Yükle özelliğinin tüm dosyaları. Zip'teki klasör yapısı, repondaki
yapıyla birebir aynı. Aşağıdaki 6 dosyayı repoya **aynı yollara** kopyala
(üzerine yaz), sonra tek push.

## Dosyalar → repo yolu

| Zip'teki | Repodaki yol | Durum |
|---|---|---|
| `server.js`                    | `server.js`                       | DEĞİŞTİ (700. satıra mount) |
| `admin.ejs`                    | `admin.ejs` (views/ neredeyse oraya) | DEĞİŞTİ (144. satıra menü linki) |
| `package.json`                 | `package.json`                    | DEĞİŞTİ (4.7.3 + cloudinary) |
| `routes/gorselliPdfYukle.js`   | `routes/gorselliPdfYukle.js`      | YENİ |
| `services/cloudinaryYukle.js`  | `services/cloudinaryYukle.js`     | YENİ |
| `views/gorselli-pdf-yukle.ejs` | `views/gorselli-pdf-yukle.ejs`    | YENİ |

> NOT: `admin.ejs` ve `package.json` v4.6.12 tabanından türetildi. O tarihten
> sonra bu iki dosyada BAŞKA değişiklik yaptıysan, üzerine yazınca onlar kaybolur.
> Emin değilsen bu ikisini elle düzenle (aşağıda satırlar var), gerisini kopyala.

### admin.ejs'e elle eklemek istersen
`📄 PDF Yükle` linkinin hemen ALTINA:
```html
<a href="/admin/gorselli-pdf-yukle" class="admin-alt-link">🖼️ Görselli PDF Yükle</a>
```
### server.js'e elle eklemek istersen
`app.use('/', require('./routes/pdfyukle'));` satırının hemen ALTINA:
```js
app.use('/', require('./routes/gorselliPdfYukle'));
```
### package.json
- `"version": "4.7.3"`
- dependencies'e: `"cloudinary": "^2.5.1"`

## Deploy (sıra ÖNEMLİ)

```bash
# 1) Dosyaları repoya kopyaladıktan SONRA, repo klasöründe:
git status          # <-- bu 6 dosya "modified/new" olarak GÖRÜNMELİ
                    #     "nothing to commit" diyorsa dosyalar repoya kopyalanmamış demektir!
git add -A
git commit -m "v4.7.3: gorselli pdf yukle - tam paket"
git push            # <-- hata dönerse (rejected/auth) deploy olmaz; çıktıyı oku
git tag v4.7.3
git push origin v4.7.3
```

## En sık "deploy olmuyor" sebebi
`git status` "nothing to commit, working tree clean" diyorsa: dosyaları indirme
klasöründen **repo klasörüne kopyalamayı atlamışsındır**. Zip'i açıp içindekileri
gerçekten repo dizinine koy, sonra `git status`'ın bu 6 dosyayı listelediğini gör.

## Doğrulama (push sonrası)
1. GitHub'da repoyu aç → `admin.ejs` → içinde `gorselli-pdf-yukle` görünüyor mu?
2. Render → Events/Deploys → yeni bir deploy bugün başladı mı, "live" mı?
3. Render env: CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET / GEMINI_API_KEY var mı?
4. Site açılınca admin menüde "🖼️ Görselli PDF Yükle" + Ctrl+F5.
