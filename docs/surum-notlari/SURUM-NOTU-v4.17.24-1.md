# v4.17.24-1 — Yönetici "Manuel kullanıcı ekle" (6 haneli geçici şifre, ilk girişte zorunlu şifre değişimi)

> Ara güncelleme, **kümülatif** (v4.17.23 tam paketinin üstüne tek seferde yüklenir). İçerdikleri:
> v4.17.23-1 (yönetici görünümü düzeltmesi) + v4.17.24 (yanlış cevap kırmızı) + bu sürümün yeni özelliği.
> `package.json` **4.17.24** olarak pakette vardır (v4.17.24 henüz yüklenmemişti).

## 1) Manuel kullanıcı ekleme — views/admin.ejs, routes/admin.js, services/manuelKullanici.js (yeni), views/admin-kullanici-eklendi.ejs (yeni)
- **Admin > Kullanıcılar** sekmesinin en üstünde **"➕ Manuel kullanıcı ekle"** kartı (kapalı gelir, tıklayınca açılır).
- Alanlar: kullanıcı adı, rol (Öğrenci / Öğretmen / Veli / Kurumsal), sınıf + şube (yalnız öğrenci), e-posta (opsiyonel),
  il / ilçe / okul (opsiyonel; **Kurumsal için zorunlu**). İl/ilçe listesi kayıt sayfasıyla aynı kaynaktan, okul listesi
  `/api/okullar`'dan gelir; il listesi kart ilk açılınca yüklenir (liste yüklenemezse konum boş bırakılabilir).
- Kullanıcı adı kuralları **kayıt sayfasıyla aynı**: 4-20 karakter, yalnız harf/rakam/`_`/`.`, yalnız rakamdan oluşamaz, yasak kelime
  listesi + yönetici yasaklı kelimeleri. Ek olarak: büyük/küçük harf farkıyla aynı ad, başka kullanıcının **eski adı** ve silinmiş
  bir kullanıcıdan kalan eski kayıtlar (cevap, takip, oyun…) varsa reddedilir (eski veri yeni hesaba karışmasın).
- Yan etkiler `/kayit-yap` ile aynıdır: Kurumsal → Kurum kaydı + o okuldaki öğrenci/öğretmenler için "kuruma katılma isteği";
  Öğretmen/Öğrenci → okulu kayıtlı bir Kurum'sa katılma isteği; Veli ve Kurumsal → 2 adet öğrenci davet kodu.
- E-posta küçük harfe çevrilerek saklanır (şifremi-unuttum e-postayı küçük harfle arar).
- Çift tıklamaya karşı düğme ilk tıkta pasifleşir (ikinci istek "ad alınmış" hatasıyla şifre ekranını ezmesin).

## 2) İlk şifre: sistem üretir, 6 hane, bir kez gösterilir
- Şifre **sistem tarafından, kullanıcı başına rastgele** üretilir (`crypto.randomInt`, 100000-999999; başında 0 yok;
  111111 / 123456 / 654321 / 121212 / 123123 gibi kolay kalıplar elenir).
- Hesap oluşunca **tek seferlik sonuç sayfası** açılır: kullanıcı adı, rol, **geçici şifre**, "Giriş bilgilerini kopyala" düğmesi
  (adres + kullanıcı adı + şifre + açıklama). Sayfa `no-store`'dur; yenileyince / geri dönünce şifre bir daha görünmez.
- Şifre **hiçbir yerde açık saklanmaz**: veritabanında yalnız bcrypt özeti, logda yalnız "ilk şifre yöneticiye bir kez gösterildi"
  satırı (şifre yok), URL'de yok (POST + doğrudan yanıt), oturum kaydında yok.
- Hesap `sifreDegistirmeli: true` ile açılır → kullanıcı ilk girişte **"Kendi Şifreni Belirle"** ekranına yönlendirilir; şifresini
  belirleyene kadar başka sayfa açamaz (aile kartıyla aynı mekanizma). Yeni şifre **geçici şifreden farklı** ve en az 6 karakter olmalı.
  Sonra geçici şifre geçersizdir.
- `/sifre-belirle` metni hesabın nasıl açıldığına göre değişir: aile kartı → eski metin ("ortak ilk şifre"); yönetici → "yönetici
  tarafından sana verilen geçici bir şifreyle açıldı". (routes/auth.js, views/sifre-belirle.ejs)
- Şifre kaybolursa: kullanıcı detay sayfasındaki **"Yeni Şifre Belirle"** (v4.17.23) ile yeni şifre verilir.

## 3) Giriş deneme sınırı — services/girisSiniri.js (yeni), routes/auth.js
- 6 haneli rakam şifrenin 900.000 olasılığı vardır; giriş formunda hiç sınır yoktu. Artık **aynı IP + aynı kullanıcı adı** için
  15 dakikada 8 hatalı denemeden sonra o ikili için **15 dakika giriş kapanır** (429, doğru şifre de o sürede kabul edilmez).
