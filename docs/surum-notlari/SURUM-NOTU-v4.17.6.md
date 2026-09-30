# v4.17.6 — Veli kayıt formu: okul alanı kaldırıldı

## İstek
Veliler kayıt olurken il/ilçe seçebilsin; öğrenci olmadıkları için okul, sınıf seviyesi
ve şube alanları formda yer almasın.

## Durum tespiti
- Sınıf ve şube zaten velide GİZLİYDİ (`sinifsizRol` değişkeni: ogretmen/kurumsal/veli).
- Eksik olan yalnızca OKUL alanıydı: veliye de gösteriliyordu.

## Yapılan — views/kayit.ejs
- Okul etiketi + `<select name="okul">` bloğu `<% if (refTip !== 'veli') { %>` ile sarıldı.
- Veli bilgi metni güncellendi: "İl/İlçe/Okul alanları veli için opsiyoneldir" ->
  "İl ve ilçe bilgisi veli için opsiyoneldir".

## Doğrulama (render testi, rol bazında)
| rol | okul | sınıf | şube | il |
|---|---|---|---|---|
| veli | yok | yok | yok | VAR |
| ogrenci | VAR | VAR | VAR | VAR |
| ogretmen | VAR | yok | yok | VAR |
| kurumsal | VAR | yok | yok | VAR |

Diğer roller etkilenmedi.

## Not
Sunucu tarafında ek değişiklik gerekmedi: kayıt rotası okul alanı boş gelince zaten
sorun çıkarmıyor (veli için il/ilçe/okul opsiyonel).

## Değişen dosyalar
- views/kayit.ejs
- package.json (4.17.5 -> 4.17.6)
