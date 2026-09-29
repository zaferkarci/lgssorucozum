# v4.17.2 — dotenv: kendi sunucuda .env dosyasını oku

## Sorun
Proje Render'da barındırılırken ortam değişkenlerini platform enjekte ediyordu; bu yüzden
`dotenv` hiç gerekmemişti. Kendi sunucuya (VPS) taşınınca `.env` dosyasını okuyan bir şey
olmadığı için `process.env.MONGO_URI` boş kaldı ve uygulama şu hatayla açılmadı:
`Cannot init client. Please provide correct options` (connect-mongo).

## Çözüm — server.js (ilk satır) + package.json
- Dosyanın en başına: `try { require('dotenv').config(); } catch (e) {}`
- package.json'a `dotenv` bağımlılığı eklendi.

## Neden güvenli
- dotenv, ZATEN TANIMLI `process.env` değerlerinin üzerine YAZMAZ. Yani Render'da
  platformun verdiği değerler geçerli kalmaya devam eder; davranış değişmez.
- `.env` dosyası yoksa sessizce geçer.
- try/catch içinde olduğu için paket kurulu değilse de uygulama açılır.

## Kurulum (sunucuda)
```bash
cd ~/lgssorucozum
git pull
npm install
pm2 restart elcezeri   # veya ilk kez: pm2 start server.js --name elcezeri
```

## Değişen dosyalar
- server.js, package.json (4.17.1 -> 4.17.2)
