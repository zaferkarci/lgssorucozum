# Sürüm Notu — v4.17.35

**Tarih:** 6 Kasım 2026
**Tür:** Günün ilk güncellemesi (tam paket, package.json 4.17.35)

## Öğrenci adına tıklayınca ders istatistikleri (tüm listelerde)

Öğretmen, veli ve kurum yöneticisi, öğrencisini gördüğü listelerde artık **öğrencinin adına tıklayarak**
ders istatistikleri sayfasına geçebilir. Açılan sayfanın sağ üstündeki **← Geri Dön** bağlantısı gelinen listeye döner.

| Sayfa | Kim görür |
|---|---|
| Takip › Takip Ettiğim Öğrenciler | öğretmen, veli |
| Sınıflarım (atandığım sınıflar) | öğretmen |
| Veli Paneli › çocuklar | veli |
| Kurum Üyeleri › Kuruma Bağlı Öğrenciler | kurum yöneticisi |
| Kurum Üyeleri › Sınıf (ör. 5/A) | kurum yöneticisi (v4.17.34) |
| Son 1 Ay — Günlük 2 Soru takvimi | öğretmen, veli, kurum yöneticisi (zaten vardı) |

- Takip listesinde puanlar 4 basamağa yuvarlanır (önce 179.63289999999998 gibi görünüyordu).
- **Erişim kuralları değişmedi:** öğretmen yalnız takip ettiği / atandığı sınıftaki öğrenciyi, veli yalnız kendi çocuğunu,
  kurum yöneticisi yalnız kendi kurumundaki öğrenciyi açabilir. Bekleyen istekler, sıralamalar ve "Davet Ettiklerim"
  listelerindeki adlar bağlantı değildir (bu kişilerin istatistiğine erişim yok).
- Geri dönüş adresi yalnız `/panel/...` yolunu kabul eder.

## Değişen dosyalar
- `views/panel.ejs` — Kurum Üyeleri, Veli Paneli, Sınıflarım ve Takip listelerinde öğrenci adları bağlantı; takip listesinde puan yuvarlama
- `views/takip-ogrenci-detay.ejs` — geri bağlantısı "← Geri Dön" (farklı listelerden gelinebildiği için)
- `package.json` — 4.17.35
- `docs/surum-notlari/SURUM-NOTU-v4.17.35.md` — bu not

## Test (demo)
- Kurum yöneticisi: Kurum Üyeleri ve atanmadığı 8/B sınıfı → ad bağlantıları açıldı, "← Geri Dön" aynı listeye döndü.
- Öğretmen: Sınıflarım ve Takip → açıldı. Sınıfında olmayan öğrenci → 403.
- Veli: Veli Paneli → kendi çocuğu açıldı. Başka öğrenci → 403.
- Veritabanı değişmedi.
