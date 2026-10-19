# v4.17.27-4 — Zorluk simülasyonu komutu (yalnız okur)

> Ara güncelleme. Uygulamanın çalışmasına dokunmaz; yalnız `scripts/zorluk-simulasyon.js` eklenir. `package.json` değişmedi.

## Ne işe yarar
"Soru istatistiği hesaplanırken her süre, o sorunun medyan süresinin N katıyla sınırlansın" kuralı uygulansaydı
bütün soruların Z/HP değerlerinin ve öğrencilerin LGS ortalaması ile sınıf sıralamasının nasıl değişeceğini gösterir.
Veritabanında hiçbir şey değiştirmez.

```
cd ~/lgssorucozum
node scripts/zorluk-simulasyon.js              # 3 x medyan sınırı
node scripts/zorluk-simulasyon.js --carpan=4   # 4 x medyan sınırı
node scripts/zorluk-simulasyon.js --csv        # ayrıca ~/zorluk-simulasyon.csv (bütün sorular, Excel'de açılır)
node scripts/zorluk-simulasyon.js --adlar      # öğrenci adlarını da yazar (varsayılan: ogr1, ogr2…)
```

## Gösterdikleri
- Özet: sınırı aşan süresi olan soru ve cevap sayısı, Z'si değişen soru sayısı (düşen/artan, fark dağılımı),
  HP'si %10'dan fazla değişen soru sayısı, ortalama HP.
- En çok değişen 30 soru: soru no, sınıf, ders, cevap sayısı, medyan ve en uzun süre, sınıra çekilen cevap, Z ve HP önce/sonra.
- Sınıf bazında öğrenci sıralaması (LGS ağırlıklı ortalama; sıralamaya giren öğrenciler): sırası değişen öğrenci sayısı,
  en büyük oynama, ilk 10'dan çıkan sayısı, birinci; en çok oynayan 8 öğrenci (sıra ve ortalama önce/sonra).
- "Şimdiki" değerler bu geceki hesabın bulacağı değerlerdir (cronJobs.js ile aynı formül, bugünkü veriyle).
- Yeni kuralda yalnız sorunun istatistiği (ortalama süre, süre sapması, süre kademeleri) sınırlanır; öğrencinin kendi
  süresi ve cevap kayıtları aynen kalır.

## Test (yerel demo)
- Gece hesabı çalıştırıldıktan hemen sonra `--dogrula` ile: "şimdiki" Z 62/62, HP 62/62, öğrenci LGS ortalaması 66/66
  kayıtlı değerlerle birebir aynı.
- 3 x medyan: 1 soruda 17 cevap sınıra çekildi, o sorunun HP'si 5,56 → 4,30; 8. sınıfta 2 öğrencinin sırası 1 basamak
  değişti. 2 x medyan: 16 soru, 55 cevap etkilendi. CSV Türkçe Excel biçiminde (ondalık virgül, ; ayraç) yazıldı.

## Değişen dosyalar
- scripts/zorluk-simulasyon.js (yeni)
- docs/surum-notlari/SURUM-NOTU-v4.17.27-4.md
