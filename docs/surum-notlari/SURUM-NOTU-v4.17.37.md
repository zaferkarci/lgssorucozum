# Sürüm Notu — v4.17.37

**Tarih:** 13 Kasım 2026
**Tür:** Günün ilk güncellemesi (tam paket, package.json 4.17.37)

## Admin › Kullanıcılar: Soru Havuzu

Kullanıcı listesinin üstünde yeni **📚 Soru Havuzu** kartı. Amaç: en çok soru çözen öğrencinin önünde kaç soru
kaldığını sınıf ve konu bazında görmek (ör. Öykü'nün "soru göremiyorum" durumu önceden fark edilsin).

- Her sınıf seviyesi açılır bir satır: toplam / açık / 🔒 kilitli konudaki soru sayısı, öğrenci sayısı,
  sınıfta en çok çözen öğrenci ve **açık konularda kalan** soru sayısı, "N konu bitti" / "N konu azaldı" rozetleri.
- Açılınca konu konu tablo: Ders · Ünite · Konu · Soru · En çok çözen · Çözdüğü · **Kalan** · Bitiren.
  - Kalan **0** (kırmızı): o öğrenci bu konuda soru bulamaz; **1–3** (turuncu): bitmek üzere.
  - 🔒 kilitli konular (Konu İzinleri) gri ve en altta; konu açılınca öğrencilere gelecek soru sayısını gösterir.
  - "Çözdüğü" = cevapladığı farklı soru (doğru/yanlış fark etmez; cevaplanan soru bir daha gelmez).
- Sayfanın sınıf filtresinde bir sınıf seçilince o sınıfın tablosu açık gelir.
- Yalnız okur; yalnız Kullanıcılar sayfası açılınca hesaplanır.

## Değişen dosyalar
- `services/soruHavuzu.js` — yeni (hesaplama)
- `routes/admin.js` — Kullanıcılar modunda havuz verisi
- `views/admin.ejs` — Soru Havuzu kartı
- `package.json` — 4.17.37
- `docs/surum-notlari/SURUM-NOTU-v4.17.37.md` — bu not

## Test (demo)
- 3 sınıf, 14 konu (2 kilitli), 10 öğrenci: en çok çözen, kalan, bitiren ve rozetler elle sayımla aynı; sayfa hatası yok.
