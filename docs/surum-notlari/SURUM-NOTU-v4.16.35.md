# v4.16.35 — Tekrar eden soru: ÖNLEME (A) + TELAFİ (B)

## A) Önleme (kök neden) — routes/admin.js
- /soru-ekle ve /soru-guncelle'ye tekrar kontrolü eklendi. Aynı sınıf+ders içinde
  metin+şıklar birebir aynı (soruImza.tam) bir soru varsa ekleme/güncelleme engellenir,
  "Bu soru zaten kayıtlı (Soru No: X)" uyarısı verilir. Böylece aynı soru bir daha
  iki kez eklenemez.

## B) Telafi — GET /admin/duplicate-telafi (kuru çalışma) · ?uygula=1 (uygula)
- Aynı sınıf+ders + aynı imza (metin+şıklar) grupları bulunur.
- Bir kullanıcı aynı grupta birden fazla kopyayı çözmüşse: İLK çözümü tutulur,
  SONRAKİ çözümleri silinir. Silinen cevap doğruysa kazanılanPuan kullanıcıdan
  GERİ ALINIR (puan -=), soruIndex 1 azaltılır. "Kullanıcı ikinci soruyu hiç
  çözmemiş gibi." Hiçbir istatistik BİRLEŞTİRİLMEZ.
- Tek çözüm yapan kullanıcılar (çift saymayanlar) dokunulmaz.
- Kopya sorular arşivlenir (durum='arsiv') → bir daha servis/rapor edilmez;
  asıl (en küçük soruNo) kopya kalır.
- Varsayılan KURU ÇALIŞMA: kaç grup, kaç kopya, kaç fazla cevap, kaç puan geri,
  kaç kullanıcı — rapor gösterilir, HİÇBİR ŞEY değişmez. "TELAFİYİ UYGULA" (onaylı)
  butonu ?uygula=1 ile gerçek işlemi yapar.
- İçerik menüsüne "🧮 Tekrar Soru Telafisi" linki (Tekrar Eden Sorular yanında).

## %100 korunan
- Puanlama, cevap akışı, mevcut duplicate tespit ekranı, diğer tüm kod. Sadece
  ekleme (2 guard + 1 endpoint + 1 link). admin.js LF, admin.ejs CRLF korundu.

## Test
- node --check admin.js geçti; admin.ejs render geçti (menü linkleri sağlam).
- Telafi mantığı mock veriyle simüle edildi:
  * A≡B kopya tespiti (normalize) doğru; canonical=en küçük soruNo.
  * Her kullanıcının SONRAKİ çözümü silindi (c2,c4); puan geri (ali -5, veli -4);
    soruIndex -1; tek-çözenler (ayşe/fatma) dokunulmadı; toplam 9 puan geri.

## Değişen dosyalar
- routes/admin.js (2 önleme guard + /admin/duplicate-telafi)
- views/admin.ejs (menü linki)
- package.json (4.16.34 -> 4.16.35)

## Kullanım
1. Admin → 🧮 Tekrar Soru Telafisi → KURU ÇALIŞMA raporunu incele.
2. Uygunsa "TELAFİYİ UYGULA" (onay) → temizlik yapılır.
3. Artık aynı soru tekrar EKLENEMEZ (önleme aktif).

## Git
```bash
git add -A
git commit -m "v4.16.35: tekrar eden soru onleme + telafi (dry-run/uygula)"
git push
git tag v4.16.35
git push origin v4.16.35
```
