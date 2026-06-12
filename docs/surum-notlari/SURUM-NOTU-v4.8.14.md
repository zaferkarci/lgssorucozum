# v4.8.14 — Silinen soru numarası tekrar kullanılır (boşluk doldurma) (TAM PROJE)

Çalışan TÜM proje. v4.8.13 üzerine kuruludur.

## Sorun
Bir soru silinince (ör. #220), yeni eklenen soru `max(soruNo)+1` mantığıyla numara
aldığı için 220'yi atlayıp 223 alıyordu; boşluk kapanmıyordu.

## Çözüm
Yeni numara artık **en küçük kullanılmayan numarayı** alır (boşluğu doldurur). Yani
220 boşsa, eklenen ilk soru 220 olur; sıra "deliksiz" devam eder. **Boşluk yoksa
davranış eskiyle aynıdır** (max+1, max+2, …) — yani bir gerileme/yan etki yok.

- Yeni ortak yardımcı `services/soruNo.js` → `bosSoruNo(adet)`: en küçük boş
  pozitif numaraları (adet kadar) döndürür.
- Uygulandığı yerler:
  - Manuel soru ekleme (admin.js)
  - PDF'den toplu ekleme (pdfyukle.js) — birden çok boşluğu sırayla doldurur
  - Güncellemede numarasız soruya numara atama (admin.js)

## Notlar
- Mevcut boşluk (ör. 220) **bir sonraki eklemeyle** dolar; ekleme yapmadan tüm
  boşlukları kapatmak istersen, bu numaraları yeniden dizen (renumber) ayrı bir
  bakım işlemi gerekir — söyle, onu da ekleyeyim (ama o, mevcut soruların
  numaralarını değiştirir).
- `/soru-no-onar` onarım aracı (yalnız numarasız sorulara numara verir) olduğu gibi
  bırakıldı; istersen onu da boşluk-doldurmaya çevirebilirim.
- Aynı anda iki ekleme olursa ikisi de aynı boş numarayı seçebilir; `soruNo` unique
  indeks bunu engeller (ikincisi reddedilir). Tek admin senaryosunda sorun olmaz.

## Değişen / eklenen dosyalar (v4.8.13 tabanına göre)
- **YENİ** services/soruNo.js
- routes/admin.js     (soruNo atama → bosSoruNo; require)
- routes/pdfyukle.js  (toplu soruNo atama → bosSoruNo; require)
- package.json        (4.8.13 → 4.8.14)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- 3 dosya `node --check` geçti; EOL korundu (admin.js LF; pdfyukle.js & soruNo.js CRLF).
- Simülasyon: 220 boşken tek ekleme → 220; üç ekleme → 220, 223, 224; boşluk yokken
  tek ekleme → 223 (= eski max+1). Hepsi doğru.

## Git
```bash
git add -A
git commit -m "v4.8.14: silinen soruNo tekrar kullanilsin - en kucuk bos numarayi doldur"
git push
git tag v4.8.14
git push origin v4.8.14
```
