# v4.16.31 — Gemini için GEMINI_BASE_URL (Cloudflare proxy desteği)

## Sorun
Render (Frankfurt/EU) sunucu IP'si Google tarafından engelleniyor → görselli PDF
analizinde generic 403. Anahtar/kod/billing doğru; engel ağ kenarında IP/bölge bazlı.

## Çözüm — routes/pdfyukle.js
- Gemini adresi sabit yerine GEMINI_BASE_URL env'inden okunur (yoksa varsayılan
  https://generativelanguage.googleapis.com). Böylece çağrı, engellenmeyen bir
  Cloudflare Worker proxy üzerinden geçirilebilir.
- '[Gemini] base:' logu eklendi (hangi adrese gittiği görünür).

## Kullanım
1. Cloudflare Worker (proxy) gelen yolu generativelanguage.googleapis.com'a iletir.
2. Render → Environment → GEMINI_BASE_URL = https://<worker>.workers.dev
   (GEMINI_API_KEY aynen kalır; anahtar header ile gider, proxy aynen iletir).
3. Deploy/Live → görselli PDF dene.

## %100 korunan
- Anahtar (x-goog-api-key header), model, istek/yanıt işleme, diğer tüm kod.
  Sadece adres env'den okunuyor. CRLF korundu.

## Test
- node --check pdfyukle.js geçti.

## Değişen dosyalar
- routes/pdfyukle.js
- package.json (4.16.30 -> 4.16.31)

## Git
```bash
git add -A
git commit -m "v4.16.31: Gemini GEMINI_BASE_URL env (Cloudflare proxy destegi)"
git push
git tag v4.16.31
git push origin v4.16.31
```
