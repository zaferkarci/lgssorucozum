# v4.16.38 — Ölçeklenme: gece cron optimizasyonu (Adım 2)

## Sorun
Gece cron'unda (kullaniciPuanHesapla) HER CEVAP için ayrı Soru.findById + ayrı
kayit.save() yapılıyordu → toplam cevap sayısı kadar veritabanı gidiş-gelişi.
Kullanıcı/veri arttıkça gece işi katlanarak yavaşlıyordu (1 numaralı ölçek engeli).

## Çözüm — cronJobs.js (kullaniciPuanHesapla) + models/CevapKaydi.js
- Tüm sorular TEK sorguda belleğe (Map) alınır; her cevapta `Soru.findById` YERİNE
  `soruMap.get(...)`. Binlerce sorgu → 1 sorgu. (Adım 1 önce çalışıp güncel Z'yi
  yazdığı için Map güncel istatistikleri okur.)
- Kullanıcı cevapları `.lean()` ile okunur.
- CevapKaydi puan güncellemeleri tek tek `save()` yerine `bulkWrite` ile 500'lük
  toplu yazılır (bellek güvenli).
- Yeni index: CevapKaydi { kullaniciAdi: 1, tarih: 1 } — kullanıcı bazlı sıralı okuma.

## Formül DEĞİŞMEDİ
- Puan/Z/soruIndex/dersPuanlari çıktısı BİREBİR AYNI. Sadece veri okuma/yazma biçimi
  optimize edildi. Cron gece çalıştığı için canlıya risk en düşük.

## Karmaşıklık
- Önce: O(kullanıcı) + O(toplam cevap) sorgu + O(toplam cevap) yazma.
- Sonra: O(kullanıcı) sorgu + 1 Soru sorgusu + toplu (batched) yazma.

## %100 korunan
- Adım 1/3/4, formüller, diğer tüm kod. Sadece Adım 2 iç mekaniği + 1 index.

## Test
- node --check cronJobs.js & CevapKaydi.js geçti.
- Sayısal doğrulama: findById yöntemi ile Map yöntemi AYNI puanı üretti (17.7503=17.7503).

## Not
- Yeni index ilk deploy'da MongoDB tarafında oluşturulur (büyük koleksiyonda arka
  planda biraz sürebilir; sorgular bu sırada çalışmaya devam eder).

## Değişen dosyalar
- cronJobs.js
- models/CevapKaydi.js
- package.json (4.16.37 -> 4.16.38)

## Git
```bash
git add -A
git commit -m "v4.16.38: olceklenme - gece cron Adim 2 (Soru Map + bulkWrite + index)"
git push
git tag v4.16.38
git push origin v4.16.38
```
