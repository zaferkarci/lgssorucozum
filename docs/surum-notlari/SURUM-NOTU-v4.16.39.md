# v4.16.39 — Dosya bölme (1/n): admin.ejs soru-önizleme JS'i dışarı alındı

## Amaç
Büyük EJS dosyalarını küçültüp bakımı kolaylaştırmak. İlk güvenli dilim: admin.ejs
içindeki saf (EJS tag'i olmayan) soru-önizleme yardımcı script'i ayrı statik dosyaya.

## Yapılan
- admin.ejs'teki inline <script> bloğu (_soruOnizleHtml, soruOnizle, adminMathRender,
  soruPanelOnizle, soruKartiAktifYap, soruKartiSec, soruKutuToggle) → yeni dosya
  public/js/admin-soru-onizle.js. Yerine <script src="/js/admin-soru-onizle.js"> kondu.
- Fonksiyonlar global kalır; dış script AYNI konumda (satır 3419) yüklendiği için
  yürütme sırası korunur. Tüm çağrı yerleri onclick/onchange veya .then() callback'i
  (tembel) — yükleme anında senkron çağrılan yok, güvenli.
- Statik servis zaten var: app.use(express.static('public')) → /js/... erişilebilir.

## %100 korunan
- Fonksiyon gövdeleri birebir aynı; çağıran onclick/handler'lar değişmedi. Sadece
  tanım yeri EJS'ten .js dosyasına taşındı.

## Kazanım
- admin.ejs ~7.7 KB küçüldü; bu JS artık ayrı dosyada (düzenlemesi kolay, tarayıcı cache'ler).

## Test
- Taşınan JS: node --check geçti.
- admin.ejs render (soruListesi/soruEkle/soruDagilim/duello): hepsi OK, src var,
  inline tanım kalmadı.

## Değişen/eklenen dosyalar
- views/admin.ejs (blok -> src)
- public/js/admin-soru-onizle.js (YENİ)
- package.json (4.16.38 -> 4.16.39)

## Sıradaki dilimler (aday, saf/EJS'siz bloklar)
- admin.ejs 2885-3024, 2010-2082, 1909-1991, 2248-2319 ... (her biri ayrı test + paket)

## Git
```bash
git add -A
git commit -m "v4.16.39: dosya bolme 1 - admin soru-onizle JS ayri dosyaya"
git push
git tag v4.16.39
git push origin v4.16.39
```
