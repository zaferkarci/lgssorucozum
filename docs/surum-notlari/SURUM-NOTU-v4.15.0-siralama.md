# v4.15.0 — Sıralama sınıf seviyesine göre (bug düzeltmesi) (TAM PROJE)

Çalışan TÜM proje. v4.14.1 üzerine kuruludur. Yalnız bir BUG düzeltmesi (patch).

## Sorun
Panelin il/ilçe/okul (ve Türkiye) sıralamaları SINIF SEVİYESİNE göre
filtrelenmiyordu. Ör. 6. sınıf öğrencisi (sude) tüm sınıflarla birlikte sıralanıp
"6. sınıflarda 10." gibi imkânsız sonuçlar çıkıyordu. Yalnız "sınıf" (okul-şube)
sıralaması doğruydu.

## Kök neden ve düzeltme
- routes/cronJobs.js sıralama hesabı ZATEN sınıf seviyesine göre çalışıyordu
  (cache DOĞRU). Dokunulmadı.
- HATA routes/panel.js'teki CANLI hesap (fallback) içindeydi: turkiye/il/ilce/okul
  listeleri ve ders bazlı eşleri sınıf filtresi içermiyordu.
- DÜZELTME: bu 8 listeye `&& Number(u.sinif) === Number(k.sinif)` eklendi.
  Artık canlı hesap da cron ile birebir tutarlı.

## Değişen dosyalar (v4.14.1 tabanına göre)
- routes/panel.js  (8 sıralama listesine sınıf-seviyesi filtresi)
- package.json     (4.14.1 -> 4.14.2)
Başka HİÇBİR dosya değişmedi (cronJobs.js dahil).

## Git
```bash
git add -A
git commit -m "v4.15.0: siralama sinif seviyesine gore (il ilce okul turkiye) panel canli hesap bug fix"
git push
git tag v4.15.0
git push origin v4.15.0
```
