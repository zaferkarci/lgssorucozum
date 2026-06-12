# v4.8.9 — "Tüm soruları çözdün" yanlış mesajı düzeltildi (TAM PROJE)

Çalışan TÜM proje. v4.8.8 üzerine kuruludur.

## Sorun
serdarkağan 38 sorudan 30'unu çözmüşken ekranda "Sistemdeki tüm soruları çözdün"
yazıyordu. Aslında 8 soru çözülmemişti.

## Kök neden
v4.8.8'deki **mastery gate** doğru çalışıyor: öğrenci geçtiği (≥%66) konuların kalan
sorularını havuzdan çıkarıyor. serdarkağan açık konuların hepsini geçtiği için kalan
8 soru gizlendi ve havuz boşaldı. Boş havuzda, gerçek öğrenci + `k.soruIndex > 0` dalı
sabit olarak "Sistemdeki tüm soruları çözdün" mesajını gösteriyordu — yani **davranış
doğru, mesaj yanlış/yanıltıcıydı** (öğrenci hepsini çözmedi, geçtiği konuların soruları
gizlendi).

## Düzeltme
`routes/panel.js`: gate'in gizlediği soru sayısı (`gateGizlenenSayisi`) hesaplanıp
view'a `seviyeTamamlandi` olarak geçilir. `views/panel.ejs`: boş-durum mesajı koşullu —
- gate yüzünden gizlenen soru varsa: "Açık konularda yeterli başarıyı (≥%66) yakaladın;
  geçtiğin konuların kalan soruları şimdilik gösterilmiyor; yeni soru eklenince ya da bir
  konun %66 altına düşünce tekrar soru gelecek."
- gerçekten tüm sorular çözülmüşse: eski "Sistemdeki tüm soruları çözdün" mesajı aynen.

Yani gate davranışı değişmedi; yalnızca öğrenciye gösterilen mesaj artık doğru.

## Değişen dosyalar (v4.8.8 tabanına göre)
- routes/panel.js   (gateGizlenenSayisi sayacı + render'a seviyeTamamlandi)
- views/panel.ejs   (boş-durum mesajı koşullu)
- package.json      (4.8.8 → 4.8.9)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Puanlama/akış mantığına dokunulmadı.

## Test
- routes/panel.js `node --check`, views/panel.ejs EJS derleme geçti; CRLF korundu.
- Mesaj render testi: seviyeTamamlandi=true → gate mesajı (eski mesaj yok);
  seviyeTamamlandi=false → eski "tüm soruları çözdün" mesajı. İkisi de doğru.

## Not
Bu, gate'in tasarlanan davranışının doğal sonucuydu: serdarkağan açık konuların
hepsini ≥%66 ile geçtiği için sistem onun için seviye tespitini tamamlamış sayıyor.
Eğer "öğrenci 38 sorunun hepsini çözebilsin" gibi farklı bir davranış istersen
(yani geçilen konuların soruları gizlenmesin), bu ayrı bir tasarım kararı olur —
söyle, gate'i ona göre düzenleyelim. (Bir önceki mesajındaki "her konudan 3'er soru
ile en kısa sürede seviye tespiti" fikrini de hâlâ konuşabiliriz.)

## Git
```bash
git add -A
git commit -m "v4.8.9: bos-durum mesaji - gate gizledigi sorularda dogru metin"
git push
git tag v4.8.9
git push origin v4.8.9
```
