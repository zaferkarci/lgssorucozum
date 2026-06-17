# v4.16.5 — Analiz cevap kuralları: denetim + geriye dönük yeniden hesap (TAM PROJE)

Çalışan TÜM proje. v4.16.4 üzerine kuruludur.

## Denetim (kuralların ne kadarı zaten sağlanıyor?)
İstenen kurallar ve mevcut durum (KODDA İZLENDİ):

1. Analiz sorularından PUAN alsın — ZATEN SAGLANIYOR.
   routes/panel.js /cevap: dogru cevapta `k.puan += kazanilanPuan` (1313) ve
   `dersPuanlari` (1356) analiz durumuna BAKILMADAN guncellenir. Gece cron'u
   (kullaniciPuanHesapla) analiz filtresi olmadan tum dogru cevaplari toplar.

2. Ders istatistiklerine girsin/gozuksun — ZATEN SAGLANIYOR.
   panel.js dersIstatMap (694) ve cron dersMap analiz filtresi icermez.

3. ALTIN alsin — ZATEN SAGLANIYOR (otomatik).
   altin = round(Kullanici.puan) - harcananAltin; puan analiz'i icerdigi icin
   altin da otomatik yansir.

4. Cevaplarinda sorulari gorsun — ZATEN SAGLANIYOR.
   "Cozulen Sorular" listesi tumCevaplar/tumC uzerinden doner (analiz filtresi
   yok); analiz sorulari puani/sonucu/"Soruyu Gor" ile listede gorunur.

5. Gunluk hedef YALNIZ analiz sonrasi cevaplarla belirlensin — ZATEN SAGLANIYOR.
   services/gunlukHedef.js: hedef sorgusu `analiz: { $ne: true }` ile analiz
   cevaplarini saymaz. (Tek kasitli dislama burasi; istenen de bu.)

Sonuc: 5 kuralin TAMAMI ileri yonde zaten sağlanıyor. Analiz cevaplari /cevap
aninda puan/dersPuanlari'na islendiginden ve tum okuma/yeniden-hesaplar
CevapKaydi'ni analiz dahil okudugundan, GECMIS analiz cevaplari da zaten sayilir.

## Geriye dönük uygulama (yeni araç)
Gece cron'u disinda elle tetiklenecek bir yol yoktu. Eklendi:
- GET /admin/puan-yeniden-hesapla (yalniz admin): kullaniciPuanHesapla'yi calistirir;
  TUM ogrencilerin puan + dersPuanlari + CevapKaydi.kazanilanPuan degerlerini,
  ANALIZ dahil tum dogru cevaplardan yeniden kurar. Boylece kurallar gecmise
  donuk uygulanir/dogrulanir. Gunluk hedef hesabi DEGISMEZ.
- cronJobs.js: kullaniciPuanHesapla disa aktarildi (mevcut gunlukHesapla korundu).

Deploy sonrasi bir kez: /admin/puan-yeniden-hesapla adresini ac (admin oturumu).

## Değişen dosyalar (v4.16.4 tabanına göre)
- cronJobs.js     (kullaniciPuanHesapla export — additive)
- routes/admin.js (GET /admin/puan-yeniden-hesapla — additive)
- package.json    (4.16.4 -> 4.16.5)
Mevcut mantik DEGISMEDI; yalniz ekleme yapildi (diff ile dogrulandi).

## Test
- cronJobs.js + admin.js node --check gecti. Satir sonlari korundu
  (cronJobs CRLF, admin LF — orijinal formatlar).

## Git
```bash
git add -A
git commit -m "v4.16.5: analiz cevap kurallari denetimi + geriye donuk puan yeniden hesap endpointi"
git push
git tag v4.16.5
git push origin v4.16.5
```
