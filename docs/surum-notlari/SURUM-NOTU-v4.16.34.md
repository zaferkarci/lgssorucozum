# v4.16.34 — 3 iyileştirme (eşleşmeyen sorular listesi · şık dizilim yatay · üstte kaydet)

## 1) Eşleşmeyen soruları listeleme (Soru Dağılımı)
- Uyarıdaki "N soru eşleşmiyor" yanına "Hangileri? Göster" butonu eklendi.
- Yeni uç nokta: GET /admin/eslesmeyen-sorular — Üniteler'de tanımlı
  sinif|ders|unite|konu anahtarına UYMAYAN sorular; her satırda "Düzenle ▶" linki
  (/admin?duzenle=<id>&mod=soruEkle). Sayaçla birebir aynı anahtar mantığı.
- routes/admin.js (yeni endpoint), views/admin.ejs (buton + sdEslesmeyenGoster fonksiyonu,
  soruDagilim IIFE içine, esc ile birlikte).

## 2) Şık dizilim varsayılanı YATAY (yan yana)
- views/admin.ejs: sikDizilimi select'inde yeni/boş sorular artık "Yatay (Yan Yana)"
  seçili gelir. Kayıtlı değeri olan sorular kendi değerini korur (dikey/yatay/ikili).

## 3) Düzenleme sayfasında ÜSTTE Kaydet butonu
- views/admin.ejs: düzenleme formunun başına (önizlemenin hemen altına) "💾 Kaydet"
  butonu eklendi (yalnız editSoru varken). Aynı formu gönderir; alttaki KAYDET aynen durur.

## %100 korunan
- Dağılım hesabı, form alanları, kaydetme mantığı, diğer tüm kod. Sadece ekleme/ayar.
  admin.ejs CRLF korundu.

## Test
- node --check admin.js geçti.
- GERÇEK render testleri (ejs):
  - soruDagilim: buton + liste kutusu + fonksiyon (esc ile aynı IIFE) + gömülü JS sözdizimi.
  - şık dizilim: yeni=yatay, boş=yatay, dikey=dikey, yatay=yatay, ikili=ikili.
  - üst kaydet: düzenlemede "💾 Kaydet" var, yeni soruda yok; alt KAYDET her ikisinde.

## Değişen dosyalar
- routes/admin.js
- views/admin.ejs
- package.json (4.16.33 -> 4.16.34)

## Git
```bash
git add -A
git commit -m "v4.16.34: eslesmeyen sorular listesi + sik dizilim yatay + ustte kaydet"
git push
git tag v4.16.34
git push origin v4.16.34
```
