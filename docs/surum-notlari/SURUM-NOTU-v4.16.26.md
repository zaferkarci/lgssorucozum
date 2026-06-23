# v4.16.26 — Admin "Soru Önizleme" modalında da büyük görsel + tıkla-büyüt

## Sorun (v4.16.25 eksik kalmıştı)
v4.16.25'te görselleri SADECE öğrenci panelinde (panel.ejs) büyüttüm. Ama
admin/kullanıcıların gördüğü "🔍 Soru Önizleme" modalı AYRI bir fonksiyonla
(views/admin.ejs → _soruOnizleHtml) render ediliyor ve ona hiç dokunulmamıştı.
Bu yüzden önizlemede görseller hâlâ küçük, tıklanamaz görünüyordu.

## Çözüm — views/admin.ejs (sadece görüntü)
- admin.ejs'e kendi tam ekran LIGHTBOX'ı + gorselBuyut/gorselKapat eklendi.
- _soruOnizleHtml öncül görselleri: max-height 200/250px → 65vh + tıkla-büyüt.
- _soruOnizleHtml şık görselleri: 150px / max-width:100% → büyük (100%/300px/50vh)
  + tıkla-büyüt. (Önizleme şıkları <div> içinde, cevap butonu değil — doğrudan
  tıkla-büyüt güvenli.)

## Kapsam (artık tam)
- Öğrenci paneli (panel.ejs): v4.16.25 — soru/öncül tıkla-büyüt, şık büyüteç.
- Admin önizleme modalı (admin.ejs): v4.16.26 — öncül/şık büyük + tıkla-büyüt.

## %100 korunan
- Görsel verisi, doğru cevap işaretleme, önizleme mantığı, diğer tüm kod.
- Sadece görsel boyutu + tıkla-büyüt. Satır sonları (CRLF) korundu.

## Test
- admin.ejs ejs.compile ile derlendi.
- _soruOnizleHtml GERÇEK render edildi (mock soru): öncül + her iki şık türünde
  onclick+zoom çıktı, eski 200px kalktı. Lightbox + gorselBuyut mevcut.

## Git
```bash
git add -A
git commit -m "v4.16.26: Admin Soru Onizleme modalinda buyuk gorsel + tikla-buyut"
git push
git tag v4.16.26
git push origin v4.16.26
```
