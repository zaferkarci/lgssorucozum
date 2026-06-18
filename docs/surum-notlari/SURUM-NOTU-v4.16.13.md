# v4.16.13 — Ünite şablonuna iki yeni sütun: Öğrenme Çıktıları + Süreç Bileşenleri (TAM PROJE)

Çalışan TÜM proje. v4.16.12 üzerine kuruludur.

## Değişiklik
Aktif Excel şablonunun (GET /unite-sablon-indir — routes/admin.js) SAĞINA iki yeni
sütun eklendi:
  ESKI başlık: Sınıf | Ders | Ünite No | Ünite Adı | Konu
  YENI başlık: Sınıf | Ders | Ünite No | Ünite Adı | Konu | Öğrenme Çıktıları | Süreç Bileşenleri

Her veri satırına ve örnek satıra sağ uçta iki boş hücre eklendi; sütun
genişlikleri (!cols) 5'ten 7'ye çıkarıldı.

## Kapsam (bilinçli olarak dar tutuldu)
- Yalnız ŞABLON İNDİRME çıktısı değişti. Başka HİÇBİR şey değişmedi.
- models/Unite.js DOKUNULMADI — konular hâlâ [String]. Yeni iki sütun için
  veritabanı alanı EKLENMEDİ.
- /unite-excel-yukle (parser) DOKUNULMADI. Parser sütunları sıraya göre okur
  (s[0..4]) ve fazladan gelen 2 sütunu (s[5], s[6]) zaten görmezden gelir.
  Test edildi: 7 sütunlu dosya yüklenince konular eskisiyle BİREBİR aynı okunuyor.
- Sonuç: Öğrenme Çıktıları / Süreç Bileşenleri sütunları şablonda görünür ve
  doldurulabilir; ancak şu an YÜKLEMEDE saklanmaz (bilgi amaçlı referans sütun).
  İleride bu iki alanın veritabanına yazılması istenirse ayrı bir sürümde,
  konular: [String] korunarak (paralel konuDetay alanıyla) eklenebilir.
- server.js'teki ölü/gölgelenmiş ikinci /unite-sablon-indir (eski 5 sütunlu,
  farklı başlıklı) DOKUNULMADI — kapsam dışı bırakıldı.
- İstatistik, günlük hedef, panel ünite/konu ağacı, konu izinleri, kayıtlı
  üniteler tablosu, manuel ekle/güncelle, mevcut öğrenci verisi: TAMAMEN AYNI.

## Değişen dosyalar (v4.16.12 tabanına göre)
- routes/admin.js   (/unite-sablon-indir: 5 satırda 2 sütun eklendi — başlık,
                      örnek satır, iki veri dalı, !cols)
- package.json      (4.16.12 -> 4.16.13)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı; admin.js'te tam 5 satır).

## Test
- routes/admin.js node --check geçti. Satır sonu konvansiyonu korundu
  (orijinaldeki 3 CRLF + LF düzeni birebir aynı; toplam 1556 satır).
- xlsx round-trip: üretilen şablon 7 sütun, başlıklar doğru, örnek satırda 2 boş
  hücre, !cols 7 öğe.
- Parser non-breaking testi: 7 sütunlu (çıktı/süreç dolu) dosya → konular eskisiyle
  aynı, fazla 2 sütun görmezden gelindi.

## Git
```bash
git add -A
git commit -m "v4.16.13: unite sablonuna Ogrenme Ciktilari + Surec Bilesenleri sutunlari eklendi"
git push
git tag v4.16.13
git push origin v4.16.13
```
