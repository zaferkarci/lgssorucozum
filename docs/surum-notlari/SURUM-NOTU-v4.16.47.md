# v4.16.47 — Yedekleme: JSON yedek indir + geri yükle (Sistem > Yedekleme)

## İstek
Riskli işlemler (özellikle sınıf atlatma) öncesi geri dönülebilirlik. Panelden JSON
yedek indirme ve yeniden yükleme, Sistem menüsünde.

## Yapılanlar
### services/yedekleme.js (YENİ)
- `yedekAl()`: models/ klasöründeki TÜM modelleri dinamik yükler, her koleksiyonu okur,
  { surum, tarih, ozet[], veri{} } yapısında tam yedek üretir. Yeni model eklenince
  otomatik dahil olur — kod değiştirmeye gerek yok.
- `geriYukle(yedek, mod)`:
  * 'birlestir' (varsayılan): aynı _id'li kayıtların üzerine yazar (replaceOne+upsert),
    yedekte olmayan yeni kayıtlar korunur. Daha güvenli.
  * 'sifirla': koleksiyonu önce tamamen siler, sonra yedeği yazar (birebir kopya).
  * 500'lük gruplar halinde bulkWrite (bellek güvenli — Render 512MB'a uygun).
  * Yedekte olup modeli olmayan koleksiyonlar atlanır, rapora yazılır.

### routes/admin.js
- `uploadYedek` multer (memoryStorage, sadece .json, 200MB limit).
- GET /admin/yedek-al: JSON dosyası olarak indirir
  (lgs-yedek-YYYYAAGG-SSDD.json, Content-Disposition: attachment).
- POST /admin/yedek-geri-yukle: dosya + mod + onay metni ('GERI YUKLE') doğrulaması,
  ardından koleksiyon bazlı sonuç tablosu döner.

### views/admin.ejs — Sistem > 💾 Yedekleme
- "Yedeği İndir (JSON)" butonu.
- Geri yükleme formu: dosya seç + mod seçimi (Birleştir / Sıfırla ve yükle) +
  onay metni kutusu ("GERI YUKLE" yazılmadan gönderilmez) + JS confirm.

## Güvenlik önlemleri (yıkıcı işlem olduğu için)
- Onay metni zorunlu, JS confirm, kırmızı uyarı kutusu, varsayılan mod "Birleştir".

## %100 korunan
- Diğer tüm kod. Sadece ekleme yapıldı.

## Test
- node --check (yedekleme/admin) geçti.
- admin.ejs render: yedek ekranı (indir linki, form, iki mod, onay kutusu);
  duyuru/ayarlar/sifirla/soruListesi regresyonsuz.
- UÇTAN UCA test (sahte mongoose, bellek içi DB):
  * yedekAl: 3 koleksiyon + özet doğru.
  * Felaket senaryosu (bir kullanıcı silindi, biri bozuldu) -> 'birlestir' ile ikisi de
    birebir geri geldi.
  * 'sifirla' modu yedekte olmayan fazlalık kaydı temizledi.
  * Geçersiz JSON reddedildi.

## Kullanım
Admin → Sistem → 💾 Yedekleme → "Yedeği İndir". Sınıf atlatma gibi işlemlerden ÖNCE
mutlaka indir. Sorun olursa aynı ekrandan dosyayı yükleyip geri dön.
Not: Geri yükleme sonrası sıralamalar için "⏰ Hesapla" çalıştırılmalı.

## Değişen/eklenen dosyalar
- services/yedekleme.js (yeni)
- routes/admin.js, views/admin.ejs
- package.json (4.16.46 -> 4.16.47)

## Git
```bash
git add -A
git commit -m "v4.16.47: JSON yedek al + geri yukle (Sistem > Yedekleme)"
git push
git tag v4.16.47
git push origin v4.16.47
```
