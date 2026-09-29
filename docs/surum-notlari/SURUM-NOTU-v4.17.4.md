# v4.17.4 — Referans kodu yazdırma (kesip dağıtılabilir kartlar)

## İhtiyaç
Veli sunumunda ~120 veliye davet kodu dağıtmak. Kodların yazdırılıp kesilebileceği
bir çıktı gerekiyordu.

## Yeni uç: GET /admin/referans-yazdir?tip=veli&adet=120
- Belirtilen tipte KULLANILMAMIŞ kodları listeler.
- Yeterli kod yoksa **eksik kadarını otomatik üretir** (mevcut referansKoduUret ile).
- Yazdırmaya hazır sayfa döner:
  * A4'e 3x4 = 12 kart; kesikli çerçeveler kesme çizgisi görevi görür.
  * Her kartta: marka, rol etiketi ("Veli Davet Kodu"), **QR kod**, kodun kendisi
    ve tam bağlantı (`SITE_URL/kayit?ref=KOD`).
  * QR, qrcodejs ile tarayıcıda üretilir (CDN erişilemezse kart yine kod+link ile basılır).
  * Yazdırma CSS'i: başlık/butonlar gizlenir, kartlar sayfa bölünmesine karşı korunur.
- Bağlantı adresi `SITE_URL`'den alınır (yoksa istek host'u) — taşıma sonrası
  otomatik olarak elcezeri.net üretir.

## Arayüz — views/admin.ejs (Referans ekranı)
- "Kod Üret" formunun altına ayrı bir bölüm: adet + tip seçimi + "Kart Çıktısı Al"
  (yeni sekmede açılır).

## Uyarı (sayfada da yazılı)
Kodlar tek kullanımlıktır ve liste kullanılmamış kodlardan gelir. Aynı çıktı ikinci kez
alınırsa AYNI kodlar çıkar — dağıtıldıktan sonra tekrar yazdırılmamalı.

## Test
- node --check admin.js geçti; admin.ejs derlendi.
- Kart HTML üretimi izole test edildi: kart sayısı, link biçimi
  (https://elcezeri.net/kayit?ref=KOD), QR data-link ve kod görünürlüğü doğrulandı.

## Değişen dosyalar
- routes/admin.js, views/admin.ejs
- package.json (4.17.3 -> 4.17.4)
