# v4.8.2 — Görselli PDF Yükle: tüm alanlar her zaman görünür (TAM PROJE)

Çalışan TÜM proje. v4.8.1 (LaTeX onarımı) üzerine kuruludur.

## Değişiklik
"Görselli PDF Yükle" önizlemesinde, Gemini metin/görsel bulsa da bulmasa da
artık "Soru Ekle"deki TÜM alanlar her zaman görünür:
- Öncül 1 + Öncül 1 Görseli
- Öncül 2 + Öncül 2 Görseli
- Öncül 3 + Öncül 3 Görseli
(Soru metni, Soru resmi ve A-B-C-D şıkları + şık görselleri zaten her zaman vardı.)
Böylece Gemini'nin doldurmadığı bir öncüle elle metin yazabilir, boş bir slota
da Kırp ile görsel ekleyebilirsin.

## Değişen dosyalar (v4.8.1 tabanına göre)
- views/gorselli-pdf-yukle.ejs   (öncül metin + öncül görsel slotları koşulsuz)
- package.json                   (4.8.1 → 4.8.2)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Git
```bash
git add -A
git commit -m "v4.8.2: gorselli pdf yukle - tum oncul ve gorsel alanlari her zaman gosterilir"
git push
git tag v4.8.2
git push origin v4.8.2
```
