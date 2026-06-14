# v4.11.0 — Oyun öğrencilere açıldı + giriş duyurusu + kurallar (TAM PROJE)

Çalışan TÜM proje. v4.10.1 üzerine kuruludur.

## Özet
"Bilgi Gezegenleri" artık yalnız admin önizlemesi değil; TÜM öğrenciler (ogrenci +
demo) kendi sınıf dünyalarında oynayabilir. Girişte oyunun başladığını açılır
pencere bildirir; kurallar oyun menüsünden görülür.

## 1) Oyun öğrencilere açıldı
- routes/oyun.js, "tek admin oyuncusu" yerine OTURUM KULLANICISI modeline taşındı.
  Yeni `oyuncuCoz(req, sinif)`:
  - Admin -> ADMIN_OYUNCU (önizleme; herhangi sınıf, test altını, admin araçları).
  - Öğrenci/demo -> kendi kullanıcı adı + kendi sınıfı (Kullanici.sinif'ten 5-8);
    altın = puan - harcanan. Diğer roller oynayamaz.
- Oynama uçları (picker, dünya kabuğu, /veri, /minimap, /siralama, /baslangic,
  /hucre-al) artık oturum kullanıcısına bağlı. GET /oyun: öğrenciyi kendi sınıf
  dünyasına yönlendirir.
- Admin araçları (Test komşu, Sıfırla, Kilit düzenle, Türkiye taslağı, Kilitleri
  temizle) hem uçta (adminMi) hem arayüzde admin-only KALDI.
- Önemli: oyunda altın harcamak akademik puanı/sıralamayı DÜŞÜRMEZ (harcananAltin
  ayrı; puan değişmez).

## 2) Giriş duyurusu (açılır pencere)
- models/Kullanici.js: yeni `oyunDuyuruGoruldu` (Boolean) alanı.
- routes/panel.js: panele `oyunDuyuruGoster` bayrağı (ogrenci/demo ve henüz
  "bir daha gösterme" dememişse).
- views/panel.ejs: panelde açılır pencere — "Hemen Oyna" + "Bir daha gösterme".
  Tik işaretliyse POST /oyun-duyuru-goruldu ile kalıcı kapanır (bir daha çıkmaz);
  işaretli değilse sadece kapatır (sonraki girişte tekrar görünebilir).
- routes/oyun.js: POST /oyun-duyuru-goruldu (oturum kullanıcısı için bayrağı set eder).

## 3) Kurallar oyun menüsünde
- Oyun ekranı üst çubuğunda "Kurallar" düğmesi (herkes). Açılır modal: ekonomi,
  başlangıç, hücre alma + artan fiyat, kilitli alanlar, kuşatma=otomatik fetih,
  gezinme, sıralama (düello: yakında).
- Öğrenci panel menüsüne "🪐 Oyun" linki eklendi (ogrenci/demo).

## Değişen dosyalar (v4.10.1 tabanına göre)
- models/Kullanici.js  (oyunDuyuruGoruldu alanı)
- routes/oyun.js       (oyuncuCoz, oturum-bağlı uçlar, admin-only araçlar, kurallar, duyuru ucu)
- routes/panel.js      (oyunDuyuruGoster bayrağı)
- views/panel.ejs      (oyun linki + giriş duyurusu açılır penceresi)
- package.json         (4.10.1 -> 4.11.0)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). server.js değişmedi (oyun zaten
kök '/' altında mount; modeller require ile kaydolur).

## Test
- routes/oyun.js + routes/panel.js + models/Kullanici.js node --check geçti;
  inline istemci JS node --check geçti; panel.ejs ejs.compile geçti; EOL korundu
  (CRLF, stray LF: 0).
- Render testleri: ADMIN -> Test komşu/Kilit düzenle/dünya değiştir görünür;
  ÖĞRENCI -> bu araçlar YOK, "panelim" linki var, ADMIN(=ben işaretçisi)=kendi adı,
  Kurallar düğmesi + kuşatma metni var, başlangıç düğmesi var.
- Kullanici/router bağlantısı doğrulandı (oyun.js Kullanici require eder; router '/').

## Git
```bash
git add -A
git commit -m "v4.11.0: oyunu ogrencilere ac - oturum-bagli oyuncu, giris duyurusu, oyun menusunde kurallar"
git push
git tag v4.11.0
git push origin v4.11.0
```
