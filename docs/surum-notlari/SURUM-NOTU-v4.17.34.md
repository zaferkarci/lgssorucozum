# Sürüm Notu — v4.17.34

**Tarih:** 5 Kasım 2026
**Tür:** Günün ilk güncellemesi (tam paket, package.json 4.17.34)

## Kurum yöneticisi: sınıf sayfasından öğrenci istatistiği

- **Kurum Üyeleri › Sınıf** (ör. 5/A) sayfasındaki "Sınıftaki Öğrenciler" tablosunda öğrenci adları tıklanabilir;
  ayrıca her satıra **İstatistik →** düğmesi eklendi. Tıklayınca öğrencinin ders istatistikleri sayfası açılır
  (öğretmenlerin gördüğü sayfanın aynısı).
- Detay sayfasındaki geri bağlantısı bu yoldan gelindiğinde **← Sınıfa Dön** olur ve aynı sınıf sayfasına döner
  (sayfa numaraları arasında gezinirken de korunur).

### Erişim
- Kurum yöneticisi artık **kendi kurumuna bağlı** her öğrencinin istatistiğini görebilir; sınıfa öğretmen olarak
  atanmış olması veya takip ilişkisi gerekmez.
- Başka kurumun öğrencisi için erişim yok (403). Öğretmen ve veli kuralları değişmedi.
- Geri dönüş adresi yalnız `/panel/...` yolunu kabul eder (dış siteye yönlendirme yapılamaz).

## Değişen dosyalar
- `routes/takip.js` — kurum yöneticisi erişim kuralı, `donus` (geri dönüş) adresi
- `views/takip-ogrenci-detay.ejs` — "← Sınıfa Dön" bağlantısı, sayfalama bağlantılarında geri dönüş korunur
- `views/panel.ejs` — sınıf sayfası öğrenci tablosu: tıklanabilir adlar ve "İstatistik →"
- `package.json` — 4.17.34
- `docs/surum-notlari/SURUM-NOTU-v4.17.34.md` — bu not

## Test (demo)
- Kurum yöneticisi (sınıfa atanmamış) 8/A sayfasında öğrenci adına tıkladı → istatistik sayfası açıldı, "← Sınıfa Dön" sınıfa döndü.
- Başka kurumun öğrencisi → 403. Zararlı geri dönüş adresi (//evil.com) yok sayıldı.
- Veritabanı değişmedi.
