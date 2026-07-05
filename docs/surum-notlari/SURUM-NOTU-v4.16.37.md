# v4.16.37 — Telafi: "Kopyayı tamamen sil" modu (numarayı boşaltır)

## İstek
Telafiye, kopyaları ARŞİVLEMENİN yanı sıra TAMAMEN SİLME (soruNo'yu boşaltan)
seçeneği eklensin.

## Çözüm — /admin/duplicate-telafi (iki mod)
- **ARŞİVLE (varsayılan, nazik):** aynı soruyu birden fazla çözen öğrencinin yalnızca
  SONRAKİ çözümü silinir (doğruysa puan geri, soruIndex -1). Tek çözenler korunur.
  Kopya sorular durum='arsiv' (servis/rapor edilmez, soruNo boşalmaz).
- **SİL (?sil=1):** kopya sorulardaki TÜM cevaplar silinir (tek çözenler dahil),
  puanları geri alınır, soruIndex -1; kopya SORULAR tamamen silinir → soruNo boşalır.
  Asıl (en küçük No) kopya kalır. Hiçbir istatistik BİRLEŞTİRİLMEZ.
- Her mod için: KURU ÇALIŞMA (önizleme) + onaylı UYGULA. Rapor üstünde modlar arası
  geçiş linki; başlıkta aktif mod rozeti; SİL modunda kırmızı uyarı.
- Rapordaki asıl ve kopya numaraları tıklanır (id ile açılır) + durum etiketi (v4.16.36).

## %100 korunan
- Puanlama, cevap akışı, önleme (v4.16.35), diğer tüm kod. Sadece endpoint genişletildi.

## Test
- node --check admin.js geçti.
- Her iki mod mock veriyle simüle edildi:
  * ARŞİVLE: sonraki çözümler silinir (c2,c4), 9 puan geri, tek çözenler korunur, arşiv.
  * SİL: kopyanın tüm cevapları silinir (c2,c3,c6), 10 puan geri (ali-5, veli 0, fatma-5),
    soruIndex -1, kopya soru silinir (No boşalır).

## Değişen dosyalar
- routes/admin.js
- package.json (4.16.36 -> 4.16.37)

## Kullanım
Admin → 🧮 Tekrar Soru Telafisi → varsayılan ARŞİVLE kuru çalışması. Numarayı da
boşaltmak istersen "Kopyalari tamamen sil moduna gec" → kuru çalışma → UYGULA.

## Git
```bash
git add -A
git commit -m "v4.16.37: telafi kopyayi tamamen sil modu (soruNo bosaltir)"
git push
git tag v4.16.37
git push origin v4.16.37
```
