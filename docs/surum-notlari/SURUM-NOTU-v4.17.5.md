# v4.17.5 — Yazdırılan kodlar işaretleniyor (aynı kod iki kez dağıtılmasın)

## Sorun
v4.17.4'te yazdırma listesi "kullanılmamış" kodlardan geliyordu. Kodlar ancak veli
KAYIT OLUNCA kullanılmış sayıldığı için, dağıtılmış ama henüz kullanılmamış kodlar
listede kalıyordu. Ertesi gün 12 kod daha istendiğinde AYNI kodlar tekrar basılır ve
aynı kod iki kişiye verilmiş olurdu (ikincisi kayıt olamazdı).

## Çözüm
### models/ReferansKodu.js
- Yeni alanlar: `yazdirildi` (Boolean, indeksli), `yazdirilmaTarih` (Date).

### routes/admin.js — /admin/referans-yazdir
- Varsayılan filtre artık: kullanılmamış **VE** daha önce yazdırılmamış.
- Çıktı alınan parti anında `yazdirildi: true` olarak işaretlenir.
- Sayfada "henüz yazdırılmamış kod: N" bilgisi gösterilir.
- **`?tekrar=1`**: çıktı kaybolursa aynı kodları yeniden basmak için; yazdırılmış
  kodları da listeye dahil eder. Sayfadaki uyarıda bu bağlantı hazır verilir.

## Test (simülasyon)
- Gün 1: 120 kod basıldı (K001-K120).
- Gün 2: 12 kod istendi -> K121-K132 geldi, **çakışma 0**.
- `?tekrar=1` -> eski kodlar yeniden basılabiliyor.
- Kullanılmış (kayıt olunmuş) kodlar hiçbir modda listeye girmiyor.
- node --check (model + admin) geçti.

## Mevcut kodlar
Eski kayıtlarda `yazdirildi` alanı yok; Mongoose bunları `$ne: true` ile
"yazdırılmamış" sayar — yani mevcut kodlar normal şekilde kullanılmaya devam eder.

## Değişen dosyalar
- models/ReferansKodu.js, routes/admin.js
- package.json (4.17.4 -> 4.17.5)
