# v4.8.5 — Soru Listesi: sağa dayalı seçilebilir kartlar + sol önizleme paneli (TAM PROJE)

Çalışan TÜM proje. v4.8.4 üzerine kuruludur.

## Değişiklik
Admin → İçerik → Sorular (mod=soruListesi) görünümü yeniden düzenlendi:

- **Soru kökü kartta yazılı:** Kart artık kısaltılmış başlık yerine sorunun
  kökünü (soruMetni) gösterir. Sınıf/ders/ünite/konu küçük bir etiket satırına
  alındı; soru metni en fazla 3 satır gösterilip taşması kırpılır.
- **Seçilebilir / işaretlenebilir:** Her kartta bir onay kutusu var; karta
  tıklamak onu işaretler ve aktif (yeşil çerçeveli) hale getirir. Onay kutusu
  bağımsız olarak birden çok soruyu işaretlemeye de izin verir.
- **Sağa dayalı kartlar + sol önizleme:** Kartlar sayfanın sağ kolonunda durur;
  solda yapışkan bir önizleme paneli vardır. Bir karta **tek tıklayınca** sol
  panelde sorunun küçük bir önizlemesi (öncüller, tablo başlığı, şıklar, doğru
  cevap vurgulu) belirir. Geniş ekranda iki sütun; dar ekranda alt alta diziler
  (liste üstte, önizleme altta).

Mevcut "ÖNİZLE" modalı aynen korunur; render mantığı `_soruOnizleHtml(s)` ortak
fonksiyonuna alınarak hem modal hem de sol panel tarafından kullanılır (tek
kaynak — davranış birebir aynı). "DÜZENLE" ve "SİL" eskisi gibi çalışır
(karta tıklama bu butonlarla çakışmaz).

## Değişen dosyalar (v4.8.4 tabanına göre)
- views/admin.ejs    (soruListesi iki sütunlu yerleşim + seçilebilir kartlar +
                      `_soruOnizleHtml` ortaklaştırması + panel/seçim fonksiyonları)
- public/style.css   (yeni `.soru-liste-*` / `.soru-onizleme-*` / `.soru-sec-kutu`
                      / `.admin-soru-etiket` kuralları — sona eklendi; mevcut
                      kurallar değişmedi, override'lar `.soru-liste-kolon` ile
                      kapsamlandığı için diğer sayfalardaki `.admin-soru-item`
                      kullanımları etkilenmez)
- package.json       (4.8.4 → 4.8.5)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- EJS şablonu derlendi; tüm inline JS blokları `node --check` geçti.
- `_soruOnizleHtml(s)` sandbox'ta render edildi (soru metni, doğru cevap vurgusu,
  şıklar) — modal ve panel için aynı çıktı.
- soruListesi bloğu örnek verilerle render edildi: iki sütun, sol önizleme
  placeholder'ı, tıkla-seç, onay kutusu, soru kökü kartta — hepsi doğrulandı.
- Satır sonları CRLF korundu (her iki dosyada stray LF: 0).

## Git
```bash
git add -A
git commit -m "v4.8.5: soru listesi - saga dayali secilebilir kartlar + sol onizleme paneli"
git push
git tag v4.8.5
git push origin v4.8.5
```
