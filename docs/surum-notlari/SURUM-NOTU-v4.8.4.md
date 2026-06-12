# v4.8.4 — Öğretmen davet/referans linki kartı kaldırıldı (TAM PROJE)

Çalışan TÜM proje. v4.8.3 üzerine kuruludur.

## Değişiklik
Öğretmen panelinde profil sekmesindeki "Davet linklerin" kartı öğretmen rolü için
tamamen gizlendi. Öğretmen artık davet/referans linki görmez, üretmez ve linkleri
profilinde görünmez.

Tek satır değişti (views/panel.ejs): kartı saran koşul
`k.rol !== 'ogrenci'` → `k.rol !== 'ogrenci' && k.rol !== 'ogretmen'`.
Böylece kart yalnızca **kurumsal** ve **veli** (ve demo) rollerine render edilir;
bu roller AYNEN korunur.

## Zaten yapılmış olanlar (önceki sürümler — bu pakette doğrulandı)
İstenen davranışların çoğu daha önce eklenmiş; bu sürüm sadece kalan görünür kartı
kapatır:
- **Otomatik / günlük / "ertesi gün" link üretimi:** v4.6.8'de tamamen kaldırıldı
  (routes/panel.js — öğretmen panel verisi hazırlanırken hiçbir otomatik üretim yok).
- **Yeni öğretmen kaydında referans linki üretimi:** routes/auth.js'de
  `if (rol !== 'ogrenci' && rol !== 'ogretmen')` ile zaten atlanıyor (v4.6.2/v4.6.8).
- **Öğretmenin link üretmesi:** Öğretmene açık bir üretim endpoint'i/butonu yok.
  `/kurum/davet-uret` yalnızca kurumsal role (403 aksi halde), `/veli/davet-uret`
  yalnızca veli role izinli; kart içindeki üret formu da yalnızca kurumsala render
  ediliyordu.

## Değişen dosyalar (v4.8.3 tabanına göre)
- views/panel.ejs   (öğretmen için davet linkleri kartı koşulu + açıklayıcı yorum)
- package.json      (4.8.3 → 4.8.4)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## İsteğe bağlı — eski kayıtları DB'den silmek ("silinsin")
Öğretmenlerin v4.6.8 öncesinden kalan eski referans kodları DB'de duruyor olabilir.
Kart kaldırıldığı için artık hiçbir yerde görünmezler. İstersen bunları DB'den de
temizleyebilirsin. Aşağıdaki komut SADECE **kullanılmamış** öğretmen kodlarını siler;
**kullanılmış** kodlar (`kullanildi: true`) "Davet Ettiklerim" listesini beslediği
için DOKUNULMAZ. (mongosh / Atlas):

```js
// 1) Öğretmen kullanıcı adlarını topla (yalnız saf 'ogretmen' rolü; kurumsal hariç)
const ogr = db.kullanicis.find({ rol: 'ogretmen' }, { kullaniciAdi: 1, _id: 0 })
                         .toArray().map(u => u.kullaniciAdi);
// 2) Sadece KULLANILMAMIŞ öğretmen kodlarını sil
const r = db.referanskodus.deleteMany({ olusturan: { $in: ogr }, kullanildi: false });
print('Silinen kullanilmamis ogretmen referans kodu:', r.deletedCount);
```
Not: Kullanılmış kodları da silmek "Davet Ettiklerim" sayısını/listenisi bozar;
bilerek dışarıda bırakıldı. Bu adım koddan bağımsızdır; deploy gerektirmez.

## Test
- EJS şablonu derlendi (tag/brace dengesi sağlam).
- Koşul testi: ogrenci→gizli, ogretmen→gizli, kurumsal→görünür, veli→görünür,
  demo→görünür (öğretmen dışında tüm roller değişmedi).

## Git
```bash
git add -A
git commit -m "v4.8.4: ogretmen davet linkleri karti gizlendi (uretim/gosterim kapali)"
git push
git tag v4.8.4
git push origin v4.8.4
```
