// --- LGS HAZIRLIK PLATFORMU - VERSİYON 4.4.3 (Modüler Yapı) ---
// v4.4.3 değişiklikleri (kurumsal bilgilendirme metni güncelleme):
//   • Kurumsal kullanıcı panelindeki "Sonraki sürümlerde gelecek" uyarısından
//     "üye istatistik detayları" kısmı kaldırıldı.
//   • Sebep: v4.3.69'da "Bugünün Aktivitesi" kartı eklendi → bu artık var.
//   • Tek dosya, tek satır değişikliği.
// --- VERSİYON 4.4.2 (Modüler Yapı) ---
// v4.4.2 değişiklikleri (Toplam puan görüntüleme — 4 basamak ondalık):
//   • v4.4.1'den sonra DB'de uzun ondalıklı puanlar oluşmuştu (15+ basamak)
//     çünkü 1/5^n bölümleri tam sayı vermiyor.
//   • Sorun: kullanıcı arayüzünde "1920.123456789012345" gibi okunmaz puanlar.
//   • Çözüm: server.js app.locals.puanFmt helper'ı eklendi.
//     - DB'de değer değişmez (ham saklanır)
//     - Görüntüde en fazla 4 basamak ondalık: 1920.1235
//     - Tam sayıysa ondalık yazılmaz: 1920
//   • app.locals olduğu için TÜM EJS sayfalarında otomatik erişilebilir
//     (Express'in res.render çağrıları app.locals'ı geçirir).
//   • Değişen sayfalar (14 yer):
//     - admin.ejs (kullanıcı listesi)
//     - admin-kullanici-detay.ejs (öğrenci detay)
//     - panel.ejs (9 yer: profil banner, davet listeleri, takip listesi, ...)
//     - takip-ogrenci-detay.ejs (3 yer: top bar, banner, istatistik)
//   • Bir client-side JS bloğunda (panel.ejs:2423) puanFmt server helper
//     olduğu için inline Math.round(*10000)/10000 kullanıldı.
//   • Admin, kurumsal, öğretmen, veli, öğrenci — tüm roller için tutarlı.
// --- VERSİYON 4.4.1 (Modüler Yapı) ---
// v4.4.1 değişiklikleri (Geç butonu — sınırsız 1/5^n + ortalamalarda 4 basamak):
//   • v4.4.0'da 3. ve sonraki çözümler 0 puan alıyordu. Kullanıcı isteği:
//     1/5'in katları halinde SINIRSIZ azalsın, ortalamaya hep dahil olsun.
//   • Yeni formül: puan / 5^gecisSayisi
//     - 1. çözüm (g=0): tam puan
//     - 2. çözüm (g=1): puan/5
//     - 3. çözüm (g=2): puan/25
//     - 4. çözüm (g=3): puan/125
//     - n. çözüm: puan/5^(n-1)
//   • Yuvarlama: DB'de ham (ondalıklı) saklanır.
//   • Görüntüleme:
//     - Toplam puan: Math.round ile tam sayı (eskisi gibi, sade)
//     - dersOrt ve genelOrt: .toFixed(4) — 4 basamak ondalık
//   • Etkilenen 5 görüntüleme yeri:
//     - panel.ejs: genel ortalama kart (1460), ders ortalama kart (1571)
//     - takip-ogrenci-detay.ejs: aynı 2 yer
//   • Cron tarafında ikinciKezMi kayıtların kazanilanPuan'ı yeniden
//     hesaplanmaz, /cevap anında doğru yazıldığı için aynen tutulur.
//     (gecisSayisi bilgisi /gec'te tüketilip silindiği için cron yeniden
//     hesaplayamaz — kayıttaki değere güvenir.)
// --- VERSİYON 4.4.0 (Modüler Yapı) ---
// v4.4.0 değişiklikleri (Geç butonu — soru atlama):
//   • Soru çözme ekranına "⏭️ Geç" butonu eklendi. Öğrenci 5dk beklemeden
//     soruyu atlayabilir. Konfirmasyon ile.
//   • Yeni endpoint: POST /gec — kullanıcının gecilenSorular array'ine
//     ekler, hiçbir CevapKaydı oluşturmaz, hiçbir istatistiği değiştirmez.
//   • Sıralama mantığı: geçilen soru aynı ders/ünite/konu içinde EN SONA
//     itilir (zorluk artanından sonra). Aynı ünite içinde en zor sorudan
//     sonra gelir.
//   • Yeni şema alanları:
//     - Kullanici.gecilenSorular: [{soruId, gecisSayisi, sonGecisTarihi}]
//     - CevapKaydi.ikinciKezMi: bool (cron istatistik dışlar)
//   • Soru 2. kez gelip çözülürse:
//     - kazanılanPuan = normal_puan / 5 (öğrenci için)
//     - kayıtta ikinciKezMi: true → cron sorunun istatistik hesabından
//       dışlar (ezber etkisi sorunun gerçek zorluğunu çarpıtmasın)
//     - gecilenSorular listesinden silinir (döngü tamamlandı)
//   • Soru 3. ve sonraki kezlerde çözülürse:
//     - kazanılanPuan = 0
//     - aynı ikinciKezMi: true → istatistik etkisi yok
//   • Öğrencinin toplam puanı ve dersOrt'una 1/5 puan KATILIR (X seçeneği).
//   • Cron 3 yerde ikinciKezMi: { $ne: true } filtresi ekledi:
//     - soruIstatistikHesapla (line ~36)
//     - hamPuanHesapla (line ~162)
//     - kullaniciPuanHesapla'da 1/5 katsayısı yeniden uygulanır
//   • Tasarım gerekçesi: 2. kez gören öğrenci sorunun "gerçek" zorluğunu
//     yansıtmaz (ezber etkisi). Bu kayıtlar Z/ortSure hesabına girerse
//     soru yapay olarak "kolay" sayılır → puan formülü bozulur. Senin
//     "ikinci defa görülen sorunun sistemdeki güvenirliliği bozmasını
//     istemiyorum" isteğin birebir uygulandı.
//   • Test: 4 senaryo, sıralama 1 senaryo. Hepsi beklenen sonuç.
// --- VERSİYON 4.3.69 (Modüler Yapı) ---
// v4.3.69 değişiklikleri (Bugünün aktivite özeti — admin/öğretmen/veli):
//   • Yeni service: services/aktivite.js
//     - bugunBaslangic(): Europe/Istanbul 00:00 zaman damgası
//     - aktiviteOzeti(kullanicilar, bugun): sınıf bazlı özet + detay liste
//     - takipEdilenAktivite(adlar): öğretmen/veli için takip edilenlere göre
//   • Kullanici şemasına sonGiris alanı eklendi (Date, default null)
//   • Login akışı (POST /giris) — login'de sonGiris güncellenir
//     (await beklemez, oturum açılışını yavaşlatmaz)
//   • Admin > Kullanıcılar mod'unun başına "Bugünün Aktivitesi" kartı:
//     - Toplam giriş + toplam çözüm
//     - Sınıf bazlı kartlar (5/6/7/8): "X/Y giriş, Z kişi · W soru"
//     - Detay tablo (collapse): ilk 100 aktif öğrenci
//   • Panel > Takip sekmesinin başına aynı kart (öğretmen/kurumsal/veli için)
//     - Veri /takip/aktivite-bugun endpoint'inden fetch ile gelir
//     - TakipIliski.durum='kabul' olanlar için filtrelenir
//   • "Aktif" = bugün giriş yaptı VEYA bugün en az 1 soru çözdü
//   • Detay listesi soru sayısına göre azalan sıralı
//   • Test: izole birim test geçti — sınıf filtre, giriş saymayı doğru yapıyor
// --- VERSİYON 4.3.68 (Modüler Yapı) ---
// v4.3.68 değişiklikleri (Tekrar Eden Sorular tespit aracı — Aşama 1):
//   • Yeni admin sayfası: /admin/duplicate-sorular
//   • Yeni service: services/duplicateTespit.js
//     - normalize(s): metin temizleme (boşluk, noktalama, çevirme)
//     - metinBenzerlik(a,b): bigram Dice katsayısı, 0-1 arası
//     - duplicateBul(sorular, options): 4 tipte tespit:
//       * 'tam'        — metin + seçenekler birebir aynı
//       * 'metin'      — sadece metin aynı, seçenekler farklı
//       * 'secenekler' — sadece seçenekler aynı, metin farklı
//       * 'benzer'     — %85+ metin benzerliği (varsayılan)
//   • Her çift için CevapKaydi'ndan kullanıcı sayıları hesaplanır:
//     A çözen, B çözen, ikisini de çözen ("çakışma" senaryosu)
//   • 4 senaryo etiketi:
//     - ÇAKIŞMA       — aynı kullanıcı ikisini de çözmüş, birleştirme zor
//     - AYRI          — farklı kullanıcılar, birleştirme kolay
//     - BİRİ BOŞ      — birini kimse çözmemiş, diğeri silinebilir
//     - İKİSİ DE BOŞ  — hiç çözülmemiş, sade silme
//   • SADECE TESPİT VE GÖSTERİM — sil/birleştir butonu yok. v4.3.69'da.
//   • Birim test: 5 sahte soru, 4 doğru tip eşleşmesi.
// --- VERSİYON 4.3.67 (Modüler Yapı) ---
// v4.3.67 değişiklikleri ("Soruyu Gör" yarım düzeltme TAMAMLANDI):
//   • v4.3.66'da buton koşulu açıldı (sadece yanlış → tüm cevaplar) ama
//     soruVerileri JS objesini dolduran döngüde 'if (!c.dogruMu)' koşulu
//     UNUTULMUŞTU. Yani: butona basınca soruVerileri[id] undefined dönüyor,
//     soruGoster() içindeki 'if (!s) return' sessizce çıkıyordu.
//   • Sonuç: kullanıcı doğru cevaba bastı ama hiçbir şey olmadı.
//   • Hem panel.ejs hem takip-ogrenci-detay.ejs'te aynı kalıp. İkisi de
//     düzeltildi.
//   • Test: render simülasyonunda s1 (doğru) ve s2 (yanlış) için
//     soruVerileri['s1'] + soruVerileri['s2'] ikisi de oluşuyor.
//   • Acı ders: yarım düzeltme = sıfır düzeltme. Bir özelliği açarken iki
//     yere dokunulması gerekiyorsa ikisini de açmak şart.
// --- VERSİYON 4.3.66 (Modüler Yapı) ---
// v4.3.66 değişiklikleri (tüm cevaplar için "Soruyu Gör" butonu):
//   • Önceden Ders İstatistikleri sekmesindeki "Çözülen Sorular" tablosunda
//     sadece YANLIŞ cevaplar için "Soruyu Gör" butonu görünüyordu
//     (`if (!c.dogruMu && sb.soruMetni)`).
//   • Doğru cevaplı sorulara da erişmek istenildi: koşul `if (sb.soruMetni)`
//     olarak değiştirildi. Doğru-yanlış fark etmez, tüm cevaplar için
//     buton görünür.
//   • Etki: hem öğrenci kendi profili (panel.ejs), hem öğretmen takip
//     sayfası (takip-ogrenci-detay.ejs). Öğrenci/öğretmen/veli/kurumsal
//     herkesin paneli aynı şablonu kullanır.
//   • "Hatalı" butonu da olduğu yerde duruyor.
// --- VERSİYON 4.3.65 (Modüler Yapı) ---
// v4.3.65 değişiklikleri (LGS ortalama formülü services'e taşındı + cron 5 soru şartı):
//   • LGS ağırlıklı ortalama hesabı yeni services/lgsOrtalama.js dosyasında
//     TEK KAYNAK olarak duruyor. Önceden cronJobs.js + routes/panel.js +
//     routes/takip.js içinde kopyala-yapıştır 3 yerdeydi; biri unutulunca
//     veri tutarsızlığı oluyordu.
//   • Cron formülü artık ders bazlı 5 soru nitelik şartını uyguluyor —
//     panel/takip ile birebir aynı sonucu üretir. Eski cron 1 soruluk
//     ortalamaları bile sıralamaya katıyordu, artık katmıyor.
//   • Profil EJS şablonları (panel.ejs, takip-ogrenci-detay.ejs) hâlâ
//     inline hesap yapıyor (EJS module import edemez) ama services ile
//     birebir aynı formül. Yorum eklendi: değiştirirsen iki yeri de
//     güncelle.
//   • Bu, services/ klasörünün ilk modülü. İlerideki scoring.js, ranking.js
//     gibi modüller için zemin hazır.
//   • Test: 7 senaryoluk birim test geçti.
// --- VERSİYON 4.3.64 (Modüler Yapı) ---
// v4.3.64 değişiklikleri (profil "Genel ortalama" kartı LGS ağırlıklı):
//   • v4.3.63'te cronJobs + panel.js + takip.js'i LGS ağırlıklı formüle
//     çevirdik ama PROFİL EJS şablonlarındaki "Genel ortalama" kartı
//     kendi içinde ayrı bir hesap yapıyordu (nitelikli derslerin düz
//     ortalamasının düz ortalaması).
//   • Sonuç: berat profili "16.72" gösteriyordu (Matematik dersOrt'u
//     direkt yansıyordu, tek ders olduğu için bölünmüyordu). LGS ağırlıklı
//     değeri 4.46 olmalı.
//   • Düzeltme: hem panel.ejs hem takip-ogrenci-detay.ejs içindeki "Genel
//     ortalama" hesabı LGS katsayıları (4-4-4-1-1-1, toplam 15) ile yapılır.
//   • Min 5 soru nitelik şartı korundu — çok az soruluk dersler hesaba
//     katılmaz (profil tarafında; cron'da bu şart yok, küçük fark olabilir).
//   • Karta küçük açıklayıcı not: "LGS ağırlıklı"
// --- VERSİYON 4.3.63 (Modüler Yapı) ---
// v4.3.63 değişiklikleri (LGS resmi ağırlıklı ortalama):
//   • Genel ortalama formülü LGS'nin gerçek puan hesabıyla aynı ağırlıkları
//     kullanır:
//     - Matematik × 4
//     - Türkçe × 4
//     - Fen Bilimleri × 4
//     - T.C. İnkılâp Tarihi × 1
//     - Din Kültürü × 1
//     - İngilizce × 1
//   • Toplam ağırlık 15 — bölen sabit.
//     ortOrtalama = (Mat×4 + Türk×4 + Fen×4 + İnk×1 + Din×1 + İng×1) / 15
//   • v4.3.62'nin "6 sabit dersi eşit say" yaklaşımı LGS gerçekliğine
//     uymuyordu. Resmi MEB formülü ana dersleri (sayısal+sözel belkemiği)
//     4 katı ağırlıklı sayıyor.
//   • Kaynak: MEB LGS Puan Hesaplama Kılavuzu 2025.
//   • Yanlış cevap cezası (D-Y/4) UYGULANMAZ — platform çalışma odaklı,
//     öğrenme sürecinde "yanlış yapma cezası" sinyali istenmedi.
//   • Mantık testi: 4 senaryo, beklenen sıralamayı verdi.
//   • 3 dosya senkron: cronJobs.js + routes/panel.js + routes/takip.js.
// --- VERSİYON 4.3.62 (Modüler Yapı) ---
// v4.3.62 değişiklikleri (genel ortalama = ortToplam / 6):
//   • Türkiye/il/ilçe/okul/sınıf sıralamalarında kullanılan "genel
//     ortalama" formülü değişti:
//     ESKİ: ortToplam = ders ortalamalarının toplamı
//     YENİ: ortOrtalama = ders ortalamalarının toplamı / 6
//   • 6 = LGS'deki ders sayısı (sabit). Çözülmemiş ders 0 ortalamayla
//     katılır, "tüm dersleri açan" avantajlı olur. "Tek dersten yüksek
//     puan tutturan" 1/6 katsayısıyla baskılanır.
//   • Şu anki etkisi: sadece Matematik dersli durumda, tüm öğrencilerin
//     ortalama değeri 1/6'sına iner ama sıralamaları değişmez. Eylülde
//     6 derse geçildikçe formül fark yaratır.
//   • Mantık testi (3 senaryo): tek ders → berat #1, çok ders → çok
//     ders açan #1, dengeli → tüm dersleri açan #1. Sezgiyle uyumlu.
//   • Değişen 3 dosya: cronJobs.js (cron hesabı), routes/panel.js
//     (gerçek zamanlı), routes/takip.js (öğretmen panel). Üçü de senkron.
// --- VERSİYON 4.3.61 (Modüler Yapı) ---
// v4.3.61 değişiklikleri (TR# kolonu + cron tetikleme yönlendirme):
//   1) Admin > Kullanıcı Listesi → TR# kolonu hep "—" görünüyordu.
//      Sebep: v4.3.60 kodu siralamaCache.genel.turkiye okuyordu, ama
//      cronJobs.js bunu { ...genel, dersSiralamalari } olarak doğrudan
//      yayıyor — yani siralamaCache.turkiye olmalıydı. Düzeltildi.
//   2) Admin > Hesaplama butonu — tetikledikten sonra ekran "soru listesi"
//      moduna dönüyordu (kullanıcı listesinden tetiklenmiş olsa bile).
//      Sebep: window.location.href="/admin" zorla varsayılan moda atıyor.
//      Düzeltme: frontend mevcut path+query'i hidden 'donus' alanı olarak
//      gönderir, server o adrese yönlendirir.
//   3) Risk: redirect yalnızca '/'  ile başlayan değerlere izin verir
//      (open-redirect koruması).
// --- VERSİYON 4.3.60 (Modüler Yapı) ---
// v4.3.60 değişiklikleri (admin kullanıcı listesi + veli sınıf görünümü):
//   1) Davet Ettiklerim tablosu (öğretmen/kurumsal panel) — veli ve diğer
//      roller için sınıf/şube hücresinde rol rozeti gösterilir:
//      ÖĞRETMEN / VELİ / YÖNETİCİ / MODERATÖR / 8/A (öğrenci).
//      Bug: veli kullanıcının sinif alanı şema default'u 8 olarak kalıyor,
//      eski kod sadece öğretmen kontrolü yapıyordu → veliler "8" görünüyor.
//   2) Admin > Kullanıcı Listesi sıralaması yeniden düzenlendi:
//      - Öğrenciler en üstte, Türkiye sırası (1, 2, 3...) artan
//      - Aynı Türkiye sırasındakiler il/ilçe alfabetik
//      - Niteliksiz öğrenciler (TR sırası yok) puana göre azalan, sonra
//        il/ilçe alfabetik
//      - Sonra: kurumsal/moderatör → öğretmen → veli grupları, her biri
//        il/ilçe alfabetik
//      - Yeni "TR#" kolonu: Türkiye sırası küçük etiket olarak
//   3) Sınıf seviyesi filtresi eklendi (5/6/7/8). URL: ?kullaniciSinif=8
//      (filSinif zaten soru filtresi olduğu için ayrı param adı kullanıldı)
//   4) tumKullanicilar sorgusuna 'sube rolListesi siralamaCache' alanları
//      eklendi (sıralama hesabı için).
// --- VERSİYON 4.3.59 (Modüler Yapı) ---
// v4.3.59 değişiklikleri (sıralama eşleşmesi için alan normalizasyonu):
//   • baharsahin (8/A) "Okul #1/1" olarak görünüyordu — gerçekte aynı
//     okulda 5+ kişi var. Sebep: u.okul / u.sube alanlarında küçük yazım
//     farkları (sondaki boşluk, çift boşluk, büyük/küçük harf) cron'da
//     katı === karşılaştırmasını başarısız kılıyordu.
//   • Düzeltme: il/ilce/okul/sube karşılaştırmaları artık normStr() ile
//     normalize ediliyor (trim + lowercase + tek boşluk). Veritabanı
//     dokunulmaz, sadece karşılaştırma anında geçici normalize.
//   • Etki: yarın 05:10'da cron çalışınca baharsahin tipi kullanıcılar
//     doğru gruba düşer; "Okul 5/5" gibi gerçekçi sıralama görünür.
//   • Mantık testi: boşluk, büyük/küçük harf, çift boşluk varyasyonları
//     hepsi aynı gruba eşleşiyor.
// --- VERSİYON 4.3.58 (Modüler Yapı) ---
// v4.3.58 değişiklikleri (panel profil sayfa "Çözülen Sorular" gizleme bug):
//   • ASIL BUG: panel.ejs satır 1622'de <%= %> etiketi HTML escape ettiği
//     için ' style="display:none;"' çıktısının tırnakları &#34; olarak
//     kaçırılıyordu → tarayıcı style attribute'unu okuyamıyor, satırlar
//     ASLA gizlenmiyordu. Tüm cevaplar tek sayfada görünüyordu (138 satır
//     navigasyonsuz).
//   • Düzeltme: <%= %> yerine <%- %> (escape etmeyen) kullanıldı. Aynı
//     bug kalıbı başka yerde aranıp temizlendi (panel.ejs+admin.ejs).
//   • Bu bug v4.1.38'den beri vardı, kullanıcı sayısı az olduğu için fark
//     edilmemişti. enesaydin27'nin 138 cevabı patlattı.
//   • v4.3.57'deki sayfalama mantığı doğruydu — sadece HTML üretimi
//     bozuktu.
// --- VERSİYON 4.3.57 (Modüler Yapı) ---
// v4.3.57 değişiklikleri (öğrenci detay sayfası — sayfalama):
//   • Hem admin > kullanıcı detay (admin-kullanici-detay) hem öğretmen >
//     takip > öğrenci detay (takip-ogrenci-detay) sayfalarındaki "Çözülen
//     Sorular" tablosu artık sayfalama destekli.
//   • Sayfa başına 30 cevap. URL: ?sayfa=N
//   • Üstte/altta sayfa navigasyonu: « ‹ Önceki [Sayfa X/Y] Sonraki › »
//   • Toplam cevap sayısı görünür. Sayfa sınır dışındaysa otomatik 1'e
//     dönülür.
//   • Eski "slice(0, 50)" mantığı kaldırıldı; mevcut sıralama (yeni→eski)
//     korundu.
//   • Performans: admin tarafında artık sadece görünen sayfanın soru
//     ID'leri için Soru sorgusu yapılır (eskiden hepsi yükleniyordu).
// --- VERSİYON 4.3.56 (Modüler Yapı) ---
// v4.3.56 değişiklikleri (admin soru önizleme — GERÇEK SEBEP BULUNDU):
//   • Asıl bug: soruOnizle() fonksiyonu ve önizleme modal'ı (HTML) mod
//     === 'soruListesi' bloğunun İÇİNDE tanımlıydı. Sorular sekmesinde
//     çalışıyordu ama Zorluk Raporu (mod === 'zorlukRapor') vb. başka
//     mod sayfalarında 'soruOnizle is not defined' hatası sessizce
//     başarısız oluyordu.
//   • Düzeltme: Modal HTML + soruOnizle + adminMathRender fonksiyonları
//     mod kontrolünden BAĞIMSIZ konuma taşındı (mod bloğu kapatıldıktan
//     SONRA, ana <script> bloklarının arasında). Artık hangi mod açıksa
//     açık olsun ÖNİZLE her sayfada çalışır.
//   • TEST: EJS render simülasyonu ile 4 farklı modda (zorlukRapor,
//     soruListesi, referans, haberler) hem function hem modal'ın
//     bulunduğu doğrulandı.
//   • v4.3.53/55'teki Authorization header kaldırma ve status check
//     iyileştirmeleri korundu — onlar da yerinde değişikliklerdi, ama
//     asıl sorun fonksiyonun bulunmamasıydı.
// --- VERSİYON 4.3.55 (Modüler Yapı) ---
// v4.3.55 değişiklikleri (soru önizleme hata teşhisi):
//   • Fetch'e response status kontrolü eklendi. r.ok false ise (401/
//     403/404/500), modal'da açıklayıcı hata mesajı çıkıyor.
// --- VERSİYON 4.3.54 (Modüler Yapı) ---
// v4.3.54 değişiklikleri (sıralamalar sınıf seviyesine göre filtreli):
//   • Türkiye, İl, İlçe, Okul, Sınıf-Şube sıralamalarının tamamı artık
//     SADECE AYNI SINIF SEVİYESİNDEKİ öğrenciler arasında yapılıyor.
//   • Örnek: Sude (6. sınıf) için Türkiye sıralaması = Türkiye'deki 6.
//     sınıf öğrencileri arasında. 7. ve 8. sınıflarla aynı listede değil.
//   • Hem genel sıralama hem ders sıralamaları aynı mantıkta.
//   • cronJobs.js içinde turkiyeListesi ve dersTurkiyeListeleri tek liste
//     yerine sınıf seviyesi bazlı sözlüklere dönüştürüldü
//     (turkiyeListeleriPerSinif). ayniIl/ayniIlce/ayniOkul filtrelerine
//     'Number(x.u.sinif) === uSinif' eklendi.
//   • Etki: ertesi sabah 05:10'da cron çalışınca tüm öğrencilerin
//     sıralamaları yeniden hesaplanır.
// --- VERSİYON 4.3.53 (Modüler Yapı) ---
// v4.3.53 değişiklikleri (admin soru önizleme bug fix):
//   • Admin > Zorluk Raporu / Soru Listesi / vb. sayfalardaki "ÖNİZLE"
//     butonu çalışmıyordu. Sebep: fetch çağrısı 'Authorization: Basic
//     <%- adminToken %>' header'ı gönderiyor; adminToken process.env.
//     ADMIN_PASSWORD'a fallback ediyor; production'da gerçek şifre
//     farklıysa yanlış token üretiyor → 401 dönüyor.
//   • Düzeltme: Authorization header tamamen kaldırıldı. /api/soru/:id
//     endpoint'i zaten session kimliğini (req.session.adminGirisli) kabul
//     ediyor — Basic Auth header'a gerek yok.
//   • credentials: 'same-origin' eklendi (session cookie'sinin gönderildiğinden
//     emin olmak için).
// --- VERSİYON 4.3.52 (Modüler Yapı) ---
// v4.3.52 değişiklikleri (admin referans 4 kademeli sıralama):
//   • Admin > Referans menüsünde Bekleyenler bölümü 4 kademede sıralanır:
//     1) admin + kopyalanmamış (en üstte, yeni → eski)
//     2) kullanıcı + kopyalanmamış (yeni → eski)
//     3) admin + kopyalanmış
//     4) kullanıcı + kopyalanmış (en altta)
//   • Kullanılanlar bölümü: admin önce, içlerinde yeni → eski.
//   • Tek dosya: views/admin.ejs içindeki sort fonksiyonu.
// --- VERSİYON 4.3.51 (Modüler Yapı) ---
// v4.3.51 değişiklikleri (davet linkleri sıralama — geç düzeltme):
//   • v4.3.43 ve v4.3.44 değişiklikleri sandbox sıfırlanması sonrası
//     yeniden inşa edilirken atlanmıştı. Bu versiyonda toparlandı:
//     - PROFİL davet linkleri: son üretilen üstte (kopyalanmamışlar üstte,
//       içinde yeni → eski).
//     - ADMIN referans listesi: bekleyenler ve kullanılanlar yeni → eski.
//   • Tek değişiklik: sort 'olusturmaTarih' yönü tersine çevrildi.
// --- VERSİYON 4.3.50 (Modüler Yapı) ---
// v4.3.50 değişiklikleri (dinamik puanlama: Z = cron Z):
//   • Puan formülündeki Z artık sorunun cron Z'sinden (s.zorlukKatsayisi)
//     gelir — hem anlık /cevap'ta hem cron'da. Eski "1 + 4×(1-dogruOrani)
//     ×(1+sigmaBasari)" formülü kaldırıldı.
//   • Sonuç: aynı soruda tüm öğrenciler aynı Z alır, tek fark süre
//     bileşeni (log fonksiyonu korundu). İlk-son çözen ayrımı kalktı.
//   • Cron her gün Z'yi yeniden hesaplıyor, kullaniciPuanHesapla zaten
//     tüm doğru cevapları o güncel Z ile yeniden topluyor — yani puanlar
//     her gece güncellenir.
//   • Sıralamada görünür değişim olabileceği için profil "Genel sıralama"
//     kartına bilgi notu eklendi.
//   • v4.3.49'a kadar olan tüm iyileştirmeler korundu: davet linkleri
//     sıralama, admin referans sıralama, puan simülasyonu sayfası, soru
//     puan detayı sayfası, MINIMUM_COZUM=5.
// --- VERSİYON 4.3.49 (Modüler Yapı) ---
// v4.3.49 değişiklikleri (MINIMUM_COZUM 50 → 5):
//   • Soru zorluk katsayısı (Z) hesabındaki örneklem ağırlığı eşiği 50'den
//     5'e düşürüldü. Az çözümlü sorularda Z artık 3'e yapışmıyor, 5 çözüm
//     sonrası gerçek zorluğa kayıyor.
//   • Etki: Küçük kitlede (şu an 7-8 öğrenci) soruların büyük çoğunluğu
//     N=5'i aştığı için Z değerleri gerçeği yansıtacak. "106 puan" gibi
//     az veriden kaynaklı uçurumlar azalır.
//   • Risk: Çok az veride (N=5-15) Z biraz dalgalanır. Stabilite N büyüdükçe
//     gelir. Mevcut kitle ölçeğinde bu kabullenilen denge.
//   • Soru Puan Detayı sayfasındaki "yapışkanlık" uyarısı da 5'e güncellendi.
//   • Değişen yerler: cronJobs.js (Z hesabı), routes/panel.js (kullanılmayan
//     zorlukGuncelle fonksiyonu — bütünlük için), routes/admin.js (uyarı eşiği).
// --- VERSİYON 4.3.48 (Modüler Yapı) ---
// v4.3.48 değişiklikleri (soru puan detayı sayfası):
//   • Admin > İçerik > 🔬 Soru Puan Detayı sayfası eklendi.
//   • En az 1 kez çözülmüş tüm soruları listeler. Her sorunun:
//     - Cron Z (zorlukKatsayisi), etiket (Kolay/Orta/Zor vs.)
//     - Ham Puan (gerçekleşmiş ortalama)
//     - N (çözüm sayısı), D (doğru sayısı), Doğru %
//     - T_ref (ortalama süre), σ_sure (sürelerin std sapması)
//     - hizBileseni, GE (puan formülü çarpanları)
//     - Örnek puan (ortalama hızdaki öğrencinin alacağı puan)
//   • Yapışkanlık uyarısı: N<50 olan soruların satırı sarı arka planda
//     gösterilir, Z değeri "3'e yakın çekilmiş olabilir" notuyla.
//   • Filtreler: ders, sınıf, zorluk aralığı (URL parametreleriyle).
//   • HİÇBİR VERİYİ DEĞİŞTİRMEZ — salt-okunur.
// --- VERSİYON 4.3.47 (Modüler Yapı) ---
// v4.3.47 değişiklikleri (puan simülasyonu — gerçek sıralama mantığı):
//   • v4.3.45/46'da simülasyon "tüm öğrencileri" toplam puana göre
//     sıralıyordu. Bu, gerçek Türkiye sıralamasıyla aynı değildi.
//   • Düzeltme:
//     - Sadece nitelikli (≥10 doğru cevap) öğrenciler sıralanır
//     - Sıralama kriteri "ortToplam" (ders puanlarının ortalamalarının
//       toplamı) — cron'daki gerçek mantıkla birebir
//   • Nitelikli olmayanlar tabloda "NİTELİKSİZ" rozeti ile gösterilir,
//     sıra hücresi boş (—).
//   • Simülasyon artık ana sayfadaki "Genel sıralama" ile aynı sayıyı
//     verir.
// --- VERSİYON 4.3.46 (Modüler Yapı) ---
// v4.3.46 değişiklikleri (puan simülasyonu yetki düzeltmesi):
//   • v4.3.45'te /admin/puan-simulasyon route'unun yetki kontrolü yanlıştı
//     (req.session.kullaniciAdi !== 'admin' kontrolü ile herkesi reddediyordu).
//     Admin paneli Basic Auth kullanıyor — diğer admin route'larıyla aynı
//     adminKontrol(req, res) çağrısı yapıldı.
// --- VERSİYON 4.3.45 (Modüler Yapı) ---
// v4.3.45 — v4.3.41 üstüne sadece "Puan Simülasyonu" eklendi.
//   • Admin > Sistem > 📊 Puan Simülasyonu sayfası eklendi.
//   • v4.3.42'deki yeni puan formülünü (Z = cron Z) tüm öğrencilerin
//     cevap geçmişine uygular, mevcut puanlarıyla kıyaslar.
//   • SADECE OKUR — hiçbir veri değiştirilmez. CevapKaydi / Kullanici /
//     Soru hiçbiri yazılmaz, salt simülasyon.
//   • URL ile filtre: /admin/puan-simulasyon?kullanici=berat,enesaydin27
//   • Bu versiyon v4.3.42'nin puanlama değişikliklerini İÇERMEZ — sadece
//     simülasyon aracı. Karar verdikten sonra v4.3.42 ayrı deploy edilir.
// --- VERSİYON 4.3.41 (Modüler Yapı) ---
// v4.3.41 değişiklikleri (mobil uyumu — admin paneli):
//   • Admin üst barı mobilde dikey: logo → ana nav (yatay kaydırılabilir)
//     → sağdaki blok (Hesapla / Merhaba / Çıkış) alta düşer, küçülür.
//     Üst bar yüksekliği sabit yerine esnek.
//   • Admin ana içerik padding'i mobilde küçülür.
//   • Admin'deki sabit kolonlu grid'ler (3'lü kurum istatistik, 5'li
//     sıralama, modal şıklar) mobilde tek/iki kolona iner.
//   • Tüm .tablo class'lı tablolar mobilde yatay kaydırılabilir (v4.3.38
//     kuralı), padding'ler küçülür.
//   • admin-kullanici-detay sayfası: 340px+1fr ana düzen mobilde alt alta,
//     istatistik grid'i 3'ten 2'ye (çok dar telefonda 1'e) iner.
//   • Mevcut 700px media query (admin alt nav) korundu, dokunulmadı.
//   • Masaüstü görünümü değişmedi.
//   • Bu mobil uyumlu hale getirme adımları tamamlandı (öğrenci + admin).
// --- VERSİYON 4.3.40 (Modüler Yapı) ---
// v4.3.40 değişiklikleri (mobil uyumu — takip-ogrenci-detay):
//   • Öğrenci istatistik detay sayfası (/takip/ogrenci/:ad) mobil uyumlu.
//     Bu sayfa veliler için kritik — çocuk istatistiklerine çoğunlukla
//     telefondan bakılır.
//   • Üst barda 2 link var ("ÖĞRETMEN GÖRÜNÜMÜ" rozeti + "Takip'e Dön").
//     Hamburger kuralından muaf (yeni class: ptopbar-nav-detay). Mobilde
//     rozet gizlenir, "Takip'e Dön" linki küçültülüp kalır.
//   • Soru detay modalı mobilde kenarlardan az boşluk, iç padding küçük.
//   • Modal içi şıklar grid'ine secenekler class'ı eklendi — mobilde
//     v4.3.37 kuralıyla tek kolona iner.
//   • Yanlış sorular tablosu zaten overflow-x:auto wrapper içindeydi,
//     dokunulmadı.
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.39 (Modüler Yapı) ---
// v4.3.39 değişiklikleri (mobil uyumu — kalan öğrenci sayfaları):
//   • Şifremi unuttum / şifre yenile sayfaları: sabit 350px genişlikli
//     auth-card mobilde tam genişliğe iner, padding küçülür (≤420px).
//   • İletişim sayfası: üst boşluk ve kart padding'i mobilde küçülür
//     (≤480px). Kapsayıcı zaten esnekti.
//   • Öğrenci tarafının tüm sayfaları artık mobil uyumlu (giriş, kayıt,
//     panel, soru çözme, profil, takip, iletişim, şifre işlemleri).
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.38 (Modüler Yapı) ---
// v4.3.38 değişiklikleri (mobil uyumu — Adım 2b: profil/takip/kurum):
//   • Profil sayfası ana düzeni (içerik + sağ yan kolon) mobilde alt alta
//     dizilir. Kurum üyeleri özet kartları (3'lü) ve profil formları tek
//     kolona iner.
//   • Takip istatistik panelindeki 4'lü metrik grid mobilde tek kolon,
//     5'li sıralama grid'i 2 kolon olur.
//   • Geniş tablolar (kurum üyeleri, takip listeleri — .tablo class'lı)
//     mobilde yatay kaydırılabilir hale geldi, taşma yok.
//   • Yeni yardımcı class'lar: mobil-tekkolon, mobil-ikikolon.
//   • auto-fit/auto-fill minmax grid'lere dokunulmadı (zaten responsive).
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.37 (Modüler Yapı) ---
// v4.3.37 değişiklikleri (mobil: şıklar alt alta):
//   • Telefonda (≤760px) tüm soruların şıkları tek kolona dizilir —
//     sorunun sikDizilimi 'yatay' (4'lü) veya 'ikili' (2'li) ayarlı olsa
//     bile mobilde alt alta gösterilir.
//   • .secenekler grid container'ına media query'de grid-template-columns
//     1fr !important uygulandı (inline style'ı ezmek için).
//   • Takip/istatistik sayfasındaki JS ile üretilen şık grid'ine de
//     'secenekler' class'ı eklendi — o da mobilde tek kolon olur.
//   • Masaüstü görünümü değişmedi.
// --- VERSİYON 4.3.36 (Modüler Yapı) ---
// v4.3.36 değişiklikleri (mobil uyumu — Adım 2a: üst bar + soru çözme):
//   • Panel üst barı mobilde hamburger menüye (☰) dönüşür. ≤760px'de nav
//     linkleri gizlenir, hamburger butonuna tıklanınca dikey açılır panel
//     olarak görünür. Dışına tıklayınca kapanır.
//   • Üst bar mobilde küçülür: logo/avatar/kullanıcı bilgisi kompakt.
//   • Soru çözme ekranı mobil uyumlu: soru kartı sabit yükseklik yerine
//     esner, padding'ler küçülür, soru metni ve şıklar dokunmatik için
//     uygun boyuta gelir.
//   • Çok dar telefonlar (≤380px) için ek küçültme.
//   • style.css'e media query eklendi. Masaüstü görünümü değişmedi.
//   • Sonraki adım (2b): profil, takip, kurum, veli modları.
// --- VERSİYON 4.3.35 (Modüler Yapı) ---
// v4.3.35 değişiklikleri (mobil uyumu — Adım 1: giriş + kayıt sayfaları):
//   • Giriş ve kayıt sayfaları mobil/tablet uyumlu hale getirildi.
//   • ≤640px (telefon): sol mavi tanıtım paneli ile sağ form alt alta
//     dizilir, sayfa tam ekran kaplar (border-radius/gölge kalkar).
//     Tanıtım özellik kartları ve puan kutusu mobilde gizlenir — sade
//     giriş/kayıt ekranı.
//   • ≤900px (tablet): sabit genişlik yerine esnek genişlik.
//   • Giriş için public/style.css'e, kayıt için kayit.ejs <style> bloğuna
//     media query eklendi. Masaüstü görünümü değişmedi.
//   • Sonraki adımlar: panel/soru çözme ekranı, sonra diğer öğrenci
//     sayfaları.
// --- VERSİYON 4.3.34 (Modüler Yapı) ---
// v4.3.34 değişiklikleri (demo hesabı sınıf seçici):
//   • Demo hesabı soru çözme ekranının üstündeki dropdown'dan sınıf
//     seviyesini değiştirebilir. Sınıf listesi Unite koleksiyonundaki
//     sınıflardan gelir.
//   • Yeni endpoint: POST /demo/sinif-degistir — demo'nun sinif alanını
//     günceller, idx=0'a döner (yeni sınıfın ilk sorusundan başlar).
//   • Seçili sınıfta soru yoksa, boş ekranda da sınıf seçici gösterilir —
//     demo başka sınıfa geçebilir, sıkışmaz.
//   • Yalnızca demo rolü etkilenir, diğer roller dokunulmadı.
// --- VERSİYON 4.3.33 (Modüler Yapı) ---
// v4.3.33 değişiklikleri (demo / etkisiz öğrenci hesabı):
//   • Yeni rol: 'demo'. Admin "demo" tipi davet kodu üretir, o kodla
//     açılan hesap etkisiz bir öğrenci hesabıdır.
//   • Demo hesabı tüm soruları görür, ileri-geri tek tek geçer (moderatör
//     gibi navigasyon), cevap verebilir ve doğru/yanlış bandını görür.
//   • ANCAK: demo cevabı HİÇBİR ŞEY KAYDETMEZ. /cevap route'u demo için
//     erken çıkar — CevapKaydi yok, puan yok, süre yok, zorluk güncellenmez.
//     Aynı soru tekrar tekrar cevaplanabilir.
//   • Demo hesabı soru çözmediği için sıralama/puan tablosunda görünmez.
//   • Demo kayıt formu öğrenci gibi (sınıf seçer) — soruları sınıfına göre
//     listeler. refTip='demo', rol='demo'.
//   • gecerliTipler'e 'demo' eklendi (admin + auth).
// --- VERSİYON 4.3.32 (Modüler Yapı) ---
// v4.3.32 değişiklikleri (cevap sonucu üst bant bildirimi):
//   • Öğrenci bir soruyu cevaplayınca, yeni soru sayfasının üstünde 5 sn
//     görünen kayan bant (toast) belirir. Bant kaybolurken arkada yeni
//     soru zaten hazır — "yeni soru anında gelir".
//   • Doğru cevap: yeşil bant + beyaz tik (CSS çizim) + "Doğru cevap!" +
//     sorunun zorluk katsayısı ve seviyesi (örn "3.2 (orta)").
//   • Yanlış cevap: kırmızı bant + beyaz çarpı (CSS çizim) + "Yanlış
//     cevap" + zorluk + "Profilinde ders istatistiklerinden bu soruyu
//     tekrar görebilirsin" bilgisi.
//   • /cevap route'u sonucu redirect'e ekler: ?sonuc=dogru|yanlis&z=KATSAYI
//   • Zorluk seviyesi metni zorluk raporundaki bantlarla aynı: 1.0-1.4
//     çok kolay, 1.5-2.4 kolay, 2.5-3.4 orta, 3.5-4.4 zor, 4.5-5.0 çok zor.
//   • Bant gösterildikten sonra URL parametreleri temizlenir — sayfa
//     yenilenince bant tekrar çıkmaz.
// --- VERSİYON 4.3.31 (Modüler Yapı) ---
// v4.3.31 değişiklikleri (kurum yöneticisi davet linki üretimi):
//   • Kurum yöneticisi (kurumsal rol) profil sayfasındaki "Davet linklerin"
//     bölümünden öğrenci / öğretmen / veli tipinde davet linki üretebilir.
//   • Tip seçici dropdown + "Üret" butonu. Sınırsız üretim — günlük tavan
//     veya otomatik yenileme yok, yönetici istediği kadar üretir.
//   • Üretilen linkler kurumsalın kendi listesinde tip etiketiyle görünür
//     (👨‍🎓 ÖĞRENCİ / 👩‍🏫 ÖĞRETMEN / 👪 VELİ).
//   • Yeni endpoint: POST /kurum/davet-uret (rolListesi'nde 'kurumsal'
//     olan kullanıcı için çalışır).
//   • Öğretmenlerin mevcut otomatik öğrenci kodu sistemi korundu — bu
//     özellik yalnızca kurumsal moda ek.
// --- VERSİYON 4.3.30 (Modüler Yapı) ---
// v4.3.30 değişiklikleri (admin: veli etiketi + referans tip düzeltme):
//   • Admin kullanıcı listesinde veli rolüne 👪 VELİ etiketi eklendi
//     (öğretmen ve yöneticide olduğu gibi). İsim yanında "👪 VELİ" rozeti,
//     sınıf hücresinde turuncu "VELİ" kısaltması.
//   • BUG FIX: Veli'nin ürettiği davet linki admin referans listesinde
//     yanlış "VELİ" etiketi gösteriyordu. tip='veli' kodu çift amaçlı —
//     admin üretirse veli kaydı, bir veli üretirse ÖĞRENCİ kaydı yaptırır.
//     Artık her referansa gercekTip hesaplanır: olusturan bir veli
//     kullanıcıysa etiket "👨‍🎓 ÖĞRENCİ" gösterilir.
// --- VERSİYON 4.3.29 (Modüler Yapı) ---
// v4.3.29 değişiklikleri (admin: filtreler ünitelerden beslenir):
//   • Soru filtreleme (soruListesi) ve Zorluk Raporu filtrelerinin
//     sınıf/ders/ünite/konu seçenekleri artık Soru koleksiyonu yerine
//     Unite koleksiyonundan üretilir. Kademeli: sınıf seçilince o sınıfın
//     dersleri, ders seçilince üniteleri, ünite seçilince konuları.
//   • Zorluk Raporuna kendi filtre formu eklendi (önceden "Sorular
//     sekmesinden filtrele" diyordu, artık sayfa içinde filtre var).
//   • /api/unite-bilgi artık 'siniflar' listesini de döndürür.
//   • PDF Yükle sayfası: sınıf ve ders dropdownları statik (1-12 / 6 ders)
//     yerine ünitelerden gelir. Akış: sınıf seç → dersler yüklenir →
//     ders seç → üniteler/konular yüklenir.
//   • Soru Ekle formu: sınıf dropdownı da ünitelerden gelir (ders zaten
//     öyleydi). editSoru'da kayıtlı sınıf seçili gelir.

