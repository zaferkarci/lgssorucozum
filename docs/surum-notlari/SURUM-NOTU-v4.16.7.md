# v4.16.7 — Hedef durdurması her giriş yolunda (ders kartı dahil) + endpoint geri alındı (TAM PROJE)

Çalışan TÜM proje. v4.16.6 üzerine kuruludur.

## 1) Hedef durdurması artık ders/ünite/konu kartında da çalışıyor (BUG FIX)
Sorun: Günlük hedef durdurması (panel.js) "TÜM dersler tamamlansın"
(toplamTamamlandi) şartına bağlıydı. Soru olmayan dersler hiç tamamlanamadığı için
bu şart çoğu öğrencide hiç sağlanmıyor; dolayısıyla "Eksiklerini Kapat" (önerilen)
dar konu havuzu boşalınca dururken, DERS KARTI (büyük havuz) hedef dışı sınırsız
çözdürüyordu (ör. alpay 21 Matematik).

Düzeltme: Durdurma artık TOPLAM sayıya bağlı — bugün (analiz hariç) çözülen
>= toplam hedef olunca devreye girer; hedef+1'de durdurur. Böylece önerilen ile
ders/ünite/konu kartı AYNI kurala tabi; giriş yolu ne olursa olsun hedef+1 yapan
öğrenci durdurulur. (Kod yorumundaki tasarım zaten buydu; eski kod yanlışlıkla
"tüm dersler bitsin" istiyordu.)

- toplamBugun >= toplamHedef+1  -> dur ("bugünlük bu kadar")
- toplamBugun == toplamHedef    -> tek "+1 soru" teklifi; +1 sonrası dur
- toplamBugun <  toplamHedef    -> serbest (hedef henüz dolmadı)

## 2) İstenmeyen endpoint geri alındı
v4.16.5'te eklenen GET /admin/puan-yeniden-hesapla ve cronJobs.js'teki
kullaniciPuanHesapla export'u KALDIRILDI (talep dışıydı). cronJobs yalnız
gunlukHesapla export eder; gece cron'u aynen çalışır.

## Değişen dosyalar (v4.16.6 tabanına göre)
- routes/panel.js   (hedef gating -> toplam-sayı koşulu)
- routes/admin.js   (puan-yeniden-hesapla endpoint kaldırıldı)
- cronJobs.js       (kullaniciPuanHesapla export geri alındı)
- package.json      (4.16.6 -> 4.16.7)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- panel.js + admin.js + cronJobs.js node --check geçti. Satır sonları korundu
  (panel/cron CRLF, admin LF).
- Gating birim testi: 21/12 -> dur; 12/12 -> +1 teklif; 12/12+ekstra -> 1 izin;
  8/12 -> serbest; 13/12 -> dur.

## Git
```bash
git add -A
git commit -m "v4.16.7: hedef durdurmasi her giris yolunda toplam-sayiya bagli + istenmeyen endpoint geri alindi"
git push
git tag v4.16.7
git push origin v4.16.7
```
