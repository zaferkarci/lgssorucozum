# v4.9.7 — Türkiye Cumhuriyeti karası korumalı (alınamaz) (TAM PROJE)

Çalışan TÜM proje. v4.9.6 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi.

## Ne eklendi
Haritada **Türkiye Cumhuriyeti karası hiçbir oyuncu tarafından alınamaz ve
başlangıç olarak seçilemez.**
- Türkiye'nin yaklaşık sınır poligonu (lon/lat) tanımlandı; merkezi bu poligon
  içinde kalan ızgara hücreleri "BLOKE" işaretlenir (toplam ~112 hücre).
- Sunucu: satın alma (`/hucre-al`), elle başlangıç (`/baslangic`), otomatik
  başlangıç (spiral) ve test komşu yerleştirmesi bloke hücreleri reddeder/atlar.
- İstemci: bloke hücreler kırmızı taralı, kilitli gösterilir; ne satın alma ne
  yerleştirme modunda tıklanamaz.

## Doğruluk
Şehir testi: Ankara, İstanbul, İzmir, Nazilli, Antalya, Trabzon, Van, Gaziantep →
BLOKE. Atina, Kıbrıs, Sofya, Halep → serbest. Izgara çözünürlüğü ~100 km olduğundan
sınır yaklaşıktır; gerekirse poligonu büyütüp/küçültebiliriz.

## Not
Nazilli artık bloke (başlangıç orada kurulamaz). Açılış penceresi yine Nazilli'yi
gösterir (Türkiye kırmızı görünür); başlangıcını hemen dışına elle koyabilirsin.

## Değişen dosyalar (v4.9.6 tabanına göre)
- routes/oyun.js  (TR poligon + BLOKE; uçlarda red; istemcide kilitli hücre)
- package.json    (4.9.6 → 4.9.7)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/oyun.js node --check + inline istemci JS node --check geçti; EOL korundu.
- Poligon/şehir testi yukarıdaki gibi doğrulandı (112 bloke hücre).

## Git
```bash
git add -A
git commit -m "v4.9.7: turkiye cumhuriyeti karasi korumali - alinamaz/baslanamaz"
git push
git tag v4.9.7
git push origin v4.9.7
```
