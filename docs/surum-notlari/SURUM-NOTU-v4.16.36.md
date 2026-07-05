# v4.16.36 — Telafi raporunda kopyaları AÇILABİLİR link + durum

## Sorun
Tekrar Soru Telafisi (kuru çalışma) raporunda kopyaların yalnızca NUMARASI vardı;
soruların kendisi açılıp görülemiyordu (özellikle taslak/arşiv durumda olanlar
listede fark edilmiyordu).

## Çözüm — routes/admin.js (/admin/duplicate-telafi)
- Rapordaki "Tutulan No" ve her "Kopya No" artık TIKLANIR link:
  /admin?duzenle=<id>&mod=soruEkle (yeni sekme). Bu, soruyu _id ile açar; editSoru
  findById ile yüklendiğinden durum (yayinda/taslak/arsiv) ne olursa olsun çalışır.
- Her kopyanın yanında DURUM etiketi gösterilir (ör. (arsiv), (taslak)).
- Böylece kopyaların kendisi doğrudan görülüp incelenebilir.

## Not (soruNo hakkında)
- Telafi kopyaları SİLMEZ, ARŞİVLER (durum='arsiv'); satır durduğu için soruNo
  serbest kalmaz (bu bilinçli — tek çözen kullanıcıların meşru puanları korunur).
  Numarayı boşa çıkarmak istenirse silme gerekir, ama bu meşru çözümleri de siler.

## %100 korunan
- Telafi mantığı, puanlama, diğer tüm kod. Sadece rapor HTML'i (link + durum).

## Test
- node --check admin.js geçti. Rapor link üretimi mock ile doğrulandı
  (asıl + kopyalar tıklanır, durum etiketi görünür).

## Değişen dosyalar
- routes/admin.js
- package.json (4.16.35 -> 4.16.36)

## Git
```bash
git add -A
git commit -m "v4.16.36: telafi raporunda kopyalar acilabilir link + durum"
git push
git tag v4.16.36
git push origin v4.16.36
```
