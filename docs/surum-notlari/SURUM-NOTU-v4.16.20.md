# v4.16.20 — Soru düzenleme: orphan ünite/konu/çıktı/süreç değerini koru

## Sorun
Üniteler güncellenince (yeniden adlandırma/yapı değişikliği) bir sorunun kayıtlı
eski ünite/konusu güncel ünite listesinde kalmıyordu. "Düzenle"de sayfa açılırken
sunucu eski değeri `selected` basıyor; ama DOMContentLoaded'daki cascade JS
dropdown'ları /api/unite-bilgi'den sıfırdan kurup yalnız güncel değerleri
eklediği için, eşleşmeyen eski değer SİLİNİYOR → dropdown boş görünüyordu.
Kaydedilirse konu da boşalabilirdi.

## Çözüm — views/admin.ejs (yalnız 5 cascade fonksiyonu + 1 helper)
- Yeni `_seEnsureSecili(sel, val)`: bir select kurulduktan sonra, hedef değer
  listede yoksa onu "(eski)" etiketli, value'su DEĞİŞMEDEN seçili seçenek olarak
  ekler (varsa mevcut seçeneği seçer).
- sinifDegisti (ders), dersDegisti (ünite), uniteDegisti (konu),
  konuDegisti (çıktı), ciktiDegisti (süreç): restore anında (hedef tanımlıysa)
  ilgili seviyede _seEnsureSecili çağrılır. Manuel değişimde (hedef undefined)
  çağrılmaz — eski değer hayalet olarak kalmaz.

## Sonuç
- Düzenleme formunda eski ünite/konu/çıktı/süreç görünür ve KAYDEDİLİR (value
  korunur). Soru konusunu kaybetmediği için öğrencilere servis edilmeye devam eder
  (servis: durum=yayinda + sinif; konu sorunun kendi alanından okunur).

## %100 korunan
- Soru servisi (panel.js), /soru-guncelle, /api/unite-bilgi, manuel ekleme akışı,
  diğer tüm cascade davranışı (mevcut değer varsa aynen seçilir).
- Mevcut veri, satır sonları (CRLF), ilgisiz tüm kod.

## Değişen dosyalar
- views/admin.ejs (5 cascade fonksiyonuna orphan koruma + _seEnsureSecili helper)
- package.json (4.16.19 -> 4.16.20)

## Test
- admin.ejs ejs.compile ile derlendi.
- _seEnsureSecili: mevcut değerde yeni seçenek eklemez; orphan değerde value'yu
  koruyarak "(eski)" etiketli seçili seçenek ekler (simüle edildi). CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.20: Soru duzenlemede orphan unite/konu/cikti/surec degerini koru"
git push
git tag v4.16.20
git push origin v4.16.20
```