const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// Session middleware
const session = require('express-session');
const MongoStore = require('connect-mongo');
app.use(session({
    secret: process.env.SESSION_SECRET || 'lgs-sistem-gizli-anahtar-degistir',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: dbURI, collectionName: 'sessions' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 gün
}));

// Kullanıcı oturum kontrolü middleware
function oturumKontrol(req, res, next) {
    if (!req.session || !req.session.kullaniciAdi) {
        return res.redirect('/');
    }
    next();
}
app.locals.oturumKontrol = oturumKontrol;

// v4.4.2: Toplam puan görüntüleme helper'ı — tüm EJS sayfalarında kullanılır.
// DB'de uzun ondalıklı saklanan puanları en fazla 4 basamak ondalıkla gösterir.
// Tam sayılarda ondalık kısım yazılmaz: 1920 → "1920", 1920.4500 → "1920.45",
// 1920.43215 → "1920.4322" (4 basamağa yuvarlanır).
// Kullanım: <%= puanFmt(k.puan) %> veya <%= puanFmt(o.puan) %>
app.locals.puanFmt = function(p) {
    if (p === null || p === undefined) return '0';
    const num = Number(p);
    if (isNaN(num)) return '0';
    // 4 basamağa yuvarla
    const yuvarlanmis = Math.round(num * 10000) / 10000;
    if (yuvarlanmis === Math.floor(yuvarlanmis)) return String(Math.floor(yuvarlanmis));
    return String(yuvarlanmis);
};

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/panel'));
app.use('/', require('./routes/admin'));
app.use('/', require('./routes/pdfyukle'));
app.use('/', require('./routes/takip'));

