# v4.16.54 — Standart limit gerçekten uygulanıyor (analiz şartı kaldırıldı)

## Sorun
v4.16.53'te "+1 soru" teklifi standart üye için kapatılmıştı, AMA limit yine de
uygulanmıyordu: tüm blok `analizTamamlandi` şartına bağlıydı.

Analiz (seviye tespit) her AÇIK KONUDAN en az 2 soru çözülmesini istiyor. Matematik'te
onlarca konu ve yüzlerce soru olduğu için bu şart uzun süre sağlanmıyor; dolayısıyla
`analizTamamlandi === false` kalıyor ve günlük limit bloğu HİÇ çalışmıyordu.
Öğrenci limitin üstünde soru çözmeye devam ediyordu.

## Çözüm — routes/panel.js
- Standart limit kontrolü ayrı bir dala alındı ve `analizTamamlandi` şartından
  BAĞIMSIZ hale getirildi:
  `gercekOgrenci && mod==='soru' && standartMod && toplamBugun >= toplamHedef` -> durdur.
- Premium dalı (analizTamamlandi + "+1 teklifi" + hedef+1'de durma) AYNEN korundu.

## Neden güvenli
Analiz cevapları `/cevap` içinde `analiz: true` bayrağıyla kaydediliyor ve
gunlukHedefHesap bunları `analiz: { $ne: true }` ile dışarıda bırakıyor. Yani analizdeki
öğrencinin `toplamBugun` değeri 0 kalır ve limit doğal olarak tetiklenmez — analiz
sürecini bozmaz.

## %100 korunan
- Premium davranışı, analiz akışı, puanlama, /cevap koruması (v4.16.53), diğer tüm kod.

## Test
- node --check panel.js geçti.
- Simülasyon:
  * standart 2/2 + analiz BİTMEMİŞ -> DURDU  (eskiden SORU VERİLİR idi — asıl hata)
  * standart 3/2 + analiz bitmemiş -> DURDU
  * standart 1/2 -> soru verilir | standart 2/2 -> durdu | ?ekstra=1 -> durdu
  * standart 0/2 analizde -> soru verilir (muaf, doğru)
  * premium 5/5 -> +1 teklifi | ?ekstra=1 -> soru verilir | 6/5 -> durdu
  * premium 5/5 + analiz bitmemiş -> soru verilir (premium davranışı değişmedi)

## Değişen dosyalar
- routes/panel.js
- package.json (4.16.53 -> 4.16.54)
