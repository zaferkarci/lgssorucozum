# v4.8.13 — Soru Dağılımı raporu (TAM PROJE)

Çalışan TÜM proje. v4.8.12 üzerine kuruludur.

## Ne eklendi
Admin'e yeni bir raporlama ekranı: **her sınıf / ders / ünite / konu için kaç soru
olduğunu** gösterir (0 olanlar dahil).

- **Menü:** Admin → İçerik → **📊 Soru Dağılımı**.
- **Üstte filtre:** Sınıf → Ders → Ünite → Konu (kademeli/cascading). Seçenekler
  "Üniteler" menündeki yapıdan üretilir; üst seçim alt seçenekleri daraltır. "Temizle"
  ile sıfırlanır.
- **Tablo:** Sınıf, Ders, Ünite (No + Ad), Konu, **Toplam**, **Yayında** sütunları;
  altta filtreye göre toplamlar. 0 soru olan konular kırmızı vurgulanır (içerik boşluğu).
- **Tutarlılık uyarısı:** Bir soru, tanımlı hiçbir ünite/konuya (Üniteler'deki adlarla)
  eşleşmiyorsa rapor altında "X soru eşleşmiyor" uyarısı çıkar — adları Üniteler ile
  birebir aynı yapman gerektiğini hatırlatır.

## Nasıl çalışır
- Yeni endpoint `GET /admin/soru-dagilim-veri` (adminKontrol korumalı): Soru'ları tek
  aggregation ile (sinif, ders, unite, konu) başına sayar (toplam + yayında), sonra
  Üniteler yapısındaki her konuya bu sayıları (yoksa 0) eşler. Görünüm ver: AJAX ile
  bu endpoint'ten çekilir, filtre ve tablo tamamen istemci tarafında.

## Değişen dosyalar (v4.8.12 tabanına göre)
- routes/admin.js   (yeni `/admin/soru-dagilim-veri` endpoint'i)
- views/admin.ejs   (İçerik nav'a menü + `mod=soruDagilim` görünüm bloğu)
- package.json      (4.8.12 → 4.8.13)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Soru/Unite modelleri ve diğer akışlar
korundu.

## Test
- routes/admin.js `node --check`, views/admin.ejs EJS derleme + yeni menü inline JS
  `node --check` geçti. EOL korundu (admin.js LF; admin.ejs CRLF, stray LF: 0).
- Aggregation simülasyonu: tanımlı tüm konular (0 dahil) doğru sayıldı, yayında ayrı
  hesaplandı, tanımsız (orphan) soru "eşleşmeyen" olarak tespit edildi.

## Git
```bash
git add -A
git commit -m "v4.8.13: soru dagilim raporu - sinif ders unite konu bazli soru sayisi"
git push
git tag v4.8.13
git push origin v4.8.13
```
