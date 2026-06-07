# v4.7.0 — Görselli PDF Yükle (ÇEKİRDEK)

Mevcut "PDF Yükle" akışına **dokunulmadı**. Yanına yeni bir "Görselli PDF Yükle"
sayfası eklendi. Soru çıkarımı (`/pdf-analiz`) ve kayıt (`/pdf-sorulari-kaydet`)
mevcut route'ları **aynen** kullanır; tek yeni sunucu işi kırpılan görseli
Cloudinary'ye yükleyip URL döndürmektir. **Soru modeli değişmedi.**

## Dosyalar

YENİ:
- `services/cloudinaryYukle.js`
- `routes/gorselliPdfYukle.js`
- `views/gorselli-pdf-yukle.ejs`

DEĞİŞEN (cerrahi):
- `admin.ejs`        → kenar menüye 1 satır link
- `package.json`     → versiyon 4.7.0 + `cloudinary` bağımlılığı

## Kurulum (3 adım)

1) Paketi kur (Render zaten deploy'da otomatik kurar; yerelde):
   ```
   npm install
   ```

2) **server.js**'e tek satır ekle — mevcut `pdfyukle` route'unun yanına:
   ```js
   app.use(require('./routes/gorselliPdfYukle'));
   ```
   (pdfyukle.js nasıl mount edildiyse aynı şekilde; route içeride tam yol
   tanımlıyor: `/admin/gorselli-pdf-yukle` ve `/gorselli-gorsel-yukle`.)

3) Render env değişkenleri (zaten eklediysen atla):
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
   `GEMINI_API_KEY` (bu sonuncu mevcut PDF yükleme için zaten gerekliydi).

## Kullanım

Admin > kenar menü > 🖼️ Görselli PDF Yükle
1. Sınıf/ders seç, PDF yükle → "Yapay Zeka ile Analiz Et".
2. Sorular listelenir. Görseli olan her alanda "📌 Görsel bekliyor" rozeti çıkar.
3. İlgili alanda **🖼️ Kırp** → açılan pencerede PDF sayfasında şeklin üstüne
   fareyle dikdörtgen çiz → **Kes ve Yükle**. Görsel Cloudinary'ye gider,
   URL otomatik o alana yazılır (artık git'e elle yükleme yok).
4. İstersen "veya URL yapıştır" kutusuyla elle link de girebilirsin (eski yöntem korunur).
5. **Veritabanına Kaydet**.

Not: kırpmadığın "[GÖRSEL VAR]" alanları kayıtta boş bırakılır (uyarı verilir),
böylece literal işaret URL olarak kaydedilmez.

## Çekirdekte OLMAYAN (sonraki faz: "düzenleme")

- Gemini'nin önerdiği kutunun hazır gelmesi (otomatik kutu).
- Çizilen kutuyu tutamaçlarla sürükle/yeniden boyutlandırma.
- Soru→sayfa otomatik eşleme (şu an kırpma penceresinde tüm sayfalar görünür,
  şeklin olduğu sayfada çizersin).

## Git

```bash
git add -A
git commit -m "v4.7.0: gorselli pdf yukle cekirdek - kirp + cloudinary upload"
git push
git tag v4.7.0
git push origin v4.7.0
```
