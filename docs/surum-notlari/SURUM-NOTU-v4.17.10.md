# v4.17.10 — +1 soru uyarısı kaldırıldı · konum hakkı sınıf bazlı · sınıf istatistiğinde eski sınıf verisi elendi

## 1) "İlave soru ister misin?" uyarısı kaldırıldı
Ek soru hakkı zaten verilmiyordu; geriye yalnızca teklif ekranı kalmıştı.
Artık hedef dolunca (standart/premium fark etmez) doğrudan "bugünlük bu kadar"
ekranı gösterilir. `?ekstra=1` elle denense de ek soru verilmez.

## 2) Konum bilgileri: SINIF SEVİYESİ başına bir kez
Önceki politika "yılda bir kez"di; istek üzerine sınıf bazlı yapıldı.
- Bilgilerden biri **eksikse**: her zaman doldurulabilir, **hak yanmaz**.
- Bilgiler tamamsa: aynı sınıf seviyesinde **ikinci değişiklik reddedilir**.
- **Sınıf atlayınca hak kendiliğinden yenilenir** (kayıtlı seviye eskir).
- Veli için okul zorunlu değil (okula bağlı olmadığı için).

### Yeni alanlar — models/Kullanici.js
`konumDegisiklikSinif` (Number), `konumDegisiklikTarih` (Date).

### Uyarı
Form gönderilmeden önce onay kutusu: "her sınıf seviyesinde yalnızca BİR kez
değiştirebilirsin, bu hakkını kullanacak" (yalnız bilgileri tam olanlarda).
Kartta da durum metni gösterilir (eksik / değiştirebilir / hak bitti).

## 3) Sınıf başarı istatistiği: eski sınıfın cevapları sayılmıyor
**Sorun:** `sinifOrtalamaHesapla` öğrencinin TÜM cevaplarını sayıyordu. Geçen sene
5. sınıftayken çözülen (ve çoğu yanlış) sorular, öğrenci 6. sınıfa geçtikten sonra da
istatistiğe giriyordu. Ayrıca yeni 5. sınıflarda, izinleri kapalı konularda bile
"çözülmüş gibi" düşük başarı görünüyordu.

**Çözüm:** Her öğrencinin `sonSinifAtlamaTarihi` değeri okunur; bu tarihten **önceki**
cevaplar sınıf istatistiğine katılmaz. (Kişisel istatistiklerde aynı kesme v4.16.44'te
zaten uygulanmıştı; sınıf istatistiği atlanmıştı.)

**Doğrulama:** 5 cevaplı örnekte eski 2 yanlış elendi, sınıf başarısı %40 -> %67.

## Test
- node --check (panel + Kullanici) geçti; panel.ejs derlendi.
- Konum politikası 4 senaryoda doğrulandı: eksik bilgi -> izin (hak yanmaz),
  hiç değiştirmemiş -> izin, aynı sınıfta ikinci kez -> RED, üst sınıfa geçmiş -> izin.
- Kart metinleri 4 durumda doğru render edildi (eksik / değiştirebilir / hak bitti / veli).

## Değişen dosyalar
- routes/panel.js, views/panel.ejs, models/Kullanici.js
- package.json (4.17.8 -> 4.17.10)
