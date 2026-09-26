# v4.16.56 — Analiz süresince ayrı (daha yüksek) günlük limit

## İstek
Seviye tespiti (analiz) sürerken standart üyeye daha geniş bir günlük hak verilsin;
analiz bitince normal limite dönsün. Limit yine de tamamen kalkmasın.

## Yapılanlar
### Yeni ayar: `analiz_gunluk_limit` (varsayılan 20)
- routes/admin.js: mod=ayarlar'da okunur; /admin/ayar-kaydet kaydeder.
  Doğrulama: 1-999 arası tam sayı; geçersiz/boş -> 20, 999 üstü -> 999.
- views/admin.ejs: Sistem > Ayarlar'da "Standart Üye Günlük Soru Limiti" bölümünün
  altına "Seviye tespiti (analiz) sürerken günlük limit" alanı eklendi.
  (999 girilirse analiz sırasında pratikte sınırsız olur.)

### services/gunlukHedef.js
- Kullanıcı sorgusuna rol/sinif eklendi (analiz tespiti için, ek sorgu yok).
- Standart üyede: analiz sürüyorsa toplamHedef = analiz limiti, bitmişse normal limit.
- Dönüşe `analizModu` bayrağı eklendi.
- İmza `gunlukHedefHesap(kullaniciAdi, opts)` oldu. `opts.analizde` verilirse analiz
  durumu TEKRAR HESAPLANMAZ; verilmezse servis `analizModundaMi` ile kendi hesaplar
  (/cevap gibi çağrı yerleri için geriye dönük uyumlu).

### routes/panel.js
- Panel zaten `analizTamamlandi`'yı hesapladığı için servise
  `{ analizde: !analizTamamlandi }` olarak geçiriliyor — aynı ağır hesap (yayındaki
  sorular + konu kapsama) ikinci kez yapılmıyor.

## Premium
Etkilenmez: premium'da ders bazlı hedef (max(2, 30g ort+1)) aynen korunur.

## Test
- node --check (gunlukHedef/admin/panel) geçti.
- Sahte model katmanıyla: analiz sürüyor -> hedef 20; analiz bitti -> hedef 2;
  opts verilmediğinde servis kendi hesaplıyor (20 / 2 doğru); premium standartMod=false.
- admin.ejs render: kayıtlı değer (30) görünüyor, ayar yokken 20;
  duyuru/yedek/kullanicilar regresyonsuz.

## Değişen dosyalar
- services/gunlukHedef.js, routes/admin.js, routes/panel.js, views/admin.ejs
- package.json (4.16.55 -> 4.16.56)
