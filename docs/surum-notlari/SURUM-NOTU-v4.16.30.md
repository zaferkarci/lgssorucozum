# v4.16.30 — Gemini çağrısı header auth + teşhis logları (görselli PDF 403)

## Sorun
Yeni AQ. anahtarı tarayıcıda (model listeleme GET) çalışıyor ama Render sunucusundan
generateContent (POST) "403 Forbidden" veriyordu. Yeni AQ. anahtarları hizmet
hesabına bağlı geliyor; ?key= query param ile sunucudan reddedilebiliyor.

## Yapılanlar — routes/pdfyukle.js (sadece Gemini çağrısı)
- Kimlik gönderimi ?key=${apiKey} (query param) → Google'ın güncel önerdiği
  'x-goog-api-key' HEADER yöntemine çevrildi. (Tek kimlik gönderilir; AQ. anahtarları
  için önerilen yol.)
- Anahtar .trim()'lendi (gizli boşluk/satır sonu sorununa karşı).
- Teşhis logları: anahtar öneki (ilk 6) + uzunluk + HTTP durum kodu loglanır.
  Hata mesajına da HTTP durumu eklendi.

## Amaç
- Eğer sorun ?key= yöntemiyse → header'a geçince DÜZELİR.
- Düzelmezse → Render logları artık "anahtar onek/uzunluk" ve "yanit durumu" ile
  sunucunun gerçekte hangi anahtarı kullandığını ve kesin durumu gösterir.

## %100 korunan
- Prompt, model (gemini-2.5-flash), istek gövdesi, JSON ayrıştırma, soru kaydetme,
  diğer tüm kod. Sadece kimlik gönderimi header'a alındı + log eklendi. CRLF korundu.

## Test
- node --check pdfyukle.js geçti.

## Kullanım
Deploy → görselli PDF dene → Render Logs'ta:
- '[Gemini] anahtar onek: AQ.Ab8... | uzunluk: 51' → Render'ın anahtarı.
- '[Gemini] yanit durumu: 200' → düzeldi. '403' → hâlâ var ama anahtar netleşti.

## Değişen dosyalar
- routes/pdfyukle.js
- package.json (4.16.29 -> 4.16.30)

## Git
```bash
git add -A
git commit -m "v4.16.30: Gemini header auth (x-goog-api-key) + teshis loglari"
git push
git tag v4.16.30
git push origin v4.16.30
```
