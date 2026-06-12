# v4.8.7 — Konu İzinleri: admin'in açtığı konulardan soru çözme (TAM PROJE)

Çalışan TÜM proje. v4.8.6 üzerine kuruludur. Tasarım önceden onaylandı:
**varsayılan AÇIK** + **yeni "Konu İzinleri" menüsü**.

## Ne eklendi
Admin, hangi ünite/konulardan öğrencilere soru geleceğini açıp kapatabiliyor.
Öğrenciler yalnızca admin'in açık bıraktığı konulardan soru çözer. Liste tamamen
"Üniteler" menüsündeki sınıf/ders/ünite/konulardan çekilir.

- **Yeni menü:** Admin → İçerik → **🔓 Konu İzinleri**. Kademeli ağaç
  (Sınıf → Ders → Ünite → Konu) + her birinde aç/kapat kutusu. Ünite kutusu
  altındaki tüm konuları topluca açar/kapatır (kısmi seçimde belirsiz/indeterminate
  gösterir). "Hepsini Aç / Hepsini Kapat", sınıf filtresi ve canlı "X açık / Y kapalı"
  özeti var. "Kaydet" ile yazılır.
- **Öğrenci tarafı:** Soru havuzu kurulduktan sonra, kapatılan konuların soruları
  havuzdan çıkarılır. Sıralama mantığı (ders → ünite → konu) hiç değişmez.
  Yalnızca gerçek öğrencilere uygulanır; öğretmen/kurumsal/moderatör/demo tüm
  soruları görmeye devam eder (mevcut davranış).

## Varsayılan: AÇIK (mevcut davranış korunur)
Yeni `KonuIzin` koleksiyonunda yalnızca **kapatılan** konular saklanır. Kayıt yoksa
o konu AÇIK kabul edilir. Yani bu sürüm devreye girince hiçbir şey gizlenmez;
öğrenciler eskisi gibi tüm konuları görür. Sen sadece kapatmak istediklerini
işaretlersin. (Tam "beyaz liste" istersen menüde "Hepsini Kapat" deyip seçtiklerini
açabilirsin.)

## Veri modeli
Yeni `models/KonuIzin.js`: `{ sinif, ders, unite, konu, acik:Boolean }`,
(sinif,ders,unite,konu) üzerinde tekil indeks. `models/Soru.js` ve `models/Unite.js`
modellerine DOKUNULMADI.

## Değişen / eklenen dosyalar (v4.8.6 tabanına göre)
- **YENİ** models/KonuIzin.js
- routes/admin.js   (iki endpoint: `/admin/konu-izinleri-veri` GET,
                     `/admin/konu-izinleri-kaydet` POST — `adminKontrol` korumalı)
- routes/panel.js   (öğrenci soru havuzuna izin filtresi + KonuIzin require)
- views/admin.ejs   (İçerik nav'a menü + `mod=konuIzinleri` görünüm bloğu)
- package.json      (4.8.6 → 4.8.7)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Çekirdek modeller (Soru/Unite)
ve cevap/puanlama zinciri korunur.

## Not (panel boş-durumu)
Bir sınıf için tüm konular kapatılırsa, öğrenci mevcut "soru yok" ekranını görür
(panel.ejs'e dokunmadım — "%100 koru"). Bu duruma özel bir "şu an açık konu yok"
mesajı istersen ayrı, küçük bir ekleme olarak yapabilirim.

## Test
- routes/admin.js & routes/panel.js & models/KonuIzin.js `node --check` geçti.
- views/admin.ejs EJS derlendi; yeni menü inline JS'i `node --check` geçti.
- Uçtan uca simülasyon: admin bir konuyu kapatınca ağaçta KAPALI görünüyor ve o
  konunun soruları öğrenciye gitmiyor; açık konular normal akışta geliyor.
- Satır sonları korundu (admin.js LF; panel.js & admin.ejs CRLF; stray karışım yok).

## Git
```bash
git add -A
git commit -m "v4.8.7: konu izinleri - admin ac/kapat, ogrenci sadece acik konulardan coz"
git push
git tag v4.8.7
git push origin v4.8.7
```
