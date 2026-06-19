# v4.16.17 — Zorluk Raporu: 6 kademeli client-side cascade filtre (TAM PROJE)

Çalışan TÜM proje. v4.16.16 üzerine kuruludur. "Yol 2" rollout 4. adım:
Zorluk Raporu (zorlukRapor) filtresi, Sorular ekranıyla BİREBİR aynı şekilde
client-side otomatik cascade'e çevrildi + Öğrenme Çıktısı/Süreç Bileşeni eklendi.

## Bu sürümde yapılanlar — views/admin.ejs
- Zorluk Raporu filtre satırı artık 6 kademe: Sınıf · Ders · Ünite · Konu ·
  Öğrenme Çıktısı · Süreç Bileşeni. Seçenekler /api/unite-bilgi'den client-side
  dolar; üst seçilince alttakiler SAYFA YENİLEMEDEN gelir.
- onchange="this.form.submit()" kaldırıldı; "Filtrele" butonu eklendi. Filtre GET
  ile uygulanır, dönünce seçimler geri yüklenir (zr_ id'li script).
- Aktif-filtre göstergesi ve "Filtreyi Temizle" çıktı/süreç dahil güncellendi.

## Sunucu tarafı
- DEĞİŞİKLİK GEREKMEDİ: Zorluk Raporu paylaşılan tumSorular'ı kullanıyor;
  filCikti/filSurec filtresi v4.16.15'te soruFiltre'ye eklendiği için bu sayfada
  da otomatik olarak çalışıyor.

## %100 korunan
- Sorular ekranının filtresi (fl_) aynen duruyor.
- Zorluk özet kartları, sıralanabilir tablo, hesaplama mantığı — AYNEN.
- Kullanıcı/okul filtrelerindeki this.form.submit() davranışı korundu.
- konular şeması ve tüketicileri, mevcut veri, satır sonları (CRLF), ilgisiz kod.

## SONRAKİ ADIMLAR
- PDF Yükle, Görselli PDF Yükle (serbest metin → dropdown), Soru Dağılımı,
  istenirse Konu İzinleri.

## Değişen dosyalar
- views/admin.ejs (zorlukRapor filtre formu → client-side cascade + 2 alan + script
  + aktif-filtre göstergesi)
- package.json (4.16.16 -> 4.16.17)

## Test
- admin.ejs ejs.compile ile derlendi. node --check admin.js geçti.
- this.form.submit(): 8 → 4 (yalnız zorlukRapor'un 4'ü kaldırıldı).
- Sorular (fl_) ve Zorluk (zr_) formları yan yana sağlam. CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.17: Zorluk Raporu 6 kademeli client-side cascade filtre"
git push
git tag v4.16.17
git push origin v4.16.17
```
