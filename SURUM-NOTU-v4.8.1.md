# v4.8.1 — LaTeX onarımı düzeltmesi (TAM PROJE)

Bu paket çalışan TÜM projedir (v4.8 tabanı + bu düzeltme). Repoya olduğu gibi
kopyalayabilirsin.

## Sorun
"LaTeX onarımı" butonu çalışıyordu ama hiçbir şeyi onarmıyordu ("189 tarandı,
0 onarıldı"). Sebep: onarım, \frac'in bozuk halini `rac` (ters bölüsüz) diye
arıyordu; oysa veritabanındaki bozulma `\rac` (ters bölü VAR, f düşmüş) biçiminde.
Eski regex ters bölüden sonra geleni atladığı için hiç eşleşmiyordu.

## Düzeltme (routes/admin.js — /soru-latex-onar)
"Ters bölü + kesik komut" hallerini de onaran 6 kural eklendi (sadece geçerli
LaTeX komutu OLMAYAN, yani güvenli olanlar):
  \rac→\frac, \qrt→\sqrt (ve \qrt[ ), \inom→\binom, \oxed→\boxed, \orall→\forall
Geçerli komutlara (ör. \frac, \sqrt, \eta) DOKUNULMAZ — test edildi (8/8 geçti).

## Değişen dosyalar (tabana göre)
- routes/admin.js   (onarım kurallarına 6 satır)
- package.json      (4.7.3 → 4.8.1)
Başka hiçbir dosya değişmedi.

## Kullanım
Deploy sonrası: Admin → İçerik → Sorular → "LaTeX onarımı" butonu.
Artık "\rac" içeren sorular "\frac"e çevrilecek; sonuçta kaç soru onarıldığını
söyleyen uyarı çıkacak.

## Git
```bash
git add -A
git commit -m "v4.8.1: latex onarimi - ters boluyle kesik komutlari da onar"
git push
git tag v4.8.1
git push origin v4.8.1
```
