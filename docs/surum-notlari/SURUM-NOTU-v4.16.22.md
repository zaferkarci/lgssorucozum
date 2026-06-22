# v4.16.22 — Düzeltme: filtre koruma DOĞRU Düzenle linklerine uygulandı

## Sorun (v4.16.21 neden çalışmadı)
v4.16.21'de filtre paramlarını YANLIŞ Düzenle linkine ekledim: düzenlediğim satır
(2792) aslında zorlukRapor bloğundaydı. Gerçek soruListesi Düzenle linkleri
(3 adet, hepsi '&mod=soruEkle') filtreyi taşımıyordu → düzenleme sayfasına filtre
gitmiyor, gizli alanlar boş kalıyor, /soru-guncelle sade redirect ediyordu.

## Çözüm
- views/admin.ejs: zorlukRapor Düzenle linki (2792) ESKİ haline geri alındı.
- views/admin.ejs: GERÇEK soruListesi Düzenle linkleri (3 adet) artık
  filSinif/filDers/filUnite/filKonu/filCikti/filSurec taşıyor.
- (v4.16.21'deki gizli filtre inputları ve /soru-guncelle filtreli redirect zaten
  doğruydu; korunuyor.)

## Doğrulama
- Render testi: link "/admin?duzenle=ID&mod=soruEkle&filSinif=6&filDers=Matematik&
  filKonu=Tam%20Sayılar" üretiyor; gizli inputlar value'ları doluyor.
- admin.ejs ejs.compile ile derlendi.

## Tam zincir
filtrele → Düzenle (filtre linkte) → düzenleme sayfası (req.query'de filtre) →
gizli inputlar → Kaydet (POST) → /soru-guncelle filtreli redirect → soruListesi
aynı filtreyle (fl_ cascade dropdownları URL'den geri yükler).

## %100 korunan
- zorlukRapor (geri alındı), /soru-ekle, filtreleme/fl_ cascade, cevap/servis/
  istatistik, mevcut veri, satır sonları (CRLF).

## Değişen dosyalar
- views/admin.ejs (3 soruListesi linkine fq eklendi, zorlukRapor linki geri alındı)
- package.json (4.16.21 -> 4.16.22)

## Git
```bash
git add -A
git commit -m "v4.16.22: Filtre koruma dogru soruListesi Duzenle linklerine uygulandi"
git push
git tag v4.16.22
git push origin v4.16.22
```
