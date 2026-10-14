# v4.17.23 — Yönetici kullanıcıya yeni şifre belirleyebilir (iki kez girilip onaylanır)

> Tam paket. v4.17.22'nin tüm değişikliklerini içerir.

## Yeni Şifre Belirle kartı — views/admin-kullanici-detay.ejs, routes/admin.js
- Admin > Kullanıcılar > kullanıcı detay: **Kullanıcı Adını Değiştir** kartının hemen altında **Yeni Şifre Belirle** kartı.
- Şifre **iki alana** yazılır. Altta canlı durum: "✓ Şifreler aynı" / "✗ Şifreler aynı değil". Aynı değilse form gönderilmez.
  "Şifreyi göster" kutusu iki alanı birlikte açar. Kaydetmeden önce onay sorulur.
- `POST /admin/kullanici-sifre-belirle` (yalnız yönetici; çerezsiz/yetkisiz istek 401). Sunucu da aynı kuralları denetler:
  en az 6, en fazla 72 karakter; iki şifre birebir aynı; kullanıcı var.
- Şifre **bcrypt** ile saklanır; log'a, yanıta, sayfaya yazılmaz (logda yalnız "kullanıcı X için yeni şifre belirlendi" satırı).
- Kaydedince:
  - Kullanıcının **açık oturumları kapanır** (eski şifreyle girmiş biri düşer; kullanıcı adında nokta olsa da).
  - Bekleyen **şifre sıfırlama bağlantıları iptal** olur.
  - Aile kartıyla açılmış hesapta "ilk girişte kendi şifreni belirle" zorunluluğu kalkar (kullanıcı doğrudan girer).
- Kullanıcıya yeni şifreyi siz iletirsiniz; kullanıcı isterse profilinden kendi şifresini değiştirebilir.

## Test (yerel demo)
- Kart "Kullanıcı Adını Değiştir"in hemen altında; alanlar yeniSifre / yeniSifreTekrar.
- Tarayıcıda: farklı iki şifre → "✗ Şifreler aynı değil", gönderim engellendi; aynı iki şifre → "✓ Şifreler aynı"; "göster" → iki alan da metin; kaydet → onay penceresi.
- Sunucu tarafı: eşleşmeyen → reddedildi; 3 karakter → reddedildi; olmayan kullanıcı → reddedildi; reddedilenlerde eski şifre geçerli kaldı;
  çerezsiz istek → 401 ve şifre değişmedi.
- Başarılı: ada_10 → eski şifre artık girmiyor, yeni şifre giriyor; 5 açık oturum kapandı (eski çerez girişe döndü);
  2 sıfırlama bağlantısı silindi; "ilk girişte şifre belirle" bayrağı kalktı; veritabanında bcrypt özeti (düz metin yok); logda şifre yok.
- Kullanıcı adında nokta (deniz.yilmaz): 3 oturum kapandı, yeni şifre giriyor.

## Değişen dosyalar
- routes/admin.js, views/admin-kullanici-detay.ejs, package.json (4.17.23)
- docs/surum-notlari/SURUM-NOTU-v4.17.23.md (yeni)