- Başka IP'den giren gerçek kullanıcı etkilenmez. Var olmayan kullanıcı adı da sayılır (hangi hesabın var olduğu sızmaz).
  Başarılı girişte sayaç silinir. Sayaçlar bellektedir (uygulama yeniden başlayınca sıfırlanır).
- Gerçek IP, yönetici deneme sınırındaki gibi, nginx arkasında `X-Forwarded-For`'un son elemanından alınır.

## 4) v4.17.24 ve v4.17.23-1 (pakette, değişmedi)
- v4.17.24: öğretmen "Soruyu Gör" penceresinde öğrencinin yanlış cevabı kırmızı, doğru şık yeşil (yalnız bu sürümden sonra çözülen
  cevaplarda; eski kayıtlarda seçilen şık bilinmez). Ayrıntı: SURUM-NOTU-v4.17.24.md
- v4.17.23-1: yönetici görünümünde başka kullanıcının aktivite/takip verisinin görünmesi düzeltmesi. Ayrıntı: SURUM-NOTU-v4.17.23-1.md

## Test (yerel demo)
- Yetkisiz / yanlış yönetici şifresiyle ekleme isteği → 401. Öğrenci, öğretmen, veli, kurumsal oluşturuldu; alanlar (rolListesi,
  aktifRol, sınıf/şube, veli sınıfı boş, e-posta küçük harf) doğru; Kurum, katılma istekleri, veli/kurumsal davet kodları oluştu.
- Reddedilenler: aynı ad, büyük/küçük harf varyantı, kısa ad, yalnız rakam, boşluklu, HTML içeren, yasaklı kelime, geçersiz rol,
  sınıfsız/99 sınıflı öğrenci, 2 harfli şube (önceden sessizce kısalıyordu; düzeltildi), bozuk e-posta, okulsuz kurumsal, `kullaniciAdi[$ne]`.
- Geçici şifreyle giriş → `/sifre-belirle`; `/panel`, `/`, `POST /cevap` engellendi (yönlendirme / 403). Aynı şifre, kısa şifre,
  uyuşmayan şifre reddedildi; geçerli şifre → panel; bayrak kalktı; eski geçici şifre "Hata!", yeni şifre giriş yaptı.
- 50.000 üretimde hepsi 6 haneli, ilk hane 1-9 (düzgün dağılım), kolay kalıp 0. Şifre sunucu logunda, `sessions` ve kullanıcı
  kaydında (açık 6 haneli alan) bulunmadı.
- Giriş sınırı: 8 yanlıştan sonra doğru şifre 429; başka IP'den aynı kullanıcı girdi; başarılı girişten sonra sayaç sıfırlandı;
  var olmayan kullanıcı adı da aynı mesajı aldı; diğer kullanıcılar etkilenmedi.
- Aile kartı akışı aynı: "aynı ilk şifreyle açıldı" metni ve "ilk (ortak) şifreden farklı olmalı" hatası değişmedi.
- Tarayıcıda: kart kapalı gelir, il servisi sayfa açılışında çağrılmaz; rol değişince sınıf/şube gizlenir/gösterilir, kurumsalda
  il-ilçe-okul zorunlu olur; çift tıklamada tek hesap, tek sonuç sayfası; "kopyala" çalıştı; geri tuşuyla şifre sayfası tekrar gelmedi;
  il servisi ulaşılamazken uyarı çıktı ve konumsuz hesap yine oluşturuldu. Diğer yönetici sayfaları ve EJS derlemesi sorunsuz.

## Sınırlar / bilinmesi gerekenler
- Forma Moderatör ve Demo rolleri konmadı (kayıt kodu akışı gerektiriyor). Gerekirse eklenir.
- Manuel açılan **veli** hesabı, çocuğunu otomatik takip etmez; takip ilişkisi her zamanki yollarla (davet kodu / onay) kurulur.
- Sayaçlar bellekte olduğu için `pm2 restart` deneme sayaçlarını sıfırlar. Çok sayıda farklı IP'den dağıtık deneme için ek
  koruma yoktur; kullanıcılar ilk girişte şifrelerini hemen değiştirdiği için açık pencere kısadır.

## Değişen dosyalar (v4.17.23 tam paketine göre)
- Yeni: services/manuelKullanici.js, services/girisSiniri.js, views/admin-kullanici-eklendi.ejs
- Değişen: routes/admin.js, routes/auth.js, views/admin.ejs, views/sifre-belirle.ejs
- v4.17.24'ten: models/CevapKaydi.js, routes/panel.js, views/takip-ogrenci-detay.ejs, package.json (4.17.24)
- v4.17.23-1'den: routes/takip.js, views/panel.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.23-1.md, SURUM-NOTU-v4.17.24.md, SURUM-NOTU-v4.17.24-1.md
