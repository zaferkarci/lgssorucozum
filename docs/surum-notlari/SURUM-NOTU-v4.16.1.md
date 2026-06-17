# v4.16.1 — Ünite/konu seçimi: açılır menü yerine KART seçimi (TAM PROJE)

Çalışan TÜM proje. v4.16.0 üzerine kuruludur. Yalnız UI değişikliği.

## Değişiklik
"Ünite ve konu seçerek çöz" bölümündeki açılır menüler (Ders / Ünite / Konu
dropdown'ları + Başla butonu), ders kartlarıyla aynı görünümde KART tabanlı
drill-down (adım adım) seçimle değiştirildi:

- 1. adım: Ders kartları (ikon + kalan soru sayısı). Tıkla → ünite adımı.
- 2. adım: "← Geri" + "▶ Tüm üniteler (bu dersi çöz)" kartı + ünite kartları.
  Bir ünite kartına tıkla → konu adımı.
- 3. adım: "← Geri" + "▶ Tüm konular (bu üniteyi çöz)" kartı + konu kartları.
  Bir konu kartına tıkla → o konuyu çözmeye başla.

Üst kısımda seçim yolu (Ders › Ünite) ve Geri butonu gösterilir. Her kartta o
kapsamın kalan soru sayısı yazar. "Tüm üniteler / Tüm konular" kartlarıyla ders
veya ünite seviyesinde de başlanabilir.

Sunucu mantığı (filtreler ?ders/?unite/?konu, ağaç, kolaydan-zora sıralama,
hedef kuralı) AYNI; yalnız seçim arayüzü dropdown'dan karta dönüştü.

## Değişen dosyalar (v4.16.0 tabanına göre)
- views/panel.ejs   (dropdown seçici -> kart drill-down seçici)
- package.json      (4.16.0 -> 4.16.1)
Başka HİÇBİR dosya değişmedi (routes/panel.js dahil — diff ile doğrulandı).

## Test
- panel.ejs ejs.compile; kart istemci JS izole syntax — geçti.
- Eski dropdown fonksiyon/ID referansları kalmadı (0).
- Satır sonu korundu (CRLF).

## Git
```bash
git add -A
git commit -m "v4.16.1: unite konu secimi acilir menu yerine kart secimi"
git push
git tag v4.16.1
git push origin v4.16.1
```
