# v4.16.57 — Her çözüm aktiflik sayılır (analiz cevapları pasiflik eşiğine dahil)

## İstek
"Her soru aktiflik sayılsın." v4.16.55'te günlük hedef kartı analiz cevaplarını saymaya
başlamıştı, ancak SIRALAMA pasiflik eşiği hâlâ analizi hariç tutuyordu — kartta görünen
ortalama ile sıralamada kullanılan ortalama farklıydı.

## Yapılanlar — analiz filtresi İKİ yerden birden kaldırıldı
### cronJobs.js (gece sıralama hesabı, ~satır 219)
- 30 günlük aktiflik aggregate'inden `analiz: { $ne: true }` kaldırıldı.

### routes/panel.js (CANLI sıralama fallback, ~satır 567)
- Aynı aggregate burada da vardı. Yalnız cron düzeltilseydi, cache bayatken çalışan
  canlı hesap farklı sonuç verecek ve admin/profil tutarsızlığı geri dönecekti.
  İkisi birden hizalandı.

## Sonuç
Artık TEK bir "30 günlük ortalama" tanımı var: tüm cevaplar (analiz dahil) sayılır.
Günlük hedef kartı, premium'un artan limiti, sıralama pasiflik eşiği ve canlı sıralama
hesabı aynı sayıyı kullanır.

## Davranış etkisi
Analiz (seviye tespit) aşamasındaki öğrenci artık "aktif" sayılır ve pasiflik eşiği
nedeniyle sıralamadan düşmez. Simülasyon: 6 analiz cevabı olan yeni öğrenci —
ESKİ: pasif sayılıyordu, YENİ: sıralamaya girer.

## %100 korunan
- Puanlama, sıralama sıralama mantığı, analiz akışı, `analiz` bayrağının kaydı,
  diğer tüm kod. Yalnız iki aggregate filtresi kaldırıldı.

## Test
- node --check (cronJobs/panel) geçti.
- Kod tabanında aktif `analiz: { $ne: true }` filtresi kalmadı (grep ile doğrulandı;
  kalan tek eşleşme bir yorum satırı).
- Simülasyon: analiz dahil sayımda yeni öğrenci 6 cevapla aktif sayılıyor.

## Değişen dosyalar
- cronJobs.js, routes/panel.js
- package.json (4.16.56 -> 4.16.57)
