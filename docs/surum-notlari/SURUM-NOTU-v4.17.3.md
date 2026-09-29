# v4.17.3 — Taşınma modu: eski adres için yönlendirme sayfası + cron kapatma

## Amaç
Site kendi sunucusuna (https://elcezeri.net) taşındı. Eski adres
(lgssorucozum-4.onrender.com) bir süre daha yaşayacak ve oraya giren öğrencileri
bilgilendirip yeni adrese yönlendirecek.

## Yeni env değişkenleri
- `TASINDI=1`  -> taşınma modunu açar (yalnızca ESKİ sunucuda/Render'da ayarlanır)
- `YENI_ADRES` -> hedef adres (varsayılan: https://elcezeri.net)

## Davranış (TASINDI=1 iken)
1. **Tüm istekler** bilgilendirme sayfası görür: "Adresimiz değişti", yeni adres,
   "Hemen git" butonu ve 5 saniyelik otomatik yönlendirme (meta refresh).
   - Yol ve sorgu KORUNUR: `/panel/alpay?mod=profil` -> `https://elcezeri.net/panel/alpay?mod=profil`
   - Statik dosyalardan (public/) SONRA, rotalardan ÖNCE devreye girer.
2. **Cron kurulmaz** (05:10 günlük hesaplama).
3. **Başlangıç kontrolü çalışmaz** (24 saatten eskiyse otomatik hesaplama).

Böylece eski adres yalnızca yönlendirme yapar; aynı veritabanında ÇİFT hesaplama olmaz.

## Yeni sunucuda
`TASINDI` tanımlanmaz (veya 1 dışında bir değer) -> davranış tamamen eskisi gibi,
cron normal çalışır.

## Test
- node --check server.js geçti.
- Yönlendirme mantığı izole test edildi: yol/sorgu korunuyor, 5 sn meta refresh var,
  alan adı ve "Hemen git" linki doğru üretiliyor.
- TASINDI korumasının üç noktada da (middleware, cron.schedule, başlangıç kontrolü)
  yerinde olduğu doğrulandı.

## Kurulum (Render'da)
Environment'a ekle:
```
TASINDI=1
YENI_ADRES=https://elcezeri.net
```
Deploy et. Render artık yalnızca yönlendirme yapar.

## Değişen dosyalar
- server.js, package.json (4.17.2 -> 4.17.3)
