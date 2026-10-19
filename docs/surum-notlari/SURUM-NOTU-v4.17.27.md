# v4.17.27 — Bilgi Gezegenleri düellosu: aynı soruyla tekrar düello yok

> Tam paket. v4.17.25-1'in üstüne gelir. `package.json` **4.17.27**.
> v4.17.26 sunucuya hiç yüklenmedi ve **iptal edildi**: onun "1 saniye kilidi" ve "1 saniyelik cevaplar düelloya girmez"
> kuralları bu sürümde **yoktur**. Yalnız "aynı soruyla tekrar düello yok" kuralı uygulanır.

## Sorun
- Ortak doğru çözülmüş soru az olunca düellolar hep aynı soruyla yapılıyordu.

## Ne değişti — routes/oyun.js (POST /oyun/duello ve Kurallar metni)
- Düello sorusu seçilirken şu sorular **bir daha seçilmez**:
  - saldıranın daha önce saldırdığı düellolarda çıkan sorular,
  - bu iki oyuncu arasında (hangi taraf saldırmış olursa olsun) daha önce çıkan sorular.
- Kullanılmamış ortak soru kalmadıysa düello açılmaz ve şu uyarı çıkar: "Ikinizin de dogru cozdugu ortak sorularin hepsiyle daha
  once duello yapildi. Yeni sorular cozunce tekrar dene." Bu durumda **günlük saldırı hakkı harcanmaz**.
- Yalnız o gezegende ve oyuncunun gezegene katılmasından sonraki düellolar sayılır; oyun sıfırlanınca eski düellolar sayılmaz.
- Kurallar penceresine "Ayni soruyla ikinci kez duello yapilmaz." cümlesi eklendi.
- Değişmeyenler: ortak doğru soru, kısa süre kazanır, günde 1 saldırı, komşu hücre şartı, son hücre koruması, eşitlikte
  savunanın kazanması, 1 saniyelik cevaplar dahil tüm doğru cevaplar eskisi gibi sayılır.

## Test (yerel demo)
- Ali ile Banu'nun 3 ortak doğru sorusu var (biri Ali'nin, biri Banu'nun 1 sn'lik cevabı). Ali'nin 1 sn'lik cevabı olmasına
  rağmen düello açıldı (kilit yok).
- Ali art arda 3 düello açtı: her birinde farklı soru çıktı (3 ortak sorunun üçü de). 4. denemede "hepsiyle…" uyarısı; hak
  harcanmadı.
- Banu, Ali'ye saldırdı: aynı ikili arasında 3 soru da kullanılmış → "hepsiyle…" (çift yönlü engel).
- Yeni ortak soru eklenince o soru seçildi; oyuncu gezegene yeniden katılmış gibi yapılınca eski düellolar sayılmadı.
- Oyun sayfası açılıyor, sunucu logunda hata yok.

## Değişen dosyalar (v4.17.25-1'e göre)
- routes/oyun.js
- package.json (4.17.27)
- docs/surum-notlari/SURUM-NOTU-v4.17.27.md
