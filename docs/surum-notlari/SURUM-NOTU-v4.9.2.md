# v4.9.2 — Oyun haritası görsel yenileme (ADMIN ÖNİZLEME) (TAM PROJE)

Çalışan TÜM proje. v4.9.1 üzerine kuruludur. Oyun hâlâ yalnızca yönetici
önizlemesi; öğrencilere kapalı. Bu sürüm yalnız HARİTANIN GÖRÜNÜMÜNÜ yeniler;
oyun mantığı (ilk hücre, bitişik alım, artan fiyat, otomatik halka) AYNEN korunur.

## Ne değişti (referans görseldeki düzen)
- **Neon bölge sınırları:** Her oyuncunun bitişik toprağının DIŞ kenarına kendi
  renginde çerçeve; içi yarı saydam aynı renk dolgu. Komşusu aynı sahip olan
  kenarlar çizilmez → her bölge tek blok olarak belirir.
- **Rumuzlu sahip etiketleri:** Her bölgenin merkezine, oyuncunun rumuzunu taşıyan
  balon. Senin bölgende 👑 taç, diğerlerinde renk noktası.
- **Sol panel "TOPRAK SAHİBİ":** rumuz, toprak (hücre) sayın, altın, sonraki hücre
  fiyatı, gezegen boyutu, toplam sahipli.
- **Sağ panel "BÖLGE SAHİPLERİ":** her oyuncu renk + rumuz + hücre sayısı; en altta
  "Boş Bölge".
- **Üst bar:** gezegen başlığı + altın rozeti + (admin / gezegen değiştir) bağlantı.
- **Alt aksiyon çubuğu:** yuvarlak "Test komşu" / "Sıfırla"; hücren yoksa sol panelde
  "Başlangıç yurdu".
- **Gezegen rozeti:** sol-alt sabit "GEZEGEN · X. Sınıf".
- Koyu uzay teması, neon vurgular, responsive (dar ekranda paneller alt alta).

## Korunanlar
- Tüm oyun uçları, modeller, satın alma/halka mantığı, rumuz/renk üretimi,
  admin kapısı, `al()` akışı — DEĞİŞMEDİ. Yalnız `haritaHtml()` fonksiyonu
  (HTML/CSS üretimi) yeniden yazıldı.

## Değişen dosyalar (v4.9.1 tabanına göre)
- routes/oyun.js  (yalnız haritaHtml fonksiyonu — tema)
- package.json    (4.9.1 → 4.9.2)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/oyun.js node --check geçti; EOL korundu (CRLF, stray LF: 0).
- İzole render testi (örnek 2 oyuncu): neon sarı/mavi sınırlar, rumuzlu etiketler
  (👑 dahil), sol/sağ paneller, gezegen rozeti, alınabilir hücre onclick, al()
  scripti, yarı saydam dolgu — 12/12 doğrulandı.

## Sonraki
v4.9.3 = düello (bitişiklik + ortak-doğru kesişimi + hedef hücre seçimi + süre
kıyası + hücre transferi + son-hücre koruması + günlük hak + rapor).

## Git
```bash
git add -A
git commit -m "v4.9.2: oyun haritasi gorsel yenileme - neon sinir, rumuz etiket, paneller"
git push
git tag v4.9.2
git push origin v4.9.2
```
