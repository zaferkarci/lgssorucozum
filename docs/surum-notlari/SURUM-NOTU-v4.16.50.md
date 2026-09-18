# v4.16.50 — Standart üye günlük soru limiti (Sistem > Ayarlar)

## İstek
Sistem menüsünde, standart üyelerin günde TÜM DERSLERDEN toplam en fazla kaç soru
çözebileceğini seçebileceğim bir ayar; günlük soru hedefleri buna göre oluşturulsun.

## Yapılanlar
### routes/admin.js — Ayar: `standart_gunluk_limit`
- mod=ayarlar'da mevcut değer okunur (yoksa varsayılan 2).
- /admin/ayar-kaydet bu alanı da kaydeder. Doğrulama: 1-500 arası tam sayı;
  boş/geçersiz/0 girilirse 2'ye döner, 500 üstü 500'e kırpılır.

### views/admin.ejs — Sistem > ⚙️ Ayarlar
- Mevcut sıralama ayarının altına ayrılmış yeni bölüm: "📚 Standart Üye Günlük Soru Limiti".
- Sayı girişi (min 1, max 500) + açıklama: premium üyelerin bundan etkilenmediği belirtilir.

### services/gunlukHedef.js — hedef üretimi
- Kullanıcının `uyelikTipi`'si MEVCUT sorguya eklendi (ek sorgu yok).
- **Standart üye:** ders bazlı hedef üretilmez; `toplamHedef = ayardaki limit`
  (tüm derslerden toplam). Dönüşe `standartMod: true` ve `gunlukLimit` eklendi.
- **Premium üye:** davranış BİREBİR AYNI — her ders için max(2, floor(30g ort)+1).

### views/panel.ejs
- Standart üyede "Ders ders ilerleme" bölümü gizlenir (hepsi 0/0 görünmesin diye).
  Öğrenci tek bir toplam görür: "Bugün 1/2". Premium'da bölüm aynen durur.

## Not
Hedef dolunca mevcut "hedef doldu" bilgilendirme kartı zaten devreye giriyor
(gunlukHedefDolduMu). Bu sürüm soru çözmeyi ENGELLEMİYOR — hedef/bilgilendirme
mantığı korunuyor. Sert engelleme istenirse ayrıca eklenir.

## %100 korunan
- Premium hedef formülü, sıralama, puanlama, diğer tüm kod.

## Test
- node --check (admin/gunlukHedef) geçti; panel.ejs ve admin.ejs derlendi.
- UÇTAN UCA (sahte model katmanı): standart+limit2 -> toplamHedef 2, ders hedefleri 0;
  standart+limit5 -> toplamHedef 5; premium -> Matematik 3 / Türkçe 2 (eski formül),
  standartMod false.
- admin.ejs render: kayıtlı değer (7) görünüyor, ayar yokken 2; duyuru/sifirla/yedek/
  kullanicilar ekranları regresyonsuz.

## Değişen dosyalar
- routes/admin.js, services/gunlukHedef.js, views/admin.ejs, views/panel.ejs
- package.json (4.16.49 -> 4.16.50)

## Git
```bash
git add -A
git commit -m "v4.16.50: standart uye gunluk soru limiti (Sistem > Ayarlar)"
git push
git tag v4.16.50
git push origin v4.16.50
```
