# v4.7.2 — tablo/HTML görsel alanı düzeltmesi

Sadece **`views/gorselli-pdf-yukle.ejs`** değişti (+ package.json versiyon).
Sunucu/route/model değişmedi.

## Ne düzeldi
- Gemini bir tabloyu HTML olarak görsel alanına koyduğunda (kırık `<img>`
  görünüyordu) → analiz biter bitmez bu HTML otomatik olarak ilgili **metin**
  alanına taşınır (öncül resmi → öncül metni, şık görseli → şık metni), görsel
  alanı boşalır. Tablo verisi kaybolmaz, kırık görsel kalmaz.
- Görsel rozetleri artık **URL-duyarlı**: sadece `http(s)://` veya `/` ile
  başlayan değer "✓ Yüklendi" sayılır ve önizlenir. URL olmayan bir şey kalırsa
  "⚠️ görsel değil — kontrol et" uyarısı çıkar (kırık img yok).
- Kayıtta görsel alanına **URL olmayan hiçbir şey yazılmaz** (kırpılmamış
  "[GÖRSEL VAR]" veya stray metin otomatik boşaltılır, uyarı verilir).

## Kur
- `views/gorselli-pdf-yukle.ejs` ve `package.json`'ı repodakiyle değiştir, push.

## Menü hâlâ görünmüyorsa (admin.ejs)
Link çalışıyor ama menüde "🖼️ Görselli PDF Yükle" yoksa, `admin.ejs` repoda
güncellenmemiş demektir. Mevcut `📄 PDF Yükle` linkinin hemen ALTINA şu satırı
ekle (zip'teki admin.ejs'te zaten var):

```html
<a href="/admin/gorselli-pdf-yukle" class="admin-alt-link">🖼️ Görselli PDF Yükle</a>
```
Sonra Ctrl+F5 ile zorla yenile.

## Git
```bash
git add -A
git commit -m "v4.7.2: gorsel alanindaki tablo/HTML otomatik metne tasinir, URL-duyarli rozet"
git push
git tag v4.7.2
git push origin v4.7.2
```
