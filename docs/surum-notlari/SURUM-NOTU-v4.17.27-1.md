# v4.17.27-1 — Düello: soru kalmadığında yeni uyarı metni

> Ara güncelleme, v4.17.27'nin üstüne. `package.json` değişmedi (4.17.27).
> v4.17.27 henüz sunucuda değilse bu paket onu da içerir (routes/oyun.js, package.json, SURUM-NOTU-v4.17.27.md).

## Ne değişti — routes/oyun.js
- Düello açılmak istendiğinde iki oyuncunun kullanılmamış ortak doğru sorusu kalmadıysa çıkan uyarı:
  "Her doğru cevabını düellolarda 1 kez kullanabilirsiniz. Düello yapabilmek için gelecek sorulara doğru cevap vermelisiniz."
  (önceki metin: "Ikinizin de dogru cozdugu ortak sorularin hepsiyle daha once duello yapildi. Yeni sorular cozunce tekrar dene.")
- Kural aynı: aynı soruyla ikinci kez düello yapılmaz; bu durumda günlük saldırı hakkı harcanmaz.

## Test (yerel demo)
- Ortak sorularının hepsi kullanılmış oyuncu oyun sayfasında düello açtı: tarayıcı uyarısında yeni metin Türkçe karakterleriyle
  doğru göründü; hak harcanmadı.

## Değişen dosyalar
- routes/oyun.js
- docs/surum-notlari/SURUM-NOTU-v4.17.27-1.md
