# v4.7.1 — "Cannot GET" düzeltmesi + güvenli görsel yükleme

v4.7.0'da iki şey eksikti, ikisi de bu sürümde çözüldü:

1. **`server.js`'e route mount satırı eklenmemişti** → "Cannot GET" sebebi buydu.
   Artık 700. satırda mevcut.
2. **Menü görünmüyordu** çünkü değişen `admin.ejs` repoya alınmamıştı.
3. **Bonus düzeltme:** global `express.json()` 100 KB sınırı, JSON ile gönderilen
   kırpılmış görseli reddederdi (413). Görsel yükleme artık `multer` (multipart)
   ile gidiyor; bu sınırı tamamen baypas eder ve daha küçük/hızlıdır.

## ⚠️ ÖNEMLİ — bu sefer DEĞİŞEN mevcut dosyaları da repoya koy

Geçen sefer büyük ihtimalle sadece YENİ dosyalar eklendi, DEĞİŞEN dosyalar
güncellenmedi. Bu 3'ünü repodakiyle **değiştir**:

- `server.js`      ← +1 satır (route mount)
- `admin.ejs`      ← +1 satır (menü linki)
- `package.json`   ← versiyon 4.7.1 + cloudinary

YENİ dosyalar (zaten ekliydiyse üzerine yaz):
- `routes/gorselliPdfYukle.js`   (multer'lı yeni sürüm)
- `views/gorselli-pdf-yukle.ejs` (FormData'lı yeni sürüm)
- `services/cloudinaryYukle.js`

## Kontrol listesi

1. Yukarıdaki 6 dosyayı repoya koy.
2. `git add -A && git commit && git push` → Render deploy.
3. Render env'de var mı: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`.
4. Deploy bitince: `.../admin/gorselli-pdf-yukle` açılmalı **ve** admin menüsünde
   "🖼️ Görselli PDF Yükle" görünmeli (Ctrl+F5 ile zorla yenile).

## Git

```bash
git add -A
git commit -m "v4.7.1: gorselli pdf yukle mount + multipart gorsel yukleme fix"
git push
git tag v4.7.1
git push origin v4.7.1
```
