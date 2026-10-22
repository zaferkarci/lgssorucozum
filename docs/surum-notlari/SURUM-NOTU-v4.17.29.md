# v4.17.29 — Sıralama simülasyonu komutu (yalnız okur)

> Tam paket. Uygulamanın çalışmasına dokunmaz; `scripts/siralama-simulasyon.js` eklenir. `package.json` **4.17.29**.

## Ne işe yarar
Sınıf sıralaması farklı puan yöntemleriyle hesaplansaydı öğrencilerin (özellikle başarı oranı en yüksek olanların)
kaçıncı sırada olacağını yan yana gösterir. Veritabanında hiçbir şey değiştirmez.

```
cd ~/lgssorucozum
node scripts/siralama-simulasyon.js              # özet + her sınıfta en başarılı 10 öğrenci
node scripts/siralama-simulasyon.js --ilk=15     # her sınıfta 15 öğrenci
node scripts/siralama-simulasyon.js --tum        # sıralamaya giren tüm öğrenciler
node scripts/siralama-simulasyon.js --csv        # ayrıca ~/siralama-simulasyon.csv (Excel'de açılır)
node scripts/siralama-simulasyon.js --adlar      # öğrenci adlarıyla (varsayılan: ogr1, ogr2…)
```

## Yöntemler (ders bazında hesaplanır, LGS katsayılarıyla birleştirilir; sıralamaya girme şartı aynı)
- **SIMDI:** Bugünkü formül (ders puanı = toplam puan / cevaplanan soru; doğru cevap = Z × ortalama süre × hız × GE).
- **Y1:** Zorluk ağırlıklı başarı = doğru çözülen soruların Z toplamı / cevaplanan bütün soruların Z toplamı × 100.
- **Y2:** Y1 + küçük hız bonusu (ortalama sürenin altında çözülen doğru cevap en fazla %10 fazla sayılır).
- **Y3:** Normalleştirilmiş puan = her doğru cevabın bugünkü puanı / o sorunun ortalama puanı (HP).
- **Y4:** Yetenek tahmini (Rasch / 1PL, ders bazında).

## Çıktı
- Her sınıf için: başarı oranıyla, çözülen soruların zorluğuyla ve hızla sıralama uyumu (Spearman) — yöntem yöntem.
- Başarı oranına göre en başarılı öğrenciler: cevap sayısı, başarı, ortalama zorluk, hız ve her yöntemdeki sırası.
- Bugün ilk 5 sırada olanların diğer yöntemlerdeki sırası.

## Test (yerel demo)
- Gece hesabından hemen sonra `--dogrula`: SIMDI ortalaması kayıtlı değerle 67/67 öğrencide birebir aynı.
- CSV Türkçe Excel biçiminde (ondalık virgül, ; ayraç).

## Değişen dosyalar
- scripts/siralama-simulasyon.js (yeni)
- package.json (4.17.29), docs/surum-notlari/SURUM-NOTU-v4.17.29.md
