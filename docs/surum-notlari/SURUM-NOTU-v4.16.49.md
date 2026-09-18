# v4.16.49 — Öğrenci üyelik tipi: Standart / Premium (yalnızca gösterim)

## İstek
Öğrenci profillerine standart ve premium üye seçeneği eklenmesi. Öğrenciler bunu
uygun bir yerde görsün. BAŞKA HİÇBİR ŞEY DEĞİŞMESİN.

## Yapılanlar
### models/Kullanici.js
- Yeni alan: `uyelikTipi` (String, default 'standart'). Değerler: 'standart' | 'premium'.
- Sadece GÖSTERİM amaçlı — soru limiti, sıralama, erişim, puanlama HİÇBİRİ etkilenmez.
- Mevcut kayıtlarda alan yoksa otomatik 'standart' davranır; veri taşıma gerekmez.

### views/panel.ejs (öğrencinin gördüğü yer)
- Profil banner'ında kullanıcı adının yanında rozet (öğretmen/kurumsal rozetleriyle
  aynı desen): "⭐ Premium Üye" (altın gradient) veya "Standart Üye" (gri).
  Yalnız rol='ogrenci'/'demo' için gösterilir.
- Kişisel Bilgiler kartına "Üyelik" satırı eklendi.

### views/admin-kullanici-detay.ejs + routes/admin.js
- "Bilgileri Güncelle" formuna "Üyelik Tipi" açılır menüsü.
- /kullanici-guncelle rotası uyelikTipi'ni kaydeder (yalnız iki geçerli değer kabul edilir;
  başka bir değer gelirse 'standart'a düşer).

## %100 korunan
- Soru servisi, günlük limitler, sıralama, puanlama, nitelik şartları, oyun — hiçbiri
  değiştirilmedi. Sadece bir alan + gösterim + admin düzenleme eklendi.

## Test
- node --check (Kullanici/admin) geçti.
- Her iki EJS şablonu derlendi (sözdizimi OK).
- İzole render testleri:
  * Admin dropdown: standart->standart, premium->premium, ALAN YOK->standart seçili.
  * Panel rozeti: ogrenci+premium->⭐ Premium, ogrenci+standart->Standart,
    ogrenci+alan yok->Standart, ogretmen->Öğretmen rozeti, kurumsal->Kurumsal rozeti
    (mevcut rozetler bozulmadı).

## Kullanım
Admin → Kullanıcılar → (öğrenci) Detay → Bilgileri Güncelle → Üyelik Tipi → Kaydet.
Öğrenci kendi panelinde adının yanında ve Kişisel Bilgiler kartında görür.

## Değişen dosyalar
- models/Kullanici.js, routes/admin.js
- views/panel.ejs, views/admin-kullanici-detay.ejs
- package.json (4.16.48 -> 4.16.49)

## Git
```bash
git add -A
git commit -m "v4.16.49: ogrenci uyelik tipi standart/premium (yalnizca gosterim)"
git push
git tag v4.16.49
git push origin v4.16.49
```
