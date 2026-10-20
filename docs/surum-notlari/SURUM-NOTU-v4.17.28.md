# v4.17.28 — PDF'ten kırpılan soru görselleri keskin (yüksek çözünürlük, ekranda aynı boyut)

> Tam paket. `package.json` **4.17.28**. v4.17.27-4'ün üstüne gelir.

## Sorun
- "Görselli PDF yükle" sayfası PDF sayfasını ekrana 1,6 ölçekle (~115 dpi) çiziyor; kırpılan görsel bu düşük çözünürlüklü
  ekran görüntüsünden alınıyordu. 7–8 cm'lik bir şekil ~350 piksel kaydediliyordu. Telefonlarda ve ölçeklemeli ekranlarda
  tarayıcı bunu 2–3 kat büyüterek gösterdiği için görseller puslu görünüyordu; "büyüt"te daha da kötüydü.
- Cloudinary tarafında sıkıştırma yoktu; sorun kırpma anındaki çözünürlüktü.

## Ne değişti
1. **Kırpma (views/gorselli-pdf-yukle.ejs):** "Kes ve Yükle"ye basınca seçilen bölge, PDF sayfası arka planda **2,5 kat**
   daha yüksek çözünürlükte (~290 dpi) yeniden çizilerek kesilir. Çok büyük kesitlerde (8 MP üstü) 2 kat kullanılır.
   Ekrandaki seçim ve kullanım aynı. Yüksek çözünürlüklü çizim olmazsa eski yönteme döner.
2. **Yükleme (routes/gorselliPdfYukle.js, services/cloudinaryYukle.js):** Görsel Cloudinary'de `hd_<rastgele>_d250.png`
   (2 katta `_d200`) adıyla kaydedilir. Ad, görselin kaç kat yoğun olduğunu taşır. Diğer yüklemeler (duyuru vb.) değişmedi.
3. **Gösterim (public/js/hd-gorsel.js, yeni):** Bu görseller ekranda **eski boyutlarında** gösterilir (piksel ÷ 2,5);
   sayfa düzeni değişmez, görsel keskin olur. Mevcut sınırlar (%100 genişlik, 65vh/80vh yükseklik, şık görsellerinin
   sınırları) aynen geçerli; en-boy oranı korunur. Görsel boyutlanana kadar görünmez, yani büyük görünüp küçülme olmaz.
   Betik yüklenemezse görseller yine görünür (yalnız büyük).
   **Büyütme penceresi** görseli tam çözünürlükte gösterir (eskisinden büyük ve keskin).
   Eski görsellere ve diğer resimlere dokunulmaz.
4. Betik şu sayfalara eklendi: views/panel.ejs, views/takip-ogrenci-detay.ejs, views/admin-kullanici-detay.ejs,
   views/admin.ejs, views/gorselli-pdf-yukle.ejs (yalnız `<head>` içine bir satır).

## Önemli
- **Eski görseller kendiliğinden düzelmez**; düşük çözünürlükle kaydedildiler. Düzelmesi istenen soruların görselleri
  PDF'ten yeniden kırpılmalı.
- PDF'in kendisi taranmış/düşük çözünürlüklüyse o sınır aşılamaz; vektör çizimli PDF'lerde fark büyüktür.
- Dosyalar ~2,5 kat genişlik/yükseklikte olduğu için boyutları artar (PNG, şekiller için genelde birkaç yüz KB).

## Test (yerel demo, gerçek tarayıcı)
- Vektör çizimli bir PDF'te aynı bölge: eski yöntem 421×424 px, yeni 1052×1061 px; Cloudinary'ye `hd_…_d250` adıyla gitti.
- Ekrandaki boyut: masaüstünde eski 421×424, yeni 420×424; telefonda (412 px, DPR 3) eski 324×326, yeni 324×327 →
  düzen aynı. Telefondaki görüntüde yazılar ve çizgiler belirgin şekilde keskin.
- Büyütme penceresi yeni görseli tam çözünürlükte açtı (masaüstü 821×828).
- Soru çözme ekranında görsel, yüklenirken gizli kaldı ve doğrudan doğru boyutta göründü (büyükten küçülme yok).
- Yönetici, kullanıcı detay, takip ve öğrenci sayfaları hatasız açıldı.

## Değişen dosyalar (v4.17.27-4'e göre)
- Yeni: public/js/hd-gorsel.js
- views/gorselli-pdf-yukle.ejs, routes/gorselliPdfYukle.js, services/cloudinaryYukle.js
- views/panel.ejs, views/takip-ogrenci-detay.ejs, views/admin-kullanici-detay.ejs, views/admin.ejs (yalnız betik satırı)
- package.json (4.17.28), docs/surum-notlari/SURUM-NOTU-v4.17.28.md
