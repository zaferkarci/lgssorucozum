# v4.17.23-1 — Yönetici görünümünde başka kullanıcının verisi görünmesi düzeltildi

> Ara güncelleme (package.json değişmedi: 4.17.23). Yalnız 2 dosya.

## Belirti
Admin > bir velinin paneli (ADMİN GÖRÜNÜMÜ): "0 çocuk takip ediliyor" yazarken "Bugünün Aktivitesi" kartında, o velinin
olmayan öğrenciler ("… çocuk sisteme girdi") görünüyordu; iki farklı velide aynı öğrenciler çıkıyordu.

## Neden
- **Gerçek veliler/öğretmenler etkilenmiyordu.** Kart yalnız giriş yapmış kişinin kendi takip ettiklerini getirir; hiçbir kullanıcı
  başkasının çocuğunu görmedi (denemede: 0 çocuklu veli → 0 kart, parametre ile başkasını istese bile kendi verisi).
- Sorun yalnız **yönetici görünümündeydi**: yönetici aynı tarayıcıda kendi kullanıcı hesabıyla (ör. öğretmen) da girişliyse, kart
  baktığı kişinin değil **oturumdaki kendi hesabının** takip ettiği öğrencileri gösteriyordu (kendi öğrencileriniz).
- Aynı hata takip uçlarında daha ciddi sonuç doğuruyordu: yönetici görünümünde "İstek gönder / Kabul / Yanıtla" gibi işlemler
  baktığınız kullanıcı adına değil, **oturumdaki hesap adına** yapılıyordu (denemede eski kod, veli_x paneli için gönderilen isteği
  oturumdaki öğretmen hesabı adına işledi).

## Düzeltme — routes/takip.js, views/panel.ejs
- `hedefKullaniciCoz`: yönetici görünümünde (adminGirisli) `?kullanici` / `body.kullanici` **önce** gelir; yoksa oturumdaki kullanıcı.
  Normal kullanıcıda parametre her zaman yok sayılır (kimse başkasının verisini göremez/işleyemez) — davranış aynı.
- `GET /takip/aktivite-bugun`: yönetici görünümüne duyarlı hale getirildi (`oturumVeyaAdmin` + `hedefKullaniciCoz`). Yalnız yönetici
  girişi olan (kullanıcı oturumu olmayan) yönetici de kartı görür.
- views/panel.ejs: veli paneli ve takip sekmesindeki iki aktivite çağrısı `?kullanici=<görüntülenen kullanıcı>` gönderir.

## Test (yerel demo)
- Yönetici + kendi öğretmen oturumu açıkken: 0 çocuklu veli → "0 çocuk sisteme girdi… Henüz aktif öğrenci yok" (önce 8 öğrencinin
  2 aktifi görünüyordu); veli_deniz → yalnız deniz.yilmaz; öğretmen takip sekmesi → kendi 8 öğrencisi.
- Gerçek veli kendi oturumunda: kendi çocuğu; başka kullanıcı adı parametresi verse de yok sayıldı (0 / kendi). Oturumsuz → reddedildi.
- Yönetici görünümünde "İstek gönder": veli_x adına yazıldı, oturumdaki öğretmen adına değil. Kabul edilenler listesi görüntülenen kullanıcıya ait.
- Tarayıcıda (gerçek sayfa) üç panel kontrol edildi.

## Değişen dosyalar
- routes/takip.js, views/panel.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.23-1.md (yeni)
- package.json DEĞİŞMEDİ (4.17.23)
