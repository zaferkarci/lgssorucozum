# v4.16.6 — Çift-POST koruması (5 sn) + mükerrer kayıt temizleme (TAM PROJE)

Çalışan TÜM proje. v4.16.5 üzerine kuruludur.

## Sorun
Çift tıklama / formun iki kez gönderilmesi yüzünden aynı (kullaniciAdi + soruId)
için saniyeler arayla 2+ CevapKaydi oluşuyordu. Tespit: colak'ta aynı soru 0,7 sn
arayla iki kayıt. Bu, "çözülen" sayısını, günlük hedefi ve (doğru cevapta)
puan/altını İKİ KEZ sayıyordu (ör. aşpay'da analiz şişmesi, colak'ta 2+1 yerine 4).

## 1) Çift-POST koruması (idempotency)
routes/panel.js /cevap: kayıt oluşturmadan ÖNCE, aynı kullaniciAdi+soruId için
SON 5 SANIYEDE kayıt var mı bakılır; varsa ikinci gönderim YAZILMAZ — puan,
günlük hedef, altın ve "çözülen" ikinci kez sayılmaz. İkinci gönderim, ilk
cevabın sonucuyla (doğru/yanlış bandı) normal şekilde yanıtlanır.
- Gerçek tekrar çözümü (dakikalar/saatler sonra) ETKİLENMEZ; yalnız saniyeler
  içindeki çift tıklama/çift POST engellenir.

## 2) Tek seferlik mükerrer temizleme script'i
scripts/temizle-mukerrer-cevap.js (yeni dosya, uygulamaya dokunmaz):
- Her (kullaniciAdi, soruId) için kayıtları tarihe göre sıralar; ilkini TUTAR,
  son tutulandan <= 5 sn sonrasını mükerrer sayıp siler. Gerçek tekrar korunur.
- KURU ÇALIŞMA varsayılan; gerçekten silmek için --uygula:
    node scripts/temizle-mukerrer-cevap.js            (rapor, silme yok)
    node scripts/temizle-mukerrer-cevap.js --uygula    (siler)
- Silmeden sonra k.puan/dersPuanlari gece cron'unda (kullaniciPuanHesapla)
  CevapKaydi'ndan yeniden kurulduğu için ertesi gün otomatik düzelir.

## Değişen dosyalar (v4.16.5 tabanına göre)
- routes/panel.js                      (/cevap 5 sn çift-POST koruması)
- scripts/temizle-mukerrer-cevap.js    (YENİ — tek seferlik temizleme)
- package.json                         (4.16.5 -> 4.16.6)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- panel.js node --check; script node --check geçti. Satır sonları CRLF korundu.
- Dedup birim testi: 0,7 sn arayla çift kayıt silindi; 1 saat sonraki gerçek
  tekrar ve her grubun ilk kaydı korundu.

## Git
```bash
git add -A
git commit -m "v4.16.6: cevap cift-POST korumasi 5sn + mukerrer kayit temizleme scripti"
git push
git tag v4.16.6
git push origin v4.16.6
```
