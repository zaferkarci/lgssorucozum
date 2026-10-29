# Sürüm Notu — v4.17.33

**Tarih:** 29 Ekim 2026
**Tür:** Günün ilk güncellemesi (tam paket, package.json 4.17.33)

## Soru görselleri: karanlık mod, büyük dosyalar, yüklenirken boş alan

Şikâyet: 677 ve 625 numaralı sorularda görsel görünmüyor.
- **677:** yüksek çözünürlüklü (hd_) görsel, 2048×761 px, **2,38 MB**. v4.17.28'den beri bu görseller inene kadar
  gizleniyordu; telefonda yavaş internette uzun süre boş alan kalıyordu.
- **625:** 206×211 px, 31 KB, **saydam PNG**. Telefonun karanlık modu sayfa zeminini koyulaştırınca siyah çizgiler
  koyu zeminde kayboluyor. Demoda zorunlu karanlık modla aynı durum oluşturuldu; CSS ile verilen beyaz zemin de
  koyulaştırıldığı için tek güvenilir çözüm görselin kendisinin opak (beyaz zeminli) gelmesi.

### Yapılanlar
1. **Beyaz zemin (tüm soru görselleri):** Cloudinary adresine `b_white,c_pad,w_1.0` eklenir → saydam alanlar beyaz
   doldurulur, boyut aynı kalır. Ayrıca sayfada Cloudinary görsellerinin arkasına beyaz zemin (CSS) konur.
2. **Sıkıştırma (hd_ görseller):** adrese ayrıca `f_auto,q_auto` → tarayıcı destekliyorsa WebP, otomatik kalite.
   Piksel sayısı aynı kalır; ekran boyutu yine dosya adındaki yoğunluktan hesaplanır.
3. **Yüklenirken gizleme kaldırıldı:** görseller yüklendikçe görünür, inince bir kez eski boyutuna ayarlanır.
4. **Bundan sonra yüklenenler** (Görselli PDF Yükle) doğrudan bu ayarlı adresle kaydedilir.
5. **Mevcut görseller için tek seferlik komut:** `scripts/gorsel-duzenle.js`.

Dosyaların kendisi değişmez; yalnız adres değişir. Geri almak gerekirse adresteki
`b_white,c_pad,w_1.0[,f_auto,q_auto]/` parçasını silmek yeterli.

### Mevcut görselleri düzenleme
```
su - elcezeri -c "cd ~/lgssorucozum && node scripts/gorsel-duzenle.js --soru=677,625"   # önce iki soru, yalnız ölçer
su - elcezeri -c "cd ~/lgssorucozum && node scripts/gorsel-duzenle.js"                  # tümü, yalnız ölçer
su - elcezeri -c "cd ~/lgssorucozum && node scripts/gorsel-duzenle.js --uygula"         # uygular
```
- Her görsel için eski ve yeni adres Cloudinary'den istenir; durum, boyut, biçim, piksel ölçüsü, saydamlık yazılır.
- Yalnız yeni adres **açılıyorsa**, piksel ölçüsü **aynıysa** ve **saydamlık kalmadıysa** uygulanır; diğerleri atlanır ve listelenir.
- Özet satırında toplam boyutun ne kadar küçüldüğü yazar.
- Komut iki kez çalıştırılırsa ikincisinde "Duzenlenecek adres yok" der.
- Yeni adresler ilk istekte Cloudinary'de bir kez üretilir (dönüşüm kotasından sayılır; ücretsiz planda yeterli).

## Değişen dosyalar
- `services/cloudinaryYukle.js` — `gorselAdresiDuzenle()` (beyaz zemin; hd_ için WebP/otomatik kalite)
- `routes/gorselliPdfYukle.js` — yüklenen görsel ayarlı adresle döner
- `public/js/hd-gorsel.js` — yüklenirken gizleme kaldırıldı; Cloudinary görsellerine beyaz zemin (CSS)
- `scripts/gorsel-duzenle.js` — yeni (mevcut adresleri ölçer / düzenler)
- `package.json` — 4.17.33
- `docs/surum-notlari/SURUM-NOTU-v4.17.33.md` — bu not

## Test (demo)
- Zorunlu karanlık mod (Chromium): saydam görsel önce kayboluyordu; beyaz zeminli görselle okunuyor. CSS zemini tek başına yetmedi.
- Yavaş yüklenen (4 sn geciktirilmiş) hd görsel yüklenirken görünür (visibility: visible), inince eski boyutuna ayarlandı.
- `gorsel-duzenle.js`: listeleme, uygulama ve ikinci çalıştırmada 0 adres; adresler doğru biçimde değişti.
  (Demo Cloudinary'ye ulaşamadığı için Cloudinary yanıtı taklit edildi; gerçek ölçüm sunucuda ilk komutla görülür.)
