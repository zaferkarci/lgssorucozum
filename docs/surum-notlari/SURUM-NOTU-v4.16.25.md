# v4.16.25 — Soru/şık görselleri büyük + tıkla-büyüt (lightbox)

## Sorun
Soru görselleri max-height (220–280px) ile sınırlandığından detaylı görseller
küçük görünüp okunmuyordu. Şık görselleri de küçüktü (100–150px).

## Çözüm — views/panel.ejs (sadece görüntü)
- Tam ekran LIGHTBOX (gorselBuyut/gorselKapat) eklendi; görsele tıkla → tam
  ekran, karartılmış alana tıkla → kapan. Mobilde pinch-zoom çalışır.
- Soru resmi: max-height 280px → 80vh + tıkla-büyüt.
- Öncül resimleri (1/2/3, iki render yolu): max-height 180/200px → 65vh + tıkla-büyüt.
- Önizleme popup soru görseli: 220px → 70vh + tıkla-büyüt.
- Şık görselleri: büyütüldü (150px → 100%/300px, önizlemede 100px → 200px) ve
  her şık görselinin yanına "🔍 büyüt" düğmesi eklendi.
  - Öğrenci CEVAP butonundaki şık görseli: büyüteç span'i preventDefault+
    stopPropagation ile çalışır → büyütme cevap GÖNDERMEZ (görsele tıklamak yine
    cevabı seçer, sadece büyüteç ayrı).

## %100 korunan
- Görsel verisi (soruResmi, soruOnculuNResmi, secenekler.gorsel), doğru cevap/
  şık eşleşmesi, /cevap akışı, puan/istatistik, diğer tüm kod.
- Sadece görsellerin boyutu + tıkla-büyüt eklendi. Satır sonları (CRLF) korundu.

## Değişen dosyalar
- views/panel.ejs (lightbox + img boyutları + şık büyüteçleri)
- package.json (4.16.24 -> 4.16.25)

## Test
- panel.ejs ejs.compile ile derlendi.
- 9 tıkla-büyüt çağrısı (soru+6 öncül+2 önizleme), 6 şık büyüteci.
- Eski sınırlar (280/150/100px) kaldırıldı. Büyüteç span'i img'den hemen sonra
  (previousElementSibling) — render ile doğrulandı. CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.25: Soru/sik gorselleri buyuk + tikla-buyut lightbox"
git push
git tag v4.16.25
git push origin v4.16.25
```
