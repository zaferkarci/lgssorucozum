# Sürüm Notu — v4.17.32

**Tarih:** 28 Ekim 2026
**Tür:** Günün ilk güncellemesi (package.json 4.17.32). v4.17.31 GitHub'a gönderilmediği için onun dosyaları da bu güncellemede.

## Hatalı soru bildirimlerine panelden cevap

### Sorun
- Öğretmen/veli takip sayfasındaki **"⚠️ Hatalı"** düğmesi ve **"Bize Ulaşın"** formu, kişi giriş yapmış olsa bile mesajı
  **hesaba bağlamadan** kaydediyordu. Bu mesajlara yazılan cevap kullanıcıya ulaşmıyor, yalnız yöneticide kalıyordu.
- (Soru çözme ekranındaki "Hatalı soru bildir" düğmesi zaten hesaba bağlı kaydediyordu; demoda tekrar denendi.)

### Düzeltme
- Giriş yapmış kullanıcı formdan yazarsa mesaj **hesabına bağlanır**. Yönetici cevabı kullanıcının panelindeki
  **✉️ Mesajlar** bölümüne gider (üst menüde kırmızı rozetle haber verilir).
- Formdan gelen hatalı soru bildirimleri de "⚠️ Hatalı soru" rozeti, soru bilgisi (ders / konu / no) ve soru bağlantısıyla kaydedilir.
- Giriş yapmış kullanıcı için e-posta zorunlu değil (hesaptaki e-posta kullanılır).
- Gönderim sonrası sayfada "Cevabımızı panelinizdeki Mesajlar bölümünden okuyabilirsiniz" yazısı ve **Mesajlarıma Git** düğmesi.

### Bize Ulaşın: önce giriş önerisi
- Giriş yapmamış ziyaretçi formu açınca önce bir seçim ekranı görür:
  **🔑 Giriş Yap** (önerilen; cevap panele gelir) veya **Giriş yapmadan devam et** (üye olmayanlar; dönüş e-posta ile).
- Hatalı soru bilgileri (sınıf/ders/konu/no) "devam et" sonrasında da korunur.

### Yönetici paneli (Mesajlar)
- Cevap kutusu cevabın nereye gideceğini söyler:
  - Hesaba bağlı mesaj: "@kullanıcı panelindeki Mesajlar bölümünde görür" — düğme **Cevap Gönder**.
  - Girişsiz mesaj: "cevabın kullanıcıya ulaşmaz, yalnızca sende not olarak kalır" — düğme **Not Yaz**,
    altında dönüş için e-posta (tıklanabilir) ve telefon.
- Giriş yapılmış iletişim formu mesajlarında "📬 İletişim formu (giriş yapılmış)" rozeti ve @kullanıcı adı.

## Değişen dosyalar
- `routes/admin.js` — /iletisim-gonder: oturum varsa hesaba bağlama, hatalı soru bilgisi, sonuç sayfası
- `routes/auth.js` — /iletisim: giriş durumu ve "devam et" bağlantısı
- `views/iletisim.ejs` — giriş önerisi ekranı, giriş yapılmış bilgi kutusu
- `views/admin.ejs` — Mesajlar: cevap kutusu yazıları, girişsiz mesajda dönüş bilgisi, rozet
- `package.json` — 4.17.32
- `docs/surum-notlari/SURUM-NOTU-v4.17.32.md` — bu not
- (v4.17.31'den) `scripts/cevap-duzelt.js`, `docs/surum-notlari/SURUM-NOTU-v4.17.31.md`

## Test (demo)
- Misafir: seçim ekranı → "Giriş yapmadan devam et" → hatalı soru formu (bilgiler korunmuş) → gönderildi; kayıt hesapsız, e-postalı, soru bağlantılı.
- Öğrenci: çözme ekranında "Hatalı soru bildir" → kayıt @öğrenci ile.
- Öğretmen (giriş yapmış): takip sayfası bağlantısıyla aynı form → kayıt @öğretmen ile; yönetici cevabı öğretmenin Mesajlar bölümünde göründü.
- Veritabanı yapısı değişmedi.
