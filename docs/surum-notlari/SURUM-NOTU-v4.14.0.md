# v4.14.0 — Düelloda kuşatma fetih + Sorular listesinde hızlı durum aksiyonları (TAM PROJE)

Çalışan TÜM proje. v4.13.2 üzerine kuruludur.

## 1) Düello ile kazanılan hücre cebi kapatıyorsa otomatik fetih
Önceden otomatik fetih (kuşatma) yalnız normal hücre alımında çalışıyordu. Artık
DÜELLO ile bir düşman hücresi kazanıldığında da, o hücre bir boşluğu kapatıyorsa
içerisi otomatik fethedilir (altın elverdikçe; yetmezse bekleyen fetih kuyruğuna
girer ve sonra işlenir) — normal alımdaki ile birebir aynı mantık.
- routes/oyun.js: ortak `kusatmaIsle(ben, sinif, x, y, oyuncuAdi)` yardımcısı eklendi
  (bolgeTara + bekleyen fetih kuyruğu). Düello kazanımından sonra çağrılır.
- (Mevcut hucre-al akışı aynen korundu.)

## 2) Sorular listesinde hızlı durum aksiyonları
Admin "Sorular" listesindeki her soru kartına, tam düzenleme formunu açmadan tek
tıkla durum değiştirme butonları eklendi:
- ▶ YAYINA AL  (durum -> yayinda; yayinTarih atanir, numarasiz soruya numara atanir)
- ⏸ DURAKLAT   (durum -> duraklat; kullanicilara gosterilmez)
- ↩ TASLAGA AL (durum -> taslak)
Her kartta yalnız o sorunun MEVCUT durumundan FARKLI olan aksiyonlar gosterilir.
- routes/admin.js: yeni POST /soru-durum-degistir (soru-guncelle ile ayni yan
  etkiler: yayinda->yayinTarih + numarasiz soruya numara; diger alanlar korunur).
- views/admin.ejs: uc soru grubunun (taslak/yayinda/duraklat) kartlarina butonlar.

Not: 'duraklat' durumu zaten model/duzenleme formu/liste gruplarinda vardi;
ogrenci sorgusu yalniz durum:'yayinda' aldigindan taslak ve duraklat otomatik
olarak ogrencilere gosterilmez (degismedi).

## Değişen dosyalar (v4.13.2 tabanına göre)
- routes/oyun.js     (kusatmaIsle + duello kazaninca cagri)
- routes/admin.js    (POST /soru-durum-degistir)
- views/admin.ejs    (kartlarda hizli durum butonlari)
- package.json       (4.13.2 -> 4.14.0)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- oyun.js + admin.js node --check, admin.ejs ejs.compile gecti; satir sonlari
  korundu (oyun.js/admin.ejs CRLF, admin.js LF — orijinal formatlar).
- Duello birim testleri (9 senaryo) hala gecerli; ayrica kusatmaIsle testi: BEN
  3x3 halkanin son hucresini duello ile kazaninca ortadaki bos hucre otomatik
  fethedildi (1 hucre).

## Git
```bash
git add -A
git commit -m "v4.14.0: duello kazaniminda kusatma fetih + sorular listesinde hizli durum aksiyonlari"
git push
git tag v4.14.0
git push origin v4.14.0
```
