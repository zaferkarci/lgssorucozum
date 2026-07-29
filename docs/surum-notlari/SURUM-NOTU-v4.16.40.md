# v4.16.40 — Sistem > Ayarlar: 30 günlük ortalama eşiği ile sıralama filtresi

## İstek
Bir kez birkaç soru çözüp pasif kalan öğrenciler tüm yıl sıralamada birinci kalmasın.
Sistem sekmesine ayarlanabilir bir eşik: 30 günlük ortalaması bu değer ve altında
olanlar Türkiye/il/ilçe/okul/sınıf sıralamalarında gösterilmesin. 0,0 da 2,0 da girilebilsin.

## Yapılanlar
### models/Ayar.js (YENİ)
- Basit anahtar-değer sistem ayarı. Kullanılan anahtar: 'siralama_min_ort30'.

### cronJobs.js (siralamaCacheHesapla)
- Eşik Ayar'dan okunur (yoksa/-1 => filtre KAPALI, kimse çıkarılmaz).
- Son 30 gün aktivitesi TEK aggregate ile (kullaniciAdi bazında sayım; analiz hariç) —
  ölçeklenir, kullanıcı başına ayrı sorgu yok.
- 30 günlük ortalama = son30 sayısı / bölen (bölen=min(30,üyelik günü); üyelik _id'den);
  gunlukHedef.js ile aynı formül.
- Tek 'nitelikli' bayrağına koşul eklendi: (toplamSoru>=10) && (esik<0 || son30Ort > esik).
  Bu bayrak 5 kapsamı da (Türkiye/il/ilçe/okul/sınıf) beslediği için hepsi filtrelenir.

### routes/admin.js
- Ayar require + mod=ayarlar için mevcut eşiği yükle + render'a ayarMinOrt30.
- POST /admin/ayar-kaydet: değeri upsert eder (virgül/nokta kabul; boş veya -1 => kapalı).

### views/admin.ejs
- Sistem grubuna "⚙️ Ayarlar" menüsü + mod=ayarlar formu (eşik girişi + açık/kapalı durum
  göstergesi + kaydedildi bildirimi).

## Davranış / güvenlik
- VARSAYILAN KAPALI: Ayar yokken filtre çalışmaz; deploy mevcut davranışı DEĞİŞTİRMEZ.
  Admin, Sistem>Ayarlar'dan 0 veya 2 girip aktive eder.
- Değişiklik bir sonraki gece hesabında ya da admin "⏰ Hesapla" ile hemen yansır.
- Sıralama yine tüm-zaman ortalamasına (ortTop) göre; sadece pasifler GİZLENİR.

## %100 korunan
- Sıralama sıralama mantığı, puanlama, diğer tüm kod. Eşik<0'da hiçbir fark yok.

## Test
- node --check (cron/admin/model) geçti.
- Filtre simülasyonu: KAPALI→herkes; 0→0,0 çıkar; 2→≤2,0 çıkar; <10 soru zaten nitelikli değil.
- admin.ejs render: ayarlar sayfası (kapalı/açık), nav linki, form; diğer modlar regresyonsuz.

## Değişen/eklenen dosyalar
- models/Ayar.js (yeni)
- cronJobs.js, routes/admin.js, views/admin.ejs
- package.json (4.16.39 -> 4.16.40)

## Git
```bash
git add -A
git commit -m "v4.16.40: Sistem>Ayarlar - 30 gunluk ortalama esigi ile siralama filtresi"
git push
git tag v4.16.40
git push origin v4.16.40
```
