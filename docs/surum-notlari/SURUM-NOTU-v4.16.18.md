# v4.16.18 — Üniteler: tam-genişlik manuel çıktı/süreç editörü + detaylı liste (TAM PROJE)

Çalışan TÜM proje. v4.16.17 üzerine kuruludur. Üniteler sayfasının manuel tarafı
yeni Maarif yapısını (konu → öğrenme çıktısı → süreç bileşeni) tam destekler.

## Bu sürümde yapılanlar

### Manuel Ünite Ekle — views/admin.ejs + /unite-ekle
- Konular textarea'sı yerine DİNAMİK editör: konu ekle/sil, her konuya öğrenme
  çıktısı ekle/sil, her çıktıya süreç bileşeni (a/b/c) ekle/sil.
- Editör, durumu gizli `konuYapisi` (JSON) alanına yazar.
- /unite-ekle: konuYapisi'ndan konular (adlar) + konuDetay (çıktı/süreç) üretir;
  öğrenme çıktısı metninden kod (MAT.6.1.1) otomatik çıkarılır. JSON yoksa eski
  konularMetin yolu AYNEN çalışır (geriye uyum).

### Kayıtlı Üniteler — views/admin.ejs + /unite-guncelle
- Dar tablo yerine TAM-GENİŞLİK kartlar. Her kartta ünite başlığı + konu/çıktı
  sayısı + her konunun altında öğrenme çıktıları ve a/b/c süreç bileşenleri
  TEK TEK (salt-okunur) görünür.
- Her ünitede DÜZENLE (aynı dinamik editörü kart içinde açar, mevcut çıktı/süreç
  dolu gelir) + SİL.
- /unite-guncelle: konuYapisi JSON'unu işler; yoksa eski konularMetin yolu +
  v4.16.16 konuDetay hizalaması (orphan düşürme) korunur.
- Güvenlik ağı: düzenleme formunda gizli konularMetin (mevcut konular) fallback —
  JS çalışmazsa veri kaybı olmaz.

## %100 korunan
- Excel yükleme/önizleme/kaydet yolu (konuDetay zaten uçtan uca kaydediyordu).
- konular şeması ve tüm tüketicileri (panel ağacı, istatistik, günlük hedef,
  konu izinleri, soru formları/filtreleri), mevcut ünite/soru verisi.
- Eski konularMetin gönderimi hâlâ çalışır (fallback). Satır sonları (CRLF).
- İlgisiz tüm kod.

## Değişen dosyalar
- views/admin.ejs (manuel form editörü + kayıtlı üniteler kartları + editör JS
  + _uniteBas + uniteDuzenleAc lazy-init)
- routes/admin.js (/unite-ekle + /unite-guncelle: konuYapisi işleme)
- package.json (4.16.17 -> 4.16.18)

## Test
- node --check admin.js geçti. admin.ejs ejs.compile ile derlendi.
- konuYapisi → konular/konuDetay dönüşümü simüle edildi (dedup, kod çıkarımı,
  süreç filtresi doğru).
- Kayıtlı üniteler tablo → kart dönüşümü doğrulandı. CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.18: Uniteler tam-genislik manuel cikti/surec editoru + detayli liste"
git push
git tag v4.16.18
git push origin v4.16.18
```
