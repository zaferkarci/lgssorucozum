# v4.16.19 — Üniteler: tablo geri + Öğrenme Çıktıları/Süreç Bileşenleri sütunları + tam genişlik

v4.16.18 üzerine düzeltme. Kullanıcı geri bildirimi: kayıtlı üniteler kartlara
çevrilince konuların görünüşü bozulmuştu; tablo isteniyordu.

## Yapılanlar — views/admin.ejs
- Kayıtlı Üniteler KARTLAR yerine yeniden TABLO. Sütunlar:
  Sınıf · Ünite No · Ders · Ünite Adı · Konu · ÖĞRENME ÇIKTILARI · SÜREÇ BİLEŞENLERİ · İşlem
- Her KONU kendi satırında; ünite bilgisi (Sınıf/Ünite No/Ders/Ünite Adı) ve
  İşlem hücreleri rowspan ile birleşik (Excel şablonu mantığı).
- Öğrenme Çıktıları ve Süreç Bileşenleri sütunları içeriğin TAMAMINI gösterir
  (her çıktı + a/b/c süreç maddeleri tek tek). Çıktısız konuda "—".
- DÜZENLE satırı (gizli, colspan 8): v4.16.18 dinamik editörü (konu→çıktı→süreç
  ekle/sil) korunur; hidden konularMetin fallback + konuYapisi JSON.
- SADECE Üniteler sayfası tam genişlik: uniteler bloğuna scoped
  `<style>.admin-main{max-width:none;}</style>`. Global style.css DEĞİŞMEDİ.

## %100 korunan
- Manuel Ekle dinamik editörü (öğrenme çıktısı/süreç giriş alanları) aynen.
- /unite-ekle, /unite-guncelle (konuYapisi işleme) aynen.
- public/style.css (.admin-main global kuralı) — değiştirilmedi.
- konular şeması ve tüketicileri, Excel yolu, mevcut veri, CRLF, ilgisiz kod.

## Değişen dosyalar
- views/admin.ejs (kayıtlı üniteler kart→tablo + çıktı/süreç sütunları +
  uniteler-scoped tam genişlik style)
- package.json (4.16.18 -> 4.16.19)

## Test
- admin.ejs ejs.compile ile derlendi.
- Tablo mock veriyle render edildi: rowspan birleşik, çıktı + a/b süreç görünür,
  çıktısız ünitede "—". Editör JS sözdizimi geçerli. CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.19: Uniteler tablo geri + cikti/surec sutunlari + tam genislik"
git push
git tag v4.16.19
git push origin v4.16.19
```
