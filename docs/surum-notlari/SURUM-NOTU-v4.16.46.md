# v4.16.46 — Önemli Duyuru Pop-up (Sistem > Duyuru)

## İstek
Sistem menüsünde duyuru alanı: metin ve/veya görsel yüklenebilsin. Görsel yüklenirse
pop-up görselin kendi boyutunda, sadece metinse sayfanın ~1/4'ü kadar olsun; ikisi de
sayfanın tam ortasında. Arka plan ana ekran olsun ama BULANIK görünsün (site kapanmış
havası vermesin). Hazırlarken pop-up'ın sayfayı kilitleyeceği ya da kapatılabileceği
seçilebilsin. Hedefleme: tüm kullanıcılar / sınıf seviyesi / tek tek kullanıcı.

## Yapılanlar
### models/Duyuru.js (YENİ)
- aktif, metin, gorselUrl, kilitli, hedefTip ('hepsi'|'sinif'|'kullanicilar'),
  hedefSiniflar[], hedefKullanicilar[], olusturan, yayinTarih.
- Aynı anda yalnız BİR duyuru aktif (yeni yayınlanınca öncekiler pasife çekilir).

### server.js
- express.json/urlencoded limiti 100kb -> 12mb. (Duyuru görseli base64 POST edildiğinden
  varsayılan limit "413 Payload Too Large" verirdi.)

### routes/admin.js
- Duyuru require + mod='duyuru' için aktif duyuru ve hedefleme listesi (öğrenciler).
- POST /admin/duyuru-yayinla: metin + görsel (base64 -> Cloudinary 'lgs-duyuru' klasörü,
  mevcut services/cloudinaryYukle altyapısı) + kilitli + hedefleme. Doğrulamalar:
  en az metin veya görsel; 'sinif'/'kullanicilar' modunda en az bir seçim zorunlu.
  Görsel değiştirilmezse mevcut URL korunur.
- POST /admin/duyuru-kaldir: aktif duyuruyu yayından kaldırır.

### views/admin.ejs — Sistem > 📢 Duyuru
- Yayındaki duyurunun özeti (mod, hedef, metin, görsel) + "Yayından Kaldır".
- Form: metin alanı, görsel seç (anında önizleme), pop-up davranışı (Kapatılabilir /
  Kilitli), hedefleme (Tüm öğrenciler / sınıf seviyeleri 1-12+Mezun / arama kutulu
  kullanıcı listesi).

### routes/panel.js + views/panel.ejs — pop-up
- panel.js: aktif duyuru okunur, hedeflemeye göre bu kullanıcıya uygun mu kontrol edilir,
  uygunsa duyuruGoster olarak view'a geçer.
- panel.ejs: tam ekran katman, arka plan backdrop-filter: blur(7px) (ana ekran görünür
  ama bulanık), içerik dikey+yatay ortalanmış.
  * Görsel varsa: kendi boyutunda (max-width:100%, ekranı taşarsa max-height ile sığdırılır).
  * Sadece metin varsa: width 25vw (~sayfanın 1/4'ü), min 280px.
  * Kapatılabilir: "Tamam" butonu. Kilitli: buton YOK + body scroll kilitli.

## %100 korunan
- Mevcut oyun duyurusu pop-up'ı, diğer tüm kod. Sadece ekleme yapıldı.

## Test
- node --check (Duyuru/admin/panel/server) geçti.
- admin.ejs render: duyuru ekranı boş durumda ve aktif duyuru (kilitli+sınıf hedefli)
  durumunda; "9. Sınıf, Mezun" hedef etiketi doğru; ayarlar/sifirla/soruListesi regresyonsuz.
- panel.ejs pop-up render senaryoları: sadece metin (25vw, img yok), sadece görsel
  (img var, 25vw yok), ikisi birlikte, kilitli (Tamam butonu YOK + scroll kilidi),
  duyuru yok (çıktı boş) — hepsi doğrulandı.

## Kullanım
Admin → Sistem → 📢 Duyuru → metin ve/veya görsel + davranış + hedef seç → Yayınla.
Sınıf atlatma sırasında "Kilitli", işlem bitince "Kapatılabilir" duyuru yayınlayıp
sonra "Yayından Kaldır" diyebilirsin.

## Değişen/eklenen dosyalar
- models/Duyuru.js (yeni)
- server.js, routes/admin.js, routes/panel.js
- views/admin.ejs, views/panel.ejs
- package.json (4.16.45 -> 4.16.46)

## Git
```bash
git add -A
git commit -m "v4.16.46: Onemli Duyuru pop-up (metin/gorsel, kilitli mod, hedefleme)"
git push
git tag v4.16.46
git push origin v4.16.46
```