// Health check — loading.html bu endpoint'i izler
app.get('/health', (req, res) => res.json({ durum: 'hazir' }));

// Günlük cron job — her gün 05:10 (Europe/Istanbul)
const cron = require('node-cron');
const { gunlukHesapla } = require('./cronJobs');
cron.schedule('10 5 * * *', async () => {
    console.log('⏰ Cron tetiklendi (05:10 Istanbul):', new Date().toISOString());
    try {
        await gunlukHesapla();
    } catch (err) {
        console.error('❌ Cron çalıştırma hatası:', err && err.stack || err);
    }
}, { timezone: 'Europe/Istanbul' });

// Sunucu açıldıktan sonra: son hesaplama 24 saatten eskiyse otomatik tetikle
// (Render uyandırma / restart durumunda 05:10 kaçırıldıysa kurtarma)
const Kullanici = require('./models/Kullanici');
async function basladiktanSonraKontrol() {
    try {
        const sonHesap = await Kullanici.findOne({ siralamaCacheTarih: { $ne: null } })
            .sort({ siralamaCacheTarih: -1 })
            .select('siralamaCacheTarih')
            .lean();
        const simdi = new Date();
        const sonTarih = sonHesap && sonHesap.siralamaCacheTarih;
        const yas = sonTarih ? (simdi - new Date(sonTarih)) / 1000 / 60 / 60 : Infinity; // saat
        console.log('📅 Son hesaplama:', sonTarih ? new Date(sonTarih).toISOString() : 'hiç', '|', yas === Infinity ? 'ilk' : yas.toFixed(1) + ' saat önce');
        if (yas > 24) {
            console.log('⚠️ Son hesaplama 24 saatten eski — şimdi tetikleniyor');
            try { await gunlukHesapla(); } catch (e) { console.error('❌ Başlangıç hesaplama hatası:', e && e.stack || e); }
        }
    } catch (err) {
        console.error('❌ Başlangıç kontrol hatası:', err && err.message || err);
    }
}
// 30 sn gecikmeyle çalıştır — sunucu tamamen ayağa kalksın
setTimeout(basladiktanSonraKontrol, 30 * 1000);

