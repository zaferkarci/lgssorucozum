# v4.16.14 — Öğrenme Çıktısı + Süreç Bileşeni: TEMEL + Yeni Soru Ekle ekranı (TAM PROJE)

Çalışan TÜM proje. v4.16.13 üzerine kuruludur. "Yol 2" (konuya bağlı, otomatik
dolan) yaklaşımının 1. adımı: veri temeli + soru GİRİŞ ekranlarından ilki.

## Bu sürümde yapılanlar

### Veri modeli (eskiye dokunulmadan)
- models/Unite.js → `konuDetay` eklendi:
    konuDetay: [{ konu, ciktilar: [{ kod, metin, surecler: [{ harf, metin }] }] }]
  `konular: [String]` AYNEN korundu. Eski kayıtlarda konuDetay boş gelir.
- models/Soru.js → `ogrenmeCiktisi` ve `surecBileseni` (String) eklendi.
  Eski soruların değerleri DEĞİŞMEZ; yeni alanlar boş kalır.

### Excel hattı (routes/admin.js)
- /unite-excel-yukle (parser): 6.-7. sütun (Öğrenme Çıktıları + Süreç Bileşenleri)
  okunur; konuDetay üretilir. Boş konu satırı önceki konuya bağlanır (çoklu çıktı).
  Süreç hücresi a/b/c/ç... maddelerine ayrılır. `konular` çıktısı eskisiyle BİREBİR
  (benzersiz konu adları). Test edildi.
- /unite-kaydet: konuDetay da kaydedilir.
- /unite-sablon-indir: konuDetay 6.-7. sütuna dışa aktarılır (round-trip test edildi).
- /api/unite-bilgi: DOKUNULMADI — tam döküman döndürdüğü için konuDetay otomatik gelir.

### Yeni Soru Ekle ekranı (views/admin.ejs)
- Konu altına iki cascading select: "Öğrenme Çıktısı" (se_cikti) ve
  "Süreç Bileşeni" (se_surec). Konu seçilince çıktılar, çıktı seçilince a/b/c
  maddeleri otomatik gelir. Düzenleme modunda mevcut değerler geri yüklenir.
- Cascade JS: konuDegisti() + ciktiDegisti() eklendi; sinif/ders/uniteDegisti
  imzaları hedefCikti/hedefSurec taşıyacak şekilde genişletildi.
- /soru-ekle + /soru-guncelle: ogrenmeCiktisi + surecBileseni kaydeder.

## %100 korunan
konular şeması ve tüm tüketicileri (panel ünite/konu ağacı, istatistik, günlük
hedef, konu izinleri, soru dağılımı, kayıtlı üniteler tablosu), mevcut soru ve
ünite verisi, soru-ekle/guncelle'nin diğer tüm alanları, satır sonu düzeni
(Unite/Soru/admin.ejs CRLF; admin.js mevcut düzen), ilgisiz tüm kod.

## SONRAKİ ADIMLAR (aynı desen, bağımlılık sırasıyla)
Bu altı-kademeli cascade aşağıdaki ekranlara da taşınacak:
- PDF Yükle (pdfYukle) ve Görselli PDF Yükle (serbest metin → dropdown)
- Soru Dağılımı (soruDagilim)
- Sorular (soruListesi) ve Zorluk Raporu (zorlukRapor) — şu an sayfa yenileyen
  filtre; client-side otomatik cascade'e çevrilecek + çıktı/süreç filtresi
- (İstenirse) Konu İzinleri
Not: Filtre/rapor ekranları çıktı/süreç'e göre ancak sorular bu bilgiyi taşıdıktan
sonra anlamlı süzebilir; o yüzden giriş tarafı (bu sürüm) önce geldi.

## Değişen dosyalar
- models/Unite.js, models/Soru.js
- routes/admin.js (parser, unite-kaydet, sablon-indir export, soru-ekle, soru-guncelle)
- views/admin.ejs (soruEkle formu + cascade JS)
- package.json (4.16.13 -> 4.16.14)

## Test
- node --check: admin.js, Unite.js, Soru.js geçti.
- EJS: admin.ejs ejs.compile ile derlendi (sözdizimi OK).
- Parser: 7 sütunlu örnek → konuDetay doğru (çoklu çıktı, Türkçe ç) maddesi, konular dedup).
- Export: konuDetay → 7 sütun, çoklu çıktı satırlara yayıldı, round-trip uyumlu.
- Diff: modeller ve admin.ejs'te yalnız hedeflenen satırlar değişti; CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.14: Ogrenme Ciktisi + Surec Bileseni temel + Yeni Soru Ekle ekrani"
git push
git tag v4.16.14
git push origin v4.16.14
```
