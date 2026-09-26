# v4.17.0 — TAM ÖĞRENME (mastery learning) modu

## Kavram
Öğrenci seçtiği derste 1. ünitenin 1. konusundan başlar; sorular kolaydan zora gelir.
Bir konuda hedef soru sayısı tamamlanıp başarı eşiğin üzerindeyse sıradaki konuya geçer.
Her blok sonunda TAMAMLANAN konulardan 2'şer tekrar sorusu gelir; bir konu eşiğin altına
düşerse sıra otomatik olarak ona döner (sırada önce geldiği için). Böylece tüm konular
hedef başarıyla kapanır.

## Ayarlar (Sistem > Ayarlar > 🎯 Tam Öğrenme)
- `tam_ogrenme_soru` — konu başına soru sayısı. **0 = özellik PASİF** (kart gösterilmez).
  Varsayılan 10, en fazla 200.
- `tam_ogrenme_esik` — başarı eşiği %. Varsayılan 85, 1-100.
- Ayarlar kartlarına üçüncü kart eklendi (AÇIK/PASİF rozeti + özet), düzenleme alt sayfada.

## Kurallar
- Konu sırası: Unite (sira, uniteNo) -> konular[] dizisi. Kapalı konular (KonuIzin) hariç.
- Başarı: o konudaki **TÜM** cevaplar üzerinden (analiz/zayıf-konu dahil), sınıf atlatma
  tarihinden sonrası.
- Konu tamamlandı = cevap >= hedefSoru VE başarı >= eşik.
- Yayındaki soru sayısı hedeften azsa: o konudaki tüm sorular çözülünce tamamlanmış sayılır
  (sonsuz döngü önlemi).
- Tekrar turu yalnız TAMAMLANMIŞ konulardan yapılır (sırası gelmemişler atlanır).

## Dosyalar
### YENİ models/TamOgrenme.js
- kullanici+sinif+ders başına akış durumu: `blokSayac`, `tekrarKuyrugu`.
  (Konu başarısı burada tutulmaz — CevapKaydi'ndan türetilir.)

### YENİ services/tamOgrenme.js
- `ayarlariOku`, `konuListesi`, `konuDurumlari`, `durumHesapla`, `sonrakiKonu`.
- `sonrakiKonu`: önce tekrar kuyruğu, yoksa ilk tamamlanmamış konu; blok dolunca
  tamamlanan konulardan kuyruk kurar (her konu 2 kez).

### routes/panel.js
- `?tamOgrenme=<ders>` ile soru servisi hedef konuya filtrelenir.
- Kart verisi (`tamOgrenmeKart`): aktif ders, sıradaki konu, ilerleme, ders listesi.
- Ders seçimi `?toDers=` ile (her ders için ayrı ilerleme).

### views/panel.ejs
- "🎯 Tam Öğrenme" kartı, mevcut "Eksiklerini Kapat" kartının YANINDA (öğrenci seçer).
- Kartta: sıradaki ünite/konu, bu konuda x/10 soru, başarı %, tamamlanan/toplam konu.
- Birden fazla derste soru varsa ders seçici çipleri.

### routes/admin.js + views/admin.ejs
- Yeni ayarlar + kart + alt sayfa.

## %100 korunan
- Mevcut zayıf-konu kartı, analiz akışı, günlük limitler, puanlama, sıralama, oyun.
  Ayar 0 iken sistem eskisi gibi davranır.

## Test
- node --check (4 dosya) geçti; admin.ejs ve panel.ejs derlendi.
- Çekirdek mantık sahte veriyle uçtan uca test edildi:
  * sırayla ilerleme (Tam Sayılar -> Oranlar -> Cebir)
  * eşik altındaki konuda takılma (%70 -> geçmiyor), düzelince geçme (%85)
  * 10 soruluk blok dolunca tekrar kuyruğu kurulması ve tekrar sorularının gelmesi
- Render testleri: ayarlar kartı (AÇIK/PASİF), alt sayfa değerleri, panel kartı
  (hedef var / bitti / çok ders / kart yok), diğer ekranlar regresyonsuz.

## Değişen/eklenen dosyalar
- models/TamOgrenme.js (yeni), services/tamOgrenme.js (yeni)
- routes/panel.js, routes/admin.js, views/panel.ejs, views/admin.ejs
- package.json (4.16.58 -> 4.17.0)
