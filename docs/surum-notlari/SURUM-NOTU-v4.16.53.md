# v4.16.53 — Standart üye: hedef dolunca "+1 soru" verilmez (gerçek limit)

Bu sürüm v4.16.52'yi (oyun sıfırlama + dünya temizliği) İÇERİR; 52 atlanıp doğrudan
53 deploy edilebilir.

## Sorun
Standart üye günlük hedefini (örn. 2) tamamladıktan sonra "+1 soru" teklifi alıyor ve
3. soruyu çözebiliyordu. "+1" teklifi premium için tasarlanmış tek seferlik bonustu;
v4.16.50'de standart hedef eklendiğinde bu akıştan ayrılmamıştı.

## Yapılanlar — routes/panel.js
### 1) Soru servisi
- `gunlukHedefData.standartMod` ise hedef dolduğu anda doğrudan
  "bugünlük bu kadar" (gunlukHedefDolduMu) — +1 teklif ekranı gösterilmez.
- URL'ye elle `?ekstra=1` eklenmesi de standart üyede yok sayılır.

### 2) Cevap ucu (/cevap) — sunucu tarafı koruma
- Limit dolmadan ÖNCE açılmış sayfadan cevap gönderilmesini de engeller.
- Koşul: rol='ogrenci' + uyelikTipi≠'premium' + analiz modunda DEĞİL +
  bugünkü (analiz dışı) cevap ≥ standart limit → kayıt yapılmaz, "bugünlük bu kadar"
  ekranına yönlendirilir.
- Analiz (seviye tespit) cevapları MUAF — mevcut `analizModundaMi` yardımcısı kullanıldı;
  analiz cevapları zaten hedefe sayılmıyor.
- Çift-POST korumasından SONRA yerleştirildi; mevcut akış bozulmadı.

## %100 korunan
- Premium davranışı birebir aynı (+1 teklifi, hedef+1'de durma).
- Demo akışı (cevap ucunda erken döner, hiçbir şey kaydetmez) etkilenmez.
- Analiz akışı, puanlama, diğer tüm kod.

## Test
- node --check panel.js geçti.
- Simülasyon — SORU SERVİSİ: standart 1/2 soru verir; standart 2/2 durur;
  standart 2/2 + ?ekstra=1 durur; premium 5/5 +1 teklifi; premium 5/5 + ?ekstra=1
  soru verir; premium 6/5 durur.
- Simülasyon — CEVAP UCU: standart 2. cevap kaydedilir; standart 3. cevap ENGELLENİR;
  standart analizde kaydedilir; premium 9/5 kaydedilir; demo etkilenmez.

## Değişen dosyalar
- routes/panel.js
- package.json (4.16.52 -> 4.16.53)

## Git
```bash
git add -A
git commit -m "v4.16.53: standart uye hedef dolunca +1 soru verilmez (gercek limit)"
git push
git tag v4.16.53
git push origin v4.16.53
```
