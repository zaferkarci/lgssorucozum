# v4.17.7 — Şifremi unuttum düzeltmesi: SMTP 587 (STARTTLS)

## Sorun
Kendi sunucuya taşındıktan sonra şifre sıfırlama e-postaları gönderilemiyordu.
Log: `Mail gönderim hatası: Connection timeout`

## Teşhis (sunucuda ölçüldü)
- `nc -zv smtp.gmail.com 587` -> BAŞARILI (IPv4 ve IPv6)
- nodemailer testi: **587 (STARTTLS) BAŞARILI**, **465 (SSL) Connection timeout**

Sebep: `nodemailer.createTransport({ service: 'gmail' })` varsayılan olarak **465**
portunu kullanır. Bu sunucuda 465 dışarıya kapalı olduğundan bağlantı timeout'a
düşüyordu. Gmail uygulama parolası geçerliydi (587'de doğrulama başarılı).
Render'da 465 açık olduğu için sorun orada görünmemişti.

## Çözüm — mailGonder.js
- `service: 'gmail'` yerine host/port AÇIKÇA belirtildi:
  `host: smtp.gmail.com`, `port: 587`, `secure: false` (STARTTLS).
- `SMTP_HOST` / `SMTP_PORT` env değişkenleriyle değiştirilebilir
  (ör. ileride Brevo'ya geçilirse kod değişikliği gerekmez).
- `secure` otomatik: port 465 ise true, değilse false.
- Bağlantı ve karşılama zaman aşımı 15 sn (sonsuz bekleme olmasın).

## Test sonrası doğrulama (sunucuda)
Deploy sonrası şifremi unuttum ekranından kendi e-postanla dene; log'da
`Mail gönderim hatası` satırı ÇIKMAMALI ve e-posta gelmeli.

## Not
Mail hatası kullanıcıya gösterilmiyor (güvenlik gereği "eğer kayıtlıysa gönderildi"
mesajı veriliyor). Sorun yaşanırsa `pm2 logs elcezeri | grep -i mail` ile bakılmalı.

## Değişen dosyalar
- mailGonder.js
- package.json (4.17.6 -> 4.17.7)
