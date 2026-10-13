# v4.17.22 — Yönetici şifresi yalnız özet olarak saklanır, sıralamada payda tüm kayıtlı öğrenciler

> Tam paket. v4.17.21-1'in tüm değişikliklerini de içerir.

## 1) Yönetici şifresi: düz metin yok — services/adminYetki.js, tools/admin-sifre.js (yeni), server.js, .gitignore
- `.env` içinde şifrenin kendisi değil, yalnız **bcrypt özeti** tutulur: `ADMIN_PASSWORD_HASH`. Özetten şifre geri
  elde edilemez. `ADMIN_PASSWORD_HASH` varsa eski `ADMIN_PASSWORD` yok sayılır.
- Şifre hiçbir sayfada, sayfa kaynağında, logda, git deposunda yoktur (v4.17.21'de sayfaya gömülü şifre zaten kaldırılmıştı).
- **Yeni komut** (sunucuda): `cd ~/lgssorucozum && node tools/admin-sifre.js`
  - Kullanıcı adı sorulur (Enter = mevcut).
  - Güçlü rastgele şifre üretir (20 karakter, bir kez gösterilir, doğrulamak için tekrar yazdırılır, sonra ekran temizlenir)
    ya da kendi şifrenizi **görünmez** girişle iki kez yazarsınız.
  - Kural: en az 12 karakter; küçük/büyük harf, rakam, sembolden en az 3 tür; kullanıcı adını ve tahmin edilebilir
    kelimeleri (admin, 1234, password, elcezeri…) içeremez; Türkçe karakter/boşluk yok (tarayıcı girişinde sorun çıkarır).
  - `.env`: `ADMIN_PASSWORD` satırı silinir, `ADMIN_PASSWORD_HASH='…'` yazılır, dosya izni 600 (yalnız sahibi okur).
    Yazma geçici dosya + yeniden adlandırma ile yapılır (yarıda kalırsa .env bozulmaz). Satır sonları korunur.
  - Açık **yönetici oturumları kapatılır** (eski şifreyle açılmış oturum kalmaz).
- Açılışta uyarılar: şifre hâlâ düz metinse → "node tools/admin-sifre.js"; özet varken eski düz satır da duruyorsa → "o satırı silin".
- **Deneme sınırı**: aynı IP'den 15 dakikada 10 farklı hatalı yönetici şifresi → 15 dakika yönetici girişi kapalı
  (429). Açık yönetici oturumu etkilenmez. nginx arkasında gerçek IP `X-Forwarded-For`'un son elemanından alınır.
- **Bayat kimlik**: tarayıcı eski şifreyi hatırlıyorsa artık "Yetkisiz!"de takılmaz; yanlış kimlik yok sayılır ve
  yönetici sayfası şifreyi yeniden sorar. Diğer sayfalar normal kullanıcı gibi açılır.
- Doğrulama başarılı olunca 10 dk bellekte tutulur (yalnız başlığın sha256 özeti), her istekte bcrypt çalışmaz.

## 2) Sıralamada payda = tüm kayıtlı öğrenciler — cronJobs.js, routes/panel.js
- "x / N" gösteriminde N artık o kapsamdaki (Türkiye / il / ilçe / okul / sınıf, aynı sınıf seviyesi) **tüm kayıtlı
  öğrencilerdir**; 10 soru barajını geçmeyenler de sayılır.
  Örnek: 46 kayıtlı 5. sınıf, 3'ü barajı geçmiş → **#1 / 46, #2 / 46, #3 / 46**; diğerleri **— / 46**.
- Ders sıralamalarında da aynı payda (o dersten 10 soru çözmemiş öğrenciler dahil).
- Öğretmen/veli/kurumsal hesaplar paydaya girmez. (Bir öğretmen hesabı 10+ soru çözüp sıralamaya girdiyse paydaya da
  eklenir; sıra hiçbir zaman paydayı aşmaz.)
- Gece 05:10 cron'unda ve canlı hesaplamada (cron'dan sonra soru çözen öğrenci) aynı mantık. Sıra numaraları değişmez,
  yalnız paydalar büyür. Yeni paydalar ilk cron çalışmasından sonra görünür (hemen görmek için admin panelinin üstündeki "⏰ Hesapla" düğmesi).

## Test (yerel demo)
- Şifre aracı: zayıf/kısa/kullanıcı adını içeren şifre → reddedildi; eşleşmeyen tekrar → reddedildi; 3 hatada hiçbir şey değişmedi.
  Başarılı: `.env` → `ADMIN_USER=yonetim`, `ADMIN_PASSWORD` silindi, `ADMIN_PASSWORD_HASH='$2b$12$…'`, izin 600; 14 yönetici oturumu kapatıldı.
  Rastgele şifre yolu + CRLF .env → satır sonları korundu, üretilen şifreyle giriş 200.
- Yeniden başlatma sonrası: eski oturum çerezi → 401 + şifre sorusu; eski kimlik → 401 + şifre sorusu; yeni kullanıcı + eski şifre → 401;
  yeni kimlik → 200 (ilk doğrulama ~0,5 sn), sonra çerezle 200; sayfa kaynağında şifre/özet/base64 → 0 eşleşme; logda şifre yok.
- Özet + düz metin birlikte → düz metin yok sayıldı (401), açılışta uyarı. Bozuk özet → giriş kapalı + ⛔ uyarısı.
- 10 farklı hatalı deneme → doğru şifre de 429 (Retry-After); açık yönetici oturumu 200; normal sayfalar 200.
- Yönetici kimliğiyle öğrenci paneli / takip detay → 200; eski kimlikle → normal ziyaretçi (giriş sayfası).
- Sıralama (49 kayıtlı 8. sınıf, 41'i barajı geçmiş; 6 öğretmen/veli hesabı): barajı geçenler #1/49 … #41/49, geçmeyenler —/49;
  il/ilçe/okul/sınıf paydaları kapsamdaki öğrenci sayısı; ders kartları da —/49; sıra > payda hatası 0; canlı hesaplama cron ile aynı sonuç.

## Değişen dosyalar
- services/adminYetki.js, server.js, cronJobs.js, routes/panel.js, .gitignore, package.json (4.17.22)
- tools/admin-sifre.js (yeni)
- docs/surum-notlari/SURUM-NOTU-v4.17.22.md (yeni)
