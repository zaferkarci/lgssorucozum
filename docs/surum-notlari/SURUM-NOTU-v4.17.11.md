# v4.17.11 — ACİL: silinen 3 admin ucu geri yüklendi · Kesme Tarihi aracı · takip istatistiklerinde kesme

## 1) REGRESYON DÜZELTMESİ (önemli)
v4.17.8'de telafi ucu yeniden yazılırken, iki çıpa ARASINDA kalan üç uç yanlışlıkla
silinmişti:
- `/admin/sinif-atlat` (Sınıf Atlatma)
- `/admin/sinif-kurtar` (Sınıf Kurtarma)
- `/admin/oyun-temizle` (Oyun Temizliği)

Menüdeki bağlantılar duruyordu ama sayfalar 404 veriyordu. Üçü de v4.17.7 paketinden
birebir geri yüklendi; varlıkları grep ile doğrulandı.

## 2) YENİ: Kesme Tarihi aracı (Sistem > 📅 Kesme Tarihi)
**Sorun:** Sınıf/ders istatistikleri `sonSinifAtlamaTarihi`'nden sonraki cevapları
sayar. Bu alan BOŞ olan öğrencilerde (ör. sınıfı elle veya Sınıf Kurtarma ile
düzeltilenler) geçen yılın cevapları da sayılmaya devam ediyordu — "colak'ın 5. sınıf
istatistikleri duruyor" şikâyetinin sebebi buydu.

**Araç:** Tüm öğrencilerin sınıf + kesme tarihi listesini gösterir; tarihi boş olanları
kırmızı işaretler. Seçilen bir tarihi "sadece boş olanlara" veya "tüm öğrencilere"
uygular. Öneri: öğretim yılı başlangıcı (ör. 01.09.2026).

**Not:** Cevap kayıtları SİLİNMEZ; yalnız istatistik hesabı o tarihten başlar.
Soru istatistikleri (zorluk, ortalama süre) etkilenmez.

## 3) takip.js istatistiklerine kesme eklendi
Öğretmen/veli takip ekranındaki öğrenci istatistikleri iki sorguda da kesme tarihi
olmadan çalışıyordu; ikisine de `tarih: { $gte: sonSinifAtlamaTarihi }` eklendi.
Ayrıca konu etiketi `konu || unite || 'Genel'` yapıldı (v4.16.43 ile tutarlı).

## Test
- node --check (admin + takip) geçti; admin.ejs derlendi.
- Uç kontrolü: sinif-atlat / sinif-kurtar / oyun-temizle / kesme-tarihi /
  duplicate-telafi / duplicate-cift / referans-yazdir / yedek-al — hepsi mevcut.
- Sistem menüsü render: 5 bağlantı da görünüyor.

## Kullanım
Admin → Sistem → 📅 Kesme Tarihi → tarihi gir (ör. 01.09.2026) → "Sadece tarihi boş
olanlara" → Uygula. Ardından ⏰ Hesapla.

## Değişen dosyalar
- routes/admin.js, routes/takip.js, views/admin.ejs
- package.json (4.17.10 -> 4.17.11)
