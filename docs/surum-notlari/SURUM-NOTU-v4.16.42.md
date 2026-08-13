# v4.16.42 — En zayıf konu: konu boşsa ünite/tema bazına düş (asla "Genel"e değil)

## İstek
Konusu olmayan (sadece ünite/tema seçili) sorular "en zayıf konu" listesinde ve öneri
kartında "Genel"e düşmesin; bunun yerine ünite/tema adıyla görünsün. Konu doluysa konu,
konu boşsa ünite; öneri kartı da buna göre konu ya da üniteden soru getirsin.

## Yapılanlar — routes/panel.js + views/panel.ejs
### A) Ders İstatistikleri konu listesi
- Konu etiketi 'Genel' yerine `konu || ünite || 'Genel'`. Konusu boş sorular artık
  ünite/tema adı altında görünür (görüntü değişikliği; satırlar tıklanmıyor).

### B) "En zayıf konu" / Eksiklerini Kapat hesabı
- Gruplama anahtarı ders|ünite|konu; ETİKET = konu varsa konu, yoksa ünite.
- Konusu boş sorular artık ATLANMIYOR; ünite bazlı grup olarak değerlendiriliyor.
- Kalan soru eşleşmesi ders + ünite + konu ile (tam). Ünite grubunda o ünitenin
  konusu boş çözülmemiş soruları önerilir.
- enZayifKonu artık { ders, konu(=etiket görüntü), unite, konuGercek, ... }.

### C) Öneri kartı linki (panel.ejs)
- eksik parametresi `ders|konu` → `ders|unite|konu`.

### D) Soru servis filtresi (eksik)
- 3 parçalı (ders|unite|konu) ayrıştırma; ders+ünite+konu ile filtre.
- Eski 2 parçalı (ders|konu) linkler için geriye dönük uyum korundu.

## Sonuç
- Konu doluysa: her şey eskisi gibi konu bazlı.
- Konu boşsa: en zayıf listede ve öneride ÜNİTE/TEMA adı görünür; öneri o üniteden
  (konusu boş) soruları getirir. "Genel" artık oluşmaz (ünite varsa).

## %100 korunan
- Puanlama, sıralama, diğer tüm mantık. Sadece konu etiketi + öneri eşleşmesi + link/filtre.

## Test
- node --check panel.js geçti; panel.ejs derlendi.
- Mantık simülasyonu: konu dolu→konu, konu boş→ünite (asla Genel); en zayıf ünite
  seçildi; link `Mat|2. Ünite|`; servis filtresi o ünitenin çözülmemiş sorusunu buldu.

## Değişen dosyalar
- routes/panel.js, views/panel.ejs
- package.json (4.16.41 -> 4.16.42)

## Git
```bash
git add -A
git commit -m "v4.16.42: en zayif konu - konu bossa unite/tema bazina dus"
git push
git tag v4.16.42
git push origin v4.16.42
```
