# Sürüm Notu — v4.17.34-1

**Tarih:** 5 Kasım 2026
**Tür:** Aynı gün güncellemesi (package.json 4.17.34). v4.17.34 henüz yüklenmediği için ikisi birlikte tam paket olarak verildi.

## Öğrencinin "Çözülen Sorular" listesi: yeniden eskiye

- Öğrencinin kendi panelindeki **İstatistik › Çözülen Sorular** tablosu (doğru/yanlış, puan, tarih, **Soruyu Gör**)
  eskiden en eski cevapla başlıyordu; son çözülen soruyu görmek için son sayfaya gitmek gerekiyordu.
- Liste artık **yeniden eskiye** sıralı: son çözülen soru ilk sayfanın en üstünde.
- Öğretmen/veli/kurum yöneticisinin gördüğü öğrenci detay sayfası ve admin kullanıcı detayı zaten yeniden eskiye sıralıydı; değişmedi.
- Yalnız tablonun sırası değişti; istatistik hesapları değişmedi.

## Değişen dosyalar
- `views/panel.ejs` — Çözülen Sorular tablosu tarihe göre yeniden eskiye
- `docs/surum-notlari/SURUM-NOTU-v4.17.34-1.md` — bu not
- (v4.17.34 ile birlikte) `routes/takip.js`, `views/takip-ogrenci-detay.ejs`, `package.json`, `docs/surum-notlari/SURUM-NOTU-v4.17.34.md`

## Test (demo)
- 39 cevaplı öğrenci: ilk satır 25.10.2026, son satır 10.09.2026; tüm liste yeniden eskiye sıralı, sayfalama (30/sayfa) aynı.
