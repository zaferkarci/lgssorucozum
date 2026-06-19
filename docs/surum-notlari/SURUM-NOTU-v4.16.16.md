# v4.16.16 — Ünite ve Konu Yönetimi sayfası: çıktı/süreç görünürlüğü + hizalama (TAM PROJE)

Çalışan TÜM proje. v4.16.15 üzerine kuruludur. "Yol 2" rollout 3. adım:
Üniteler (uniteler) sayfası yeni Maarif alanlarını gösterir ve manuel düzenleme
konuDetay'ı bozmaz.

## Bu sürümde yapılanlar

### Excel önizleme — views/admin.ejs
- Önizleme kartı artık her konunun altında ÖĞRENME ÇIKTILARINI listeler; her
  çıktının yanında "N süreç" rozeti gösterir (_konuDetayHtml helper).
- Özet satırına "öğrenme çıktısı" sayısı eklendi.
- Çıktısı olmayan konular eskisi gibi sade görünür.
- NOT: Excel yükleme→önizleme→kaydet zinciri zaten konuDetay'ı uçtan uca
  KAYDEDİYORDU (v4.16.14'ten beri); bu sürüm sadece GÖRÜNÜRLÜK ekledi.

### Kayıtlı üniteler tablosu — views/admin.ejs
- Yeni "Çıktı" sütunu: her ünitenin toplam öğrenme çıktısı sayısı.
- Düzenleme satırı colspan 7 → 8 (yeni sütunla uyumlu).

### Manuel güncelleme — routes/admin.js
- /unite-guncelle: konular değişince konuDetay konu adına göre HİZALANIR
  (kalan konuların çıktısı korunur, kaldırılan/yeniden adlandırılan konunun
  çıktısı orphan kalmaz). Test edildi.
- /unite-ekle: yeni ünite zaten konuDetay'sız (boş) oluşur — değişiklik gerekmedi.

## %100 korunan
- Manuel formlara çıktı/süreç GİRİŞİ eklenmedi (bilinçli; veri Excel'den gelir).
- konular şeması ve tüm tüketicileri, mevcut soru/ünite verisi, Excel kaydetme
  mantığı, satır sonları (CRLF), ilgisiz tüm kod.

## Değişen dosyalar
- views/admin.ejs (önizleme render + özet + tablo sütunu + colspan)
- routes/admin.js (/unite-guncelle konuDetay hizalama)
- package.json (4.16.15 -> 4.16.16)

## Test
- node --check admin.js geçti. admin.ejs ejs.compile ile derlendi.
- Tablo: başlık 8 sütun, düzenleme satırı colspan 8.
- Hizalama mantığı: orphan konuDetay düşüyor, kalan korunuyor (simüle edildi).

## Git
```bash
git add -A
git commit -m "v4.16.16: Uniteler sayfasi cikti/surec gorunurlugu + konuDetay hizalama"
git push
git tag v4.16.16
git push origin v4.16.16
```