// Manuel tetikleme (admin için)
// v4.1.24: önce session kontrolü; admin paneline girişli kullanıcı tekrar
// şifre sormadan butona basabilir. Session yoksa eski Basic Auth davranışı.
app.post('/admin/cron-tetikle', async (req, res) => {
    let yetkili = req.session && req.session.adminGirisli === true;
    if (!yetkili) {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) return res.status(401).send('Yetkisiz');
        const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
        if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASSWORD) return res.status(401).send('Yetkisiz');
        if (req.session) req.session.adminGirisli = true;
        yetkili = true;
    }
    try {
        await gunlukHesapla();
        // v4.3.61: Eskiden window.location.href="/admin" idi — kullanıcıyı her
        // zaman soru listesi sayfasına atıyordu. Şimdi frontend'den gelen
        // 'donus' alanı varsa oraya, yoksa /admin'e.
        const donus = (req.body && typeof req.body.donus === 'string' && req.body.donus.startsWith('/'))
            ? req.body.donus
            : '/admin';
        // basit JS-escape (tek tırnak ve newline)
        const donusJs = donus.replace(/'/g, "\\'").replace(/\n/g, '');
        res.send(`<script>alert("Hesaplama tamamlandı!"); window.location.href='${donusJs}';</script>`);
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// Ünite Excel şablonu indir
app.get('/unite-sablon-indir', (req, res) => {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const veri = [
        ['Sınıf', 'Ders', 'Ünite', 'Ünite Adı', 'Alt Konu'],
        [8, 'Matematik', '1. Ünite', 'Çarpanlar ve Katlar', 'Çarpanlar ve Katlar'],
        [null, null, null, null, 'Üslü İfadeler'],
        [8, 'Matematik', '2. Ünite', 'Cebirsel İfadeler', 'Cebirsel İfadeler'],
        [null, null, null, null, 'Denklemler'],
        [8, 'Fen Bilimleri', '1. Ünite', 'Mevsimler ve İklim', 'Mevsimlerin Oluşumu'],
        [null, null, null, null, 'İklim ve Hava Hareketleri'],
        [8, 'Türkçe', '1. Ünite', 'Sözcükte Anlam', 'Sözcükte Anlam'],
        [null, null, null, null, 'Cümlede Anlam'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(veri);
    ws['!cols'] = [{wch:8},{wch:18},{wch:12},{wch:30},{wch:35}];
    XLSX.utils.book_append_sheet(wb, ws, 'Ünite ve Konular');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="unite_konular_sablonu.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));
