# v4.16.55 — Analiz cevapları günlük sayaca dahil edildi

## İstek
Seviye tespit (analiz) sırasında verilen cevaplar günlük hedef sayacına eklensin,
ilerleme çubuğu hareket etsin.

## Yapılanlar
### services/gunlukHedef.js
- CevapKaydi sorgusundaki `analiz: { $ne: true }` filtresi KALDIRILDI (v4.8.19'dan beri
  vardı). Artık analiz cevapları hem BUGÜNKÜ sayaca hem 30 GÜNLÜK ORTALAMAYA girer.
- Sonuç: kart analizde de ilerler (0/2 -> 1/2 -> 2/2), çubuk hareket eder.

### routes/panel.js (/cevap koruması)
- Standart limit korumasındaki analiz muafiyeti kaldırıldı — sayaç analizi dahil ettiği
  için koruma da tutarlı şekilde analizi kapsar.
- Cevap kaydındaki `analiz` bayrağı yazımı KORUNDU (analizModundaMi hâlâ kullanılıyor);
  yalnızca hedef sayımındaki filtre kalktı. Diğer analiz mantığı etkilenmedi.

## ÖNEMLİ DAVRANIŞ DEĞİŞİKLİĞİ
Standart üyenin günlük limiti artık analiz sorularını da kapsar: seviye tespitindeki
standart öğrenci günde yalnız (limit kadar, ör. 2) soru çözebilir; analiz süreci buna
bağlı olarak uzar. Bu, "ders fark etmeksizin günde 2 soru" kuralıyla tutarlıdır.
Premium üyelerde limit yüksek olduğundan etki sınırlıdır.

## %100 korunan
- Analiz akışının kendisi, `analiz` bayrağının kaydı, premium hedef formülü, puanlama,
  sıralama, diğer tüm kod.

## Test
- node --check (gunlukHedef/panel) geçti.
- Sahte model katmanıyla: sorguda analiz filtresi YOK; bugün 2 ANALİZ cevabı ->
  toplamBugun=2, toplamTamamlandi=true; 1 analiz + 1 normal -> toplamBugun=2.

## Değişen dosyalar
- services/gunlukHedef.js, routes/panel.js
- package.json (4.16.54 -> 4.16.55)
