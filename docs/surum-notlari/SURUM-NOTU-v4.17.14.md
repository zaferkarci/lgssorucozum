# v4.17.14 — Panel içi yazışma + hatalı soru bildirimi aynı mesaj sisteminde

## Yapılan
### models/Mesaj.js
Yeni alanlar: `kullaniciAdi` (girişsiz formda boş), `kaynak`
('iletisim' | 'panel' | 'hatali-soru'), `soruId`, `soruBilgi`, `ogrenciOkudu`.

### routes/panel.js
- `POST /panel/mesaj-gonder` (oturumKontrol): giriş yapmış kullanıcı mesaj gönderir.
  Hatalı soru bildirimi de bu uçtan gelir (kaynak='hatali-soru' + soruId/soruBilgi).
- Render'a `benimMesajlarim` (kullanıcının KENDİ mesajları + admin cevapları, son 30).

### views/panel.ejs
- Profil sayfasına **"✉️ Mesajlarım"** kartı: mesaj yazma kutusu + geçmiş yazışma.
  Admin cevapları yeşil kutularda görünür. Okunmamış cevap varsa kırmızı sayaç.
- **"⚠️ Hatalı"** butonları (3 yer: çözülen sorular tablosu + 2 soru ekranı) artık
  genel iletişim formuna gitmiyor; panel ucuna POST ediyor. Kısa açıklama sorulur.

### routes/admin.js + views/admin.ejs
- Admin cevap yazınca `ogrenciOkudu=false` → kullanıcının panelinde "yeni cevap" rozeti.
- Mesaj kartında kaynak rozeti: "⚠️ Hatalı soru" / "📱 Panel" + @kullanıcı + soru bilgisi.

## Gizlilik
- Kullanıcı YALNIZCA kendi mesajlarını görür (sorgu `kullaniciAdi` ile sınırlı).
- Tüm mesaj listesi ve cevap yazma yalnız adminKontrol'lü uçlarda.
- Hiçbir public sayfa/API bu verileri döndürmez.

## Test
- node --check (Mesaj/panel/admin) geçti; panel.ejs ve admin.ejs derlendi.
- Public `/iletisim?hata=1` bağlantısı kalmadı (0); hataBildir çağrısı 3 + tanım 1.

## Değişen dosyalar
- models/Mesaj.js, routes/panel.js, routes/admin.js, views/panel.ejs, views/admin.ejs
- package.json (4.17.13 -> 4.17.14)
