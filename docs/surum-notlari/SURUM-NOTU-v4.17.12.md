# v4.17.12 — "Devam etmek ister misin?" teklifi kaldırıldı

Hedef tamamlanınca çıkan "Tebrikler!" modalında hâlâ "Devam etmek ister misin?"
sorusu ve yeşil "Devam et" butonu vardı. Önceki temizlik (v4.17.9/10) yalnızca
"+1 soru" teklif EKRANINI kaldırmıştı; bu modal ayrı bir blokta olduğu için
gözden kaçmıştı.

- Metin: "Devam etmek ister misin?" -> "Yarın yeni hedefinle devam edebilirsin."
- Yeşil "Devam et 🚀" butonu kaldırıldı.
- Kapatma butonu: "Yeter, dinleneceğim" -> "Tamam".

Test: panel.ejs derlendi; her iki ifade de dosyada kalmadı.

## Değişen dosyalar
- views/panel.ejs, package.json (4.17.11 -> 4.17.12)
