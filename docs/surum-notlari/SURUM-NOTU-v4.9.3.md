# v4.9.3 — Oyun haritasina aynalanmis dunya zemini + mavi tema (TAM PROJE)

Çalışan TÜM proje. v4.9.2 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi.
Yalnız HARİTANIN GÖRÜNÜMÜ değişti; oyun mantığı (hücre, alım, fiyat, halka) AYNEN.

## Ne değişti
- **Aynalanmış dünya zemini:** Izgaranın arkasına, gerçek dünya kıtalarının **yatay
  ayna simetrisi** alınmış stilize bir harita kondu (gezegenimizin aynası → tanıdık
  ama farklı kurgu gezegen). Kendi stilize SVG siluetim; hazır/telifli harita dosyası
  değil. Şehir/ülke yok, sadece kıta + okyanus.
- **Mavi gezegen teması:** yeşil-mavi kıtalar, lacivert okyanus (radyal derinlik
  gradyanı), koyu uzay arka plan, hafif kutup pusu ve enlem/boylam çizgileri.
- **Katmanlama:** harita arkada (z-index 0), hücreler üstte (z-index 1). Boş hücreler
  şeffaf → okyanus/kıta görünür; sahipli hücreler oyuncu renginde yarı saydam + neon
  sınır; alınabilir hücreler yeşil kesikli. Sahip etiketleri/paneller aynen.

## Dürüst sınır (beklenti)
Mars/Civ/AoE gibi fotoğrafik/3B arazi sanatı kodla üretilemez (sanatçı işi). Bu sürüm,
o his yerine temiz, vektörel, aynalı bir "dünya haritası" zemini sunar.

## Değişen dosyalar (v4.9.2 tabanına göre)
- routes/oyun.js  (yeni dunyaSvg() + haritaHtml zemin/tema)
- package.json    (4.9.2 → 4.9.3)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- node --check geçti; EOL korundu (CRLF, stray LF: 0).
- SVG doğrulama: geçerli <svg>, ayna transform, 6 kıta, dengeli etiketler.
- Render testi: worldbg katmanı, gömülü ayna SVG, mavi tema, hücre z-index
  katmanlama, şeffaf grid, rumuz etiketleri — hepsi doğrulandı.

## Sonraki
Düello + kuşatma kaçışı artık **v4.9.4**.

## Git
```bash
git add -A
git commit -m "v4.9.3: oyun haritasi aynalanmis dunya zemini ve mavi tema"
git push
git tag v4.9.3
git push origin v4.9.3
```
