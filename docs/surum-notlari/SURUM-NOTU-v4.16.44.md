# v4.16.44 — Sınıf Atlatma (Sistem menüsü) + Mezun sınıf seviyesi

## İstek
Sistem menüsüne, tüm öğrencileri bir üst sınıfa geçiren bir araç. 12. sınıf öğrencileri
atlayınca "Mezun" olacak (13 sınıf seviyesi). Atlatma yapılınca kişisel ders/konu
istatistikleri ve oyun sıfırdan başlayacak; SORU ve soru istatistikleri hiç sıfırlanmayacak,
geçmiş+yeni veriyle sürekli güncellenmeye devam edecek. Mezun olanlar yalnız Türkiye
sıralamasına (kendi aralarında) tabi olacak.

## Tasarım
- "Mezun" = sınıf değeri **13** (Number tipi korunur; yalnız ekranda "Mezun" yazar).
  Bu, mevcut tüm sayısal karşılaştırma/sıralama/gruplama kodunu değiştirmeden çalışır.
- Kullanici modeline yeni alan: `sonSinifAtlamaTarihi` (Date). Kişisel puan/ders
  istatistikleri artık YALNIZ bu tarihten SONRAKİ CevapKaydı'larından hesaplanır
  (hem gece cron'unda hem canlı fallback'te). Eski cevaplar SİLİNMEZ — soru
  istatistiklerini (zorluk, ortalama süre, doğru oranı) beslemeye devam eder.
- Oyun kaydı (OyunOyuncu) {sınıf, kullanıcı} ikilisine bağlı olduğundan sınıf değişince
  otomatik sıfırdan başlar — ekstra kod gerekmedi (doğrulandı: routes/oyun.js
  bulunamazsa yeni kayıt oluşturuyor).

## Yapılanlar
### models/Kullanici.js
- `sonSinifAtlamaTarihi: { type: Date, default: null }` eklendi.

### cronJobs.js
- kullaniciPuanHesapla: CevapKaydi sorgusuna `tarih: { $gte: sonSinifAtlamaTarihi || epoch }`
  filtresi eklendi (kişisel istatistik kesme noktası).
- siralamaCacheHesapla: Mezun (sınıf 13) kullanıcılar il/ilçe/okul/sınıf sıralamalarından
  (genel VE ders bazlı) çıkarıldı; Türkiye sıralaması zaten sınıf bazlı gruplandığından
  yalnız kendi aralarında karşılaştırılıyorlar.

### routes/panel.js
- Canlı sıralama fallback'ine aynı Mezun hariç tutma mantığı eklendi (admin/profil tutarlılığı).
- "Ders İstatistikleri" (tumCevaplar) sorgusuna aynı tarih cutoff'u eklendi.

### Admin aracı — GET /admin/sinif-atlat (routes/admin.js)
- Kuru çalışma (varsayılan): hangi sınıftan hangi sınıfa kaç öğrenci geçecek, kaç kişi
  Mezun olacak, kaç kişi zaten Mezun (atlanmayacak) — rapor.
- `?uygula=1` (onaylı buton): rol='ogrenci'/'demo' olan (öğretmen/kurumsal/veli/moderator
  hariç) her öğrenci için sinif=(sinif>=12?13:sinif+1); puan=0; soruIndex=0;
  dersPuanlari=[]; gecilenSorular=[]; sonSinifAtlamaTarihi=şimdi; siralamaCache=null.
  Zaten Mezun (13) olanlara dokunulmaz.
- Sistem menüsüne "🎓 Sınıf Atlatma" linki eklendi (Ayarlar/Sıfırla ile aynı görünürlük deseni).

### Görünüm — "Mezun" etiketi (13. Sınıf yerine)
- admin.ejs: Bugünün Aktivitesi kutuları, Kullanıcılar filtre dropdown'u (5-8'den
  1-12+Mezun'a genişletildi), kullanıcı tablosu Sınıf sütunu.
- panel.ejs: profil banner'ı, Kişisel Bilgiler satırı, genel/ders sıralama "Sınıf" chip'i.
- admin-kullanici-detay.ejs: Sınıf/Şube satırı + manuel sınıf değiştirme dropdown'u
  (5-8'den 1-12+Mezun'a genişletildi — aksi halde admin elle düzenlerken bir öğrenciyi
  yanlışlıkla eski aralığa geri düşürebilirdi).

## %100 korunan
- Puanlama formülleri, mevcut sıralama mantığı (Mezun dışındakiler için davranış aynı),
  oyun mantığı, diğer tüm kod. Yalnız yeni alan + yeni filtreler + yeni araç eklendi.

## Test
- node --check (Kullanici/cronJobs/panel/admin) geçti.
- Gerçek render testleri: admin.ejs (kullanicilar/ayarlar/soruListesi/sifirla/duello modları,
  Sınıf Atlatma linki Ayarlar/Sıfırla ile aynı görünürlük deseninde), panel.ejs derlendi.
- Mock simülasyon: rol filtresi (öğretmen/veli/kurumsal hariç), gruplama (8→9, 12→Mezun,
  6→7), zaten-Mezun sayısı doğru hesaplandı.
- Mezun etiketi render testleri: Bugünün Aktivitesi kutusu, kullanıcı tablosu sütunu,
  panel profil banner/bilgi satırı — hepsi "13. Sınıf" yerine "Mezun" gösteriyor.

## Kullanım
Admin → Sistem → 🎓 Sınıf Atlatma → kuru çalışma raporunu incele → uygunsa
"SINIF ATLATMAYI UYGULA". Geri alınamaz (veri silinmez ama kişisel ilerleme sıfırlanır).

## Değişen/eklenen dosyalar
- models/Kullanici.js
- cronJobs.js, routes/panel.js, routes/admin.js
- views/admin.ejs, views/panel.ejs, views/admin-kullanici-detay.ejs
- package.json (4.16.43 -> 4.16.44)

## Git
```bash
git add -A
git commit -m "v4.16.44: Sinif Atlatma araci + Mezun (13) sinif seviyesi"
git push
git tag v4.16.44
git push origin v4.16.44
```
