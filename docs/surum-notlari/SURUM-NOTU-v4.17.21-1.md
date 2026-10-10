# v4.17.21-1 — Aile kartı, ilk girişte kendi şifresi, yeni şifremi unuttum, yönetici kullanıcı adı değiştirme

## 1) Yönetici kullanıcı adı değiştirme — services/kullaniciAdiDegistir.js (yeni), routes/admin.js, views/admin-kullanici-detay.ejs
- Admin > Kullanıcılar > kullanıcı detay: **Kullanıcı Adını Değiştir** kartı (`POST /admin/kullanici-adi-degistir`).
- Ad, kullanıcının kayıtlı olduğu **tüm koleksiyonlarda** birlikte değişir: CevapKaydi, TakipIliski (iki taraf),
  Mesaj (+adSoyad), ReferansKodu (olusturan/kullanan/oncekiOlusturan/aileVeli), OyunOyuncu, OyunHucre,
  DuelloKayit (3 alan), TamOgrenme, KurumUyelikIstek, Kurum, PasswordReset, Duyuru.hedefKullanicilar,
  KurumSinif.atananOgretmenler. Puan, takip, mesaj, oyun toprağı kopmaz.
- Kurallar kayıtla aynı (`kullaniciAdiKontrol` + yasaklı kelime). Ad başkasında ya da büyük/küçük harf farkıyla
  varsa, ya da o ada ait eski kayıtlar varsa reddedilir.
- Kullanıcının açık oturumları kapatılır. Eski ad `Kullanici.eskiAdlar`'a eklenir: **eski adla + doğru şifreyle**
  giriş yapılırsa sisteme alınır ve "Kullanıcı adın X olarak değiştirildi" uyarısı çıkar (yanlış şifrede normal hata).
- İşlem yarıda kalırsa aynı eski→yeni ile tekrar çalıştırmak kalan koleksiyonları tamamlar.

## 2) Aile kartı (tek karekod → veli + öğrenci) — routes/auth.js, routes/admin.js, views/kayit.ejs, views/admin.ejs
- Yeni kod tipi **aile**. Kart çıktısında "👨‍👩‍👧 Aile (veli + öğrenci tek kart)" seçeneği; kartta
  "Tek kodla veli + öğrenci hesabı" yazar. Eski kart tipleri aynen çalışır.
- Karekod açılınca tek form: öğrenci kullanıcı adı, sınıf/şube, il/ilçe/okul; veli kullanıcı adı ve **e-postası
  (zorunlu)**; **ortak ilk şifre**. `POST /kayit-aile`:
  - Kod atomik sahiplenilir (aynı kart iki kez kullanılamaz); hata olursa iki hesap ve takip geri alınır, kart serbest kalır.
  - Veli → öğrenci takibi `kabul`, `kaynak:'aile'`, öğrenci onaylı (`ogrenciOnayTarih`) — veli taramasında güvenli.
  - Okul kurum ise öğrenci için otomatik katılma isteği (normal kayıtla aynı).
  - İki hesap `sifreDegistirmeli:true`, `aileKodu` ile işaretlenir.
- Aile kodu eski `/kayit-yap` formuyla kullanılamaz (aile formuna yönlendirir).

## 3) İlk girişte kendi şifresi (zorunlu) — server.js, routes/auth.js, views/sifre-belirle.ejs (yeni)
- `sifreDegistirmeli` hesap giriş yapınca `/sifre-belirle`'ye gider; şifresini belirleyene kadar yalnız bu sayfa
  ve çıkış açık (diğer sayfalar yönlenir, POST/API 403). Yeni şifre ≥6 karakter ve ortak ilk şifreden farklı olmalı.
- Profil > Güvenlik'ten şifre değiştirme ve e-posta ile sıfırlama da bayrağı kaldırır.

## 4) Şifremi unuttum — routes/auth.js, mailGonder.js, views/sifremi-unuttum.ejs
- Form: **kullanıcı adı veya e-posta**.
- **Öğrenci** (kullanıcı adıyla): bağlantı **velinin e-postasına** gider (`ogrenciSifreSifirlamaMailiGonder`). Yalnız
  güvenilir veliler: aile kartıyla birlikte açılan veli ya da öğrencinin "evet, velim" dediği veli. Böyle veli yoksa
  öğrencinin kendi e-postası; o da yoksa gönderilmez (logda not).
- **Veli / öğretmen / diğer**: kendi e-postasına. E-posta girilirse o adrese kayıtlı hesap(lar)a.
- Yanıt her durumda aynı (hangi hesabın var olduğu sızmaz). Aynı hesap+adres için 2 dakikada bir bağlantı.
- Sıfırlama tamamlanınca o hesaba ait **tüm** bağlantılar geçersizleşir (iki veliye gittiyse ikincisi çalışmaz).

## Test (yerel demo)
- Aile kartı basıldı → form → mert.kaya + ayse.kaya açıldı; takip kabul/aile/onaylı; kod kullanıldı; aynı kart tekrar → "Geçersiz veya kullanılmış aile kartı".
- İlk giriş → /sifre-belirle; panel → yönlendi; POST → 403; ortak şifreyi tekrar → reddedildi; yeni şifre → panel. Veli aynı akış; veli panelinde çocuk görünüyor.
- Şifremi unuttum: mert.kaya → ayse.kaya@…; ayse.kaya → kendi; deniz → onaylı velisinin e-postası; velisi olmayan öğrenciler → kendi e-postası; 2 dk içinde tekrar → yeni bağlantı yok; sıfırlama sonrası kalan bağlantı 0, bayrak kalktı.
- Ad değiştirme deniz → deniz.yilmaz: 45 cevap, 3 takip, 3 mesaj, oyun oyuncusu + 14 hücre, tam öğrenme, sıfırlama kaydı taşındı; eski adda 0 kayıt; eski oturum → girişe döndü; eski ad + doğru şifre → giriş + uyarı; yanlış şifre → hata; veli listesinde yeni ad. Var olan ad / kısa / boşluklu / büyük-küçük harf farkı → reddedildi.

## Değişen dosyalar
- routes/auth.js, routes/admin.js, routes/panel.js, server.js, mailGonder.js
- views/kayit.ejs, views/sifremi-unuttum.ejs, views/admin-kullanici-detay.ejs, views/admin.ejs
- models/Kullanici.js, models/ReferansKodu.js
- services/kullaniciAdiDegistir.js (yeni), views/sifre-belirle.ejs (yeni)
- package.json değişmedi (4.17.21 — ara güncelleme)
