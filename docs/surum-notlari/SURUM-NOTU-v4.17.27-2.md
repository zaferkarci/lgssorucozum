# v4.17.27-2 — Düello sorusu: rakip başına 1 kez; hepsi kullanıldıysa en uzun süredir kullanılmayan soru

> Ara güncelleme, v4.17.27-1'in üstüne. `package.json` değişmedi (4.17.27).
> v4.17.27 / v4.17.27-1 henüz sunucuda değilse bu paket onları da içerir.

## Kural (v4.17.27'deki "her soru 1 kez" kuralının yerine)
1. Havuz değişmedi: saldıranla savunanın ikisinin de doğru çözdüğü ortak sorular.
2. **Önce yeni soru:** Bu iki oyuncu arasındaki düellolarda (kim saldırmış olursa olsun) hiç çıkmamış ortak sorular varsa,
   soru bunlardan rastgele seçilir. Aynı soru **farklı rakiplere** karşı kullanılabilir; sınır **rakip başına 1 kez**.
3. **Yeni soru kalmadıysa:** düello engellenmez; bu ikili arasında **en uzun süredir kullanılmayan** ortak soru seçilir
   (eşitlerde rastgele).
4. Hiç ortak soru yoksa eskisi gibi: "Ikinizin de dogru cozdugu ortak soru yok; duello yapilamaz."
5. Yalnız o gezegende ve saldıranın gezegene katılmasından sonraki düellolar sayılır (oyun sıfırlanınca geçmiş sayılmaz).
- v4.17.27-1'deki "Her doğru cevabını düellolarda 1 kez kullanabilirsiniz…" uyarısı kaldırıldı: düello artık "soru kalmadı"
  diye hiç engellenmediği için bu durum oluşmuyor.
- Kurallar penceresi: "Ayni rakibe karsi ayni soru tekrar secilmez; o rakiple ortak sorularinin hepsi kullanildiysa en uzun
  suredir kullanilmayan soru secilir."
- Değişmeyenler: kısa süre kazanır, eşitlikte savunan korur, günde 1 saldırı, komşuluk, son hücre koruması.

## Test (yerel demo)
- Ali–Banu ortak 3 soru: Ali'nin 3 saldırısında 3 farklı soru. 4. ve 5. saldırıda sırayla en eski kullanılanlar (1. ve 2.
  düellonun soruları) seçildi.
- Banu → Ali: ikili ortak sayıldı, en uzun süredir kullanılmayan soru (3. düellonun sorusu) seçildi.
- Ali → Cem: Banu'ya karşı kullanılmış soru Cem'e karşı yeni sayıldı ve seçildi (rakip başına sınır).
- Ali → Deniz: ortak soru yok → eski uyarı. Sunucu logunda hata yok.

## Değişen dosyalar
- routes/oyun.js
- docs/surum-notlari/SURUM-NOTU-v4.17.27-2.md
