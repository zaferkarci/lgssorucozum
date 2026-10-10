# v4.17.21 — Mesaj gizliliği: varsayılan yönetici şifresi kaldırıldı, şifre sayfaya gömülmüyor

## İstek
Kullanıcı ↔ yönetici mesajlarını yönetici (site sahibi) dışında kimse görmesin.

## Denetim (mesajlara erişen tüm kod yolları)
Mesajlar yalnız iki yerde okunuyor:
- `routes/admin.js` → `/admin?mod=mesajlar`, `/mesaj-okundu`, `/mesaj-baslat`, `/mesaj-yanitla`,
  `/mesaj-sil`, `/admin/yedek-al` — hepsi `adminKontrol` arkasında.
- `routes/panel.js` → kullanıcının **kendi** mesajları; `oturumKontrol` başkasının panelini 403'le keser,
  `/panel/mesaj-gonder` oturumdaki kullanıcıyla yazar.
Öğretmen, veli, kurum yöneticisi ve moderatörün mesajlara giden hiçbir yolu yok. Mesaj içeriği
e-postayla gönderilmiyor ve loglara yazılmıyor.

## Bulunan açıklar ve düzeltmeler
1. **Varsayılan yönetici şifresi (kritik)** — 6 dosyada `process.env.ADMIN_PASSWORD || '1234'` vardı.
   `.env`'de şifre tanımlı değilse **admin / 1234** ile herkes yönetici paneline (tüm mesajlara)
   girebiliyordu; depo herkese açık olduğu için bu varsayılan da biliniyordu.
   → `services/adminYetki.js` (yeni, TEK KAYNAK): varsayılan YOK. ADMIN_USER/ADMIN_PASSWORD
   tanımlı değilse veya şifre zayıfsa ('1234', 'admin', '123456'…) yönetici girişi **kapalı**;
   açılışta loga `⛔ … Yönetici girişi KAPALI` yazılır. Karşılaştırma zamanlamaya dayanıklı
   (sha256 + timingSafeEqual); şifrede ':' olabilir.
   Kullanan yerler: routes/admin.js, routes/panel.js, routes/takip.js, routes/pdfyukle.js,
   routes/gorselliPdfYukle.js, server.js (`/admin/cron-tetikle`).
2. **Şifre sayfa kaynağında** — admin sayfası AJAX için `Authorization: Basic …` değerini (base64
   kullanıcı:şifre, kolayca çözülür) HTML'e gömüyordu. → `adminToken` artık boş; tüm AJAX uçları
   önce oturuma (`adminGirisli`) baktığı için işlevler aynen çalışır.
3. **Önbellek** — yönetici sayfalarına `Cache-Control: no-store, private` (ortak bilgisayarda geri
   tuşuyla mesaj görünmesin). Panel ve takip sayfalarında zaten vardı.
4. **Okundu durumu** — yönetici bir kullanıcının panelinden mesajlarına bakınca mesajlar o kullanıcı
   için "okundu" sayılmaz (kullanıcı kendisi görene kadar rozet kalır).
5. `SESSION_SECRET` tanımlı değilse açılışta uyarı loglanır.

## Test (yerel demo)
- admin:1234 → 401; doğru şifre → 200; sayfa kaynağında şifrenin base64'ü: 0.
- `.env`'de ADMIN_PASSWORD boş → admin:1234 ve admin:(boş) → 401, logda "Yönetici girişi KAPALI".
- Oturumla, Authorization başlığı olmadan `/mesaj-baslat` → çalışıyor (302).
- deniz kendi mesajını görüyor; başka öğrenci / öğretmen / veli deniz'in mesaj sayfasına → 403,
  içerik 0; üçü de `/admin?mod=mesajlar` → 401; sahte `?kullanici=deniz` parametresi → 0.
- Yönetici deniz'in panelini açtıktan sonra deniz'in okunmamış rozeti hâlâ 1.
- Cache-Control başlıkları panel ve admin sayfalarında `no-store`.

## Yayın öncesi ZORUNLU kontrol
`.env` içinde `ADMIN_USER` ve güçlü bir `ADMIN_PASSWORD` olmalı; yoksa bu sürümle yönetici
paneline sen de giremezsin (bilinçli olarak varsayılan yok).

## Değişen dosyalar
- services/adminYetki.js (yeni)
- server.js, routes/admin.js, routes/panel.js, routes/takip.js, routes/pdfyukle.js, routes/gorselliPdfYukle.js
- package.json (4.17.20 -> 4.17.21)
