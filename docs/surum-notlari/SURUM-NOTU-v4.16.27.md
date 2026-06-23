# v4.16.27 — Sorular: sınıf/ders/ünite filtreli, eklenme sırasına göre hızlı düzenleme gezgini

## İstek
Admin "Sorular" sekmesinde, Üniteler'den beslenen sınıf/ders/ünite filtresiyle,
soruları EKLENME SIRASINA göre tek tek hızlıca düzenleyebilmek.

## Yapılanlar — views/admin.ejs (sadece ekleme, mevcut korundu)
- Sınıf/ders/ünite/konu/çıktı/süreç filtresi ZATEN vardı (/api/unite-bilgi) — aynen
  kullanıldı. Filtreli sorular zaten soruNo (≈ eklenme) sırasında (tumSorular).
- soruListesi: filtrenin hemen altında giriş çubuğu — "<N> soru — eklenme sırasına
  göre tek tek düzenle" + [İlk soruyu düzenle ▶] (filtreyi koruyarak ilk sorunun
  düzenleme ekranını açar).
- soruEkle (düzenleme): formun üstünde gezgin çubuğu — ◀ Önceki / "i / N • Soru No"
  / Sonraki ▶ / Listeye dön. Prev/next, tumSorular sırasındaki komşu sorunun
  düzenleme ekranını açar; filtre parametreleri (filSinif..filSurec) korunur.
  Sınırda (ilk/son) ilgili buton pasif.

## Kapsam (kullanıcının seçimleri)
- Filtredeki TÜM sorular (taslak+yayında+duraklat) gezilir (tumSorular hepsini içerir).
- Gezgin filtrenin hemen altında / düzenleme formunun üstünde.
- Geçişte doğrudan DÜZENLEME ekranı açılır.

## %100 korunan
- Mevcut filtre, kart listesi, önizleme, soru ekle/güncelle, /api/unite-bilgi,
  diğer tüm kod. Sadece iki gezinme bloğu eklendi. CRLF korundu.

## Test
- admin.ejs ejs.compile ile derlendi.
- Gezgin GERÇEK render edildi: konum (3/4), Soru No, prev/next doğru _id'ler,
  filtre korunuyor (ünite encode), sınırda buton pasif. Liste çubuğu: sayı + ilk
  soru linki + filtre; boş filtrede gizleniyor.

## Değişen dosyalar
- views/admin.ejs (soruEkle gezgini + soruListesi giriş çubuğu)
- package.json (4.16.26 -> 4.16.27)

## Git
```bash
git add -A
git commit -m "v4.16.27: Sorular sinif-ders-unite filtreli eklenme sirasi hizli duzenleme gezgini"
git push
git tag v4.16.27
git push origin v4.16.27
```
