# v4.15.0 — Sıralama sınıf seviyesine göre (il/ilçe/okul/sınıf + Türkiye) (TAM PROJE)

Çalışan TÜM proje. v4.14.1 üzerine kuruludur.

## Sorun
Panelin il/ilçe/okul (ve Türkiye) sıralamaları SINIF SEVİYESİNE göre
filtrelenmiyordu. Bu yüzden ör. 6. sınıf öğrencisi (sude) tüm sınıflarla birlikte
sıralanıyor, "6. sınıflarda 10." gibi imkânsız sonuçlar çıkıyordu (6. sınıfta o
kadar kullanıcı yokken). Yalnız "sınıf" (okul-şube) sıralaması doğruydu.

## Kök neden ve düzeltme
- routes/cronJobs.js sıralama hesabı ZATEN sınıf seviyesine göre çalışıyordu
  (ayniIl/ayniIlce/ayniOkul ve Türkiye listeleri `Number(sinif) === uSinif`
  filtresiyle). Yani cache DOĞRU. Dokunulmadı.
- HATA routes/panel.js'teki CANLI hesap (cron henüz çalışmadıysa veya kullanıcı
  yeni cevap verdiyse devreye giren fallback) içindeydi: turkiye/il/ilce/okul
  listeleri ve ders bazlı turkiye/il/ilce/okul listeleri sınıf filtresi
  içermiyordu (yalnız sinifListesi/sList içeriyordu).
- DÜZELTME: bu 8 listeye `&& Number(u.sinif) === Number(k.sinif)` eklendi.
  Artık canlı hesap da cron ile birebir tutarlı: her kullanıcı yalnız KENDİ
  sınıf seviyesindeki akranlarıyla (il/ilçe/okul/sınıf ve Türkiye) sıralanır.

## Değişen dosyalar (v4.14.1 tabanına göre)
- routes/panel.js  (8 sıralama listesine sınıf-seviyesi filtresi)
- package.json     (4.14.1 -> 4.15.0)
Başka HİÇBİR dosya değişmedi (cronJobs.js dahil — diff ile doğrulandı).

## Etki / cache
- Cron zaten doğru hesapladığından mevcut cache değerleri dogru. Düzeltme,
  hatanın görüldüğü CANLI fallback yolunu duzeltir; bir sonraki cron çalışmasında
  her şey tutarlı kalır.

## Test
- panel.js node --check gecti; satir sonu korundu (CRLF).
- Mantik testi: 6. sinif sude, ilinde 2 alti-sinif + 10 sekiz-sinif akran.
  ESKI: il listesi 13 kisi (karisik sinif) -> hatali. YENI: il listesi 3 kisi
  (yalniz 6. siniflar) -> sude kendi seviyesinde siralaniyor.

## Git
```bash
git add -A
git commit -m "v4.15.0: siralama sinif seviyesine gore (il ilce okul turkiye) panel canli hesap"
git push
git tag v4.15.0
git push origin v4.15.0
```
