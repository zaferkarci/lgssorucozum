# v4.16.51 — Öğrenci okul değişikliği: yönlendirme bağlantısı

## Durum tespiti
Öğrencinin okul/il/ilçe değiştirmesi ZATEN mümkündü: profil sayfasının alt kısmındaki
"Konum bilgileri" kartı (İl→İlçe→Okul kademeli seçim + Kaydet, /profil/konum-guncelle).
Sorun işlevde değil, KEŞFEDİLEBİLİRLİKTE: öğrenci "Kişisel bilgiler" kartında okulunu
görüyor ama değiştireceği formun aşağıda olduğunu bilmiyordu.

Not: Kart admin görünümünde bilerek gizli (`!adminGorunum`), bu yüzden admin panelden
bakınca yokmuş gibi görünüyor.

## Yapılanlar — views/panel.ejs (yalnızca görünüm)
- "Kişisel bilgiler" kartına, İl/İlçe satırının altına yönlendirme bağlantısı:
  "✏️ Okul / il / ilçe bilgimi değiştir". Tıklanınca sayfa aşağıdaki karta yumuşak
  kaydırır ve kartı kısa süre vurgular (mavi çerçeve).
- Bağlantı SADECE öğrenci kendi hesabındayken görünür; admin görünümünde ve
  öğretmen/kurumsalda gizli (hedef form da orada gösterilmiyor).
- "Konum bilgileri" kartına `id="konumBilgileriKart"` eklendi (bağlantı hedefi).
- Kart açıklamasına "Okulun değiştiyse buradan güncelleyebilirsin." cümlesi eklendi.

## %100 korunan
- /profil/konum-guncelle rotası, form alanları, yetki kontrolü, diğer tüm kod.
  Yeni rota/alan YOK; sadece görünüm ve yönlendirme.

## Test
- panel.ejs derlendi (sözdizimi OK).
- İzole render: ogrenci+adminGorunum=false -> bağlantı VAR; ogrenci+adminGorunum=true,
  ogretmen, kurumsal -> bağlantı YOK. Hedef id mevcut.

## Değişen dosyalar
- views/panel.ejs
- package.json (4.16.50 -> 4.16.51)

## Git
```bash
git add -A
git commit -m "v4.16.51: ogrenci okul degisikligi icin yonlendirme baglantisi"
git push
git tag v4.16.51
git push origin v4.16.51
```
