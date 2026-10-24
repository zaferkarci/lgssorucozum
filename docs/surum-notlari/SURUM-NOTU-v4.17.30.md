# Sürüm Notu — v4.17.30

**Tarih:** 25 Ekim 2026
**Tür:** Günün ilk güncellemesi (tam paket, package.json 4.17.30)

## Görsel büyütme: görünür uyarı, güvenli şık düğmesi, kapatma

### 1) Soru görsellerinde "🔍 Büyüt" etiketi
- Öncül görsellerinin ve soru resminin sağ alt köşesinde her cihazda görünen "🔍 Büyüt" etiketi var.
- Görsele ya da etikete dokunmak görseli büyütür (eskiden yalnız bilgisayarda imleç büyütece dönüyordu; telefonda hiçbir ipucu yoktu).
- Geçerli yerler: soru çözme ekranı, öğretmen/kurum yöneticisi örnek soru ekranı, "Soruyu Gör" penceresi.

### 2) Şık görsellerinde büyük "🔍 Büyüt" düğmesi
- Eski 11 piksellik "🔍 büyüt" yazısı yerine görselin sağ üst köşesinde parmakla rahat dokunulacak mavi bir düğme var.
- Düğmeye dokunmak yalnız büyütür, cevap göndermez. Görselin kendisine dokunmak eskisi gibi şıkkı işaretler.
- Metin + görsel olan şıklarda görsel metnin altında kendi satırına iner. Eskiden görsel şıkkın dışına taşıyordu ve büyütme yazısı görünmüyordu.

### 3) Büyütülmüş görseli kapatma
- Sağ üstte "✕ Kapat" düğmesi.
- Altta "Kapatmak için herhangi bir yere dokunun" (bilgisayarda "...tıklayın veya Esc tuşuna basın") yazısı.
- Esc tuşu ile kapanır. Admin panelindeki önizleme penceresi de aynı şekilde çalışır.

### 4) Hata düzeltmesi: soru resmi çözüm ekranında görünmüyordu
- Öğrencinin soru çözdüğü ekran sorunun ana görselini (`soruResmi`, Görselli PDF Yükle'nin "Soru Resmi" alanı) göstermiyordu;
  yalnız öncül ve şık görselleri görünüyordu. Artık soru metninin altında gösteriliyor (öğretmen örnek ekranındakiyle aynı yer).
- "[GÖRSEL VAR]" gibi adres olmayan değerler gösterilmez.

## Değişen dosyalar
- `public/js/gorsel-buyut.js` — yeni (etiket/düğme stilleri, Kapat düğmesi, ipucu yazısı, Esc)
- `views/panel.ejs` — soru ve şık görselleri, "Soruyu Gör" penceresi, çözüm ekranına soru resmi, betik bağlantısı
- `views/admin.ejs` — betik bağlantısı (önizleme penceresine Kapat ve Esc)
- `package.json` — 4.17.30
- `docs/surum-notlari/SURUM-NOTU-v4.17.30.md` — bu not

## Test (demo; bilgisayar 1366 px ve telefon 390 px)
- Soru resmi çözüm ekranında görünüyor; 5 etiket/düğme (öncül, soru resmi, 3 şık) çiziliyor.
- Etikete tıklayınca büyütme açılıyor; Esc ve "✕ Kapat" ile, telefonda dokununca kapanıyor.
- Şık düğmesine tıklamak/dokunmak cevap göndermiyor (aynı soru ekranda kalıyor); görsele tıklamak cevap gönderiyor.
- Metin + görsel şıkta taşma: önce 1 şık taşıyordu, şimdi 0.
- "Soruyu Gör" penceresinde etiketler görünüyor; admin panelinde Kapat düğmesi ve Esc çalışıyor, sayfa hatası yok.
- Veritabanı değişmedi.
