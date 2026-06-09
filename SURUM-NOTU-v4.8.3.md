# v4.8.3 — Görselli PDF Yükle: her soruya ünite/konu önerisi (TAM PROJE)

Çalışan TÜM proje. v4.8.2 üzerine kuruludur.

## Değişiklik
"Görselli PDF Yükle" önizlemesinde her sorunun başlığındaki eski tek "Konu"
serbest-metin kutusu, sınıf+derse göre dolan **cascading Ünite + Konu** seçimiyle
değiştirildi:

- Üniteler `/api/unite-bilgi?sinif=X`'ten çekilir (sınıf bazında cache; her sınıf
  için tek istek). Sadece o sorunun dersine ait üniteler listelenir.
- **Ünite** açılır menüsü seçilince **Konu** menüsü o ünitenin konularıyla dolar
  (ünite seçilmezse derse ait tüm konular).
- Gemini'nin serbest konu tahmini `normTr` (Türkçe-duyarlı: büyük/küçük + diakritik
  + İ/I farkları yok sayılır) ile eşleştirilip **otomatik seçili** gelir:
  1. Konu adıyla tam eşleşme → ünite + konu otomatik seçilir.
  2. Konu adıyla temiz alt-dize eşleşmesi → ünite + konu otomatik seçilir.
  3. Konu tutmaz ama tahmin bir **ünite adına** tam uyarsa → o ünite seçili gelir,
     Gemini'nin konu metni korunup serbest kutuda gösterilir (admin onaylar).
- Eşleşme yoksa ya da o sınıf+ders için hiç ünite tanımlı değilse, eski davranışa
  düşülür: Gemini'nin tahmini **serbest-metin** kutusunda gösterilir.
- Soru kartındaki Sınıf/Ders değiştirilirse ünite/konu önerisi yeniden kurulur.

Veri güvenliği notu: kasıtlı olarak bulanık (token-bazlı) eşleştirme YOK. Yanlış bir
otomatik konu seçimi puanlama/istatistik zincirini sessizce bozabileceği için, emin
olunmayan durumlarda Gemini metni serbest kutuda bırakılır ve admin doğrular.

Kaydetme tarafı değişmedi: `/pdf-sorulari-kaydet` zaten `konu` + `unite` saklıyordu.

## Değişen dosyalar (v4.8.2 tabanına göre)
- views/gorselli-pdf-yukle.ejs   (cascading ünite/konu önerisi + normTr + eşleştirici)
- package.json                   (4.8.2 → 4.8.3)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- normTr + eşleştirici 8/8 senaryo geçti (tam/diakritiksiz/alt-dize/ünite-adı/
  eşleşmeyen/boş).
- Inline JS `node --check` geçti; EJS şablonu hatasız render edildi.

## Git
```bash
git add -A
git commit -m "v4.8.3: gorselli pdf yukle - her soruya cascading unite/konu onerisi"
git push
git tag v4.8.3
git push origin v4.8.3
```
