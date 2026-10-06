# v4.17.19-1 — Sınıf atlatma öncesi kayıtların puanı da güncel Z ile yenileniyor

## Sorun
Admin soru çözüm tablosunda bir soruda: Merve 49 sn → 44.5954, Elif 222 sn → 16.163 (ikisi de
güncel cron formülüyle tutarlı), ama Alpay 161 sn → 8.841 (beklenen ≈20.80).

Sunucuda doğrulandı: Alpay'ın kaydı 2026-07-09, sınıf atlatma tarihi 2026-09-13, ikinciKezMi=false.
Cron (`kullaniciPuanHesapla`) v4.16.44'ten beri yalnız `tarih >= sonSinifAtlamaTarihi` kayıtları
okuduğu için eski kayda hiç dokunmuyordu → içinde Temmuz'daki Z'ye göre hesaplanmış puan kalmıştı.

Kişisel puanlar etkilenmiyordu (k.puan = kayıt toplamı, 3 kullanıcıda doğrulandı). Etkilenenler:
- admin çözüm tabloları (eski değer görünüyordu),
- sorunun `hamPuan` ortalaması (`hamPuanHesapla` tüm doğru kayıtları topluyor).

## Çözüm — cronJobs.js
- `kullaniciPuanHesapla` içinde, sınıf atlatma tarihi olan kullanıcıların atlatma ÖNCESİ kayıtları
  ayrıca okunur:
  - doğru + ikinciKezMi değil → `kazanilanPuan` güncel Z ile yeniden hesaplanır (bulkWrite),
  - yanlış ama puanı 0 değil → 0'a çekilir,
  - ikinciKezMi → dokunulmaz (mevcut kural).
- Bu kayıtlar kişisel `toplamPuan` / `dersPuanlari`'na EKLENMEZ; v4.16.44 davranışı aynen.
- `_cronPuan(s, sure)`: ana döngüdeki formülün birebir kopyası (yalnız bu yeni blok kullanır;
  mevcut ana döngü koduna dokunulmadı). Formül değişirse 3 yeri birlikte güncelle:
  cronJobs.js ana döngü, `_cronPuan`, routes/panel.js `/cevap`.

## Test
- `node --check` geçti; CRLF korundu.
- Stub modellerle (Alpay/Elif/Merve senaryosu) eski ve yeni sürüm karşılaştırıldı:
  - yeni: Alpay eski kaydı güncellendi, Merve/Alpay oranı 2.144 (formülle aynı),
  - kişisel puanlar eski sürümle birebir aynı,
  - ikinciKezMi kayıt değişmedi, eski yanlış kayıttaki artık puan 0'a çekildi.

## Değişen dosyalar
- cronJobs.js
- (package.json değişmedi: 4.17.19 — ara güncelleme kuralı)

## Not
Değişiklik bir sonraki cron çalışmasında (05:10 ya da elle) etkili olur.
