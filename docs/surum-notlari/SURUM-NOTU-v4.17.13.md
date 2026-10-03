# v4.17.13 — Mesajlara aynı sayfadan cevap yazma (yalnızca admin görür)

## Yapılan
- models/Mesaj.js: `yanitlar[]` alanı ({ metin, yazan, tarih }).
- routes/admin.js: `POST /mesaj-yanitla` — adminKontrol zorunlu; cevabı mesaja ekler,
  mesajı okundu işaretler. Metin 4000 karakterle sınırlanır.
- views/admin.ejs (İletişim > Mesajlar): her mesajın altında önceki cevaplar yeşil
  kutularda tarih damgasıyla listelenir + "Cevap Yaz" alanı.

## Erişim / güvenlik
- Mesaj verisi kod tabanında YALNIZCA routes/admin.js içinde okunuyor ve yalnızca
  `mod === 'mesajlar'` iken çekiliyor (doğrulandı: başka hiçbir rota Mesaj okumuyor).
- `/admin` ve `/mesaj-yanitla` dahil tüm admin uçlarında `adminKontrol` zorunlu —
  oturum yoksa veri dönmez.
- Hiçbir public sayfa, API veya JSON ucu `yanitlar` alanını döndürmez.
- Cevaplar kullanıcıya GÖNDERİLMEZ: iletişim formu girişsiz doldurulduğu için
  gönderenin hesabı yoktur. Cevap, admin panelinde duran bir iç nottur.

## Dürüst sınır
"Hiçbir saldırgan asla ulaşamaz" garantisi hiçbir sistemde verilemez. Buradaki koruma:
veri yalnızca kimliği doğrulanmış admin oturumuyla erişilebilir ve başka hiçbir yüzeyde
görünmez. Güvenliği artırmak için admin parolasının güçlü olması ve paylaşılmaması
belirleyicidir.

## Test
- node --check (Mesaj + admin) geçti; admin.ejs derlendi.
- Mesajlar ekranı render: cevap formu ve mevcut cevap görünüyor.

## Değişen dosyalar
- models/Mesaj.js, routes/admin.js, views/admin.ejs
- package.json (4.17.12 -> 4.17.13)
