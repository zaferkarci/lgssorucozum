# v4.16.48 — ACİL: Sınıf atlatma kaskad hatası düzeltmesi + Sınıf Kurtarma aracı

## HATA (v4.16.44-47'de mevcuttu)
/admin/sinif-atlat sınıfları ARTAN sırada güncelliyordu. 5->6 yapıldıktan sonra 6->7
adımı, az önce 6'ya taşınan öğrencileri DE yakaladı; zincirleme itilme sonucu TÜM
öğrenciler en üst sınıfa (9) toplandı.

Simülasyonla birebir doğrulandı:
  ESKİ (artan):  a:9 b:9 c:9 d:9   <- hatalı
  YENİ (azalan): a:6 b:7 c:8 d:9   <- doğru

## DÜZELTME — routes/admin.js (/admin/sinif-atlat)
- Güncellemeler artık AZALAN sırada yapılıyor (önce 8->9, sonra 7->8, 6->7, 5->6).
  Hedef sınıf her zaman zaten işlenmiş olduğundan çakışma imkansız.

## YENİ: Sınıf Kurtarma — GET /admin/sinif-kurtar
Hatadan etkilenen veriyi onarır (yedek yoksa da çalışır):
- Cevap kayıtları sınıf atlatmada SİLİNMEDİĞİ için, her öğrencinin geçmiş cevaplarındaki
  soruların sınıf seviyesine bakılır; en çok çözdüğü seviye eski sınıfı kabul edilir,
  +1 eklenerek doğru atlatılmış hali yazılır (12 -> Mezun).
- Hiç cevap kaydı olmayan öğrenciye DOKUNULMAZ (elle düzeltilmeli) — yanlış tahmin riski
  alınmaz.
- Kuru çalışma (varsayılan): kullanıcı bazlı tablo — şu anki sınıf, tahmini eski sınıf,
  olması gereken, kanıt (cevap adedi), durum. ?uygula=1 ile yazar.
- Sistem menüsüne "♻️ Sınıf Kurtarma" linki.

## Not
Puan/ders istatistiklerinin sıfırlanması sınıf atlatmanın BEKLENEN davranışıydı
(istenen özellik). Bu araç yalnızca Sınıf alanını onarır.

## Test
- node --check admin.js geçti.
- Kaskad simülasyonu: hata yeniden üretildi, düzeltme doğrulandı.
- Kurtarma simülasyonu: 5.sınıftan gelen -> 6, 6'dan gelen -> 7, 8'den gelen zaten
  doğru (9), cevapsız kullanıcı dokunulmadı.

## Değişen dosyalar
- routes/admin.js, views/admin.ejs
- package.json (4.16.47 -> 4.16.48)

## Git
```bash
git add -A
git commit -m "v4.16.48: ACIL sinif atlatma kaskad duzeltmesi + Sinif Kurtarma araci"
git push
git tag v4.16.48
git push origin v4.16.48
```
