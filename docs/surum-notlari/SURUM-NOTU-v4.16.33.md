# v4.16.33 — Admin Düello ekranı (rumuz↔kullanıcı + düello istatistikleri + soru önizleme)

## İstek
Admin olarak (1) düello istatistiklerini, (2) rumuzların kime ait olduğunu,
(3) düello yapılan sorunun önizlemesini ve çözüm sürelerini görmek.

## Yapılanlar
### models/DuelloKayit.js (YENİ)
- Düello sonuçları için ayrı koleksiyon: sinif, saldiranAd/Rumuz, rakipAd/Rumuz,
  soruId (ref Soru), saldiranSure, rakipSure, kazananAd, tarih.

### routes/oyun.js (düello loglama — mantığa dokunmadan)
- /oyun/duello sonucunda (res.json öncesi) bir DuelloKayit.create eklendi.
  Kendi try/catch'i var; loglama hatası düelloyu bozmaz. Mevcut düello akışı aynen korundu.

### routes/admin.js (veri)
- OyunOyuncu / OyunHucre / DuelloKayit require edildi.
- mod==='duello' icin duelloVeri: oyuncular (+hucreSayisi), kayitlar (son 300),
  oyuncu bazli istatistik (toplam/galip/maglup), sinif filtresi (dSinif), dSiniflar.

### views/admin.ejs (ekran)
- Yeni "⚔️ Düello" mod blogu: sinif filtresi + "Oyuncular (Rumuz↔Kullanıcı)" tablosu
  (rumuz, kullanici, sinif, renk, hucre, son saldiri) + "Düello istatistikleri"
  (oyuncu bazli toplam/galip/maglup/oran) + "Son düellolar" (tarih, saldiran, rakip,
  kazanan, süreler, "Önizle" butonu). Soru önizleme modali + duelloSoruOnizle(id)
  (/api/soru/:id → _soruOnizleHtml + adminMathRender). İçerik menüsüne "⚔️ Düello" linki.

## Önemli not
- Düello sonuçları önceden HİÇBİR yere kaydedilmiyordu; istatistikler **bu sürümden
  itibaren** birikir. Geçmiş düellolar getirilemez. Rumuz↔kullanıcı tablosu ise
  mevcut OyunOyuncu verisinden HEMEN dolu gelir.

## %100 korunan
- Düello oyun mantığı, puanlama, diğer tüm rotalar/şablonlar. Sadece ekleme yapıldı.
  admin.ejs CRLF, admin.js/oyun.js LF korundu.

## Test
- node --check (oyun/admin/model) geçti.
- admin.ejs GERÇEK render testi (mock duelloVeri): tablolar, oran %, tek "Önizle"
  butonu (yalniz soruId olan kayitta), soruId yoksa "-" — hepsi dogrulandi.

## Değişen/eklenen dosyalar
- models/DuelloKayit.js (yeni)
- routes/oyun.js, routes/admin.js, views/admin.ejs
- package.json (4.16.32 -> 4.16.33)

## Git
```bash
git add -A
git commit -m "v4.16.33: Admin Duello ekrani (rumuz-kullanici + istatistik + soru onizleme)"
git push
git tag v4.16.33
git push origin v4.16.33
```
