# Sürüm Notu — v4.17.37-2 (13 Kasım 2026)

## Düello adaleti: şans eseri kısa süreler ve okumadan işaretleme

**Sorun:** Düello, iki tarafın da doğru çözdüğü ortak bir soruda kısa süreyi kazandırıyordu. Soruları okumadan
1–5 sn'de işaretleyen öğrenci, şans eseri doğru gelen 2 sn'lik cevaplarla hem saldırıda hem savunmada neredeyse
hiç kaybetmiyordu (canlı analiz: 353 düellonun 105'i şans eseri süreyle kazanılmış; bir oyuncu 70 cevapla 31 hücre).

**Yeni kurallar** (tek kaynak: `services/duelloKural.js`):
1. **Geçerli süre:** Düelloda yalnız süresi en az 5 sn **ve** sorunun doğru çözüm süresi ortancasının %25'i kadar olan doğrular sayılır.
   - Saldıranın daha kısa doğruları düello sorusu olamaz. Bu yüzden ortak geçerli soru kalmazsa düello açılmaz ve saldırı hakkı harcanmaz.
   - Savunanın o sorudaki doğruları hep böyle kısaysa **saldıran kazanır**; şans eseri cevap toprağı korumaz.
     Sonuç penceresinde "Rakibin 3 sn'lik cevabı çok kısa olduğu için (şans eseri) sayılmadı" yazar.
2. **Hızlı işaretleme:** Saldıranın son 50 cevabında doğru oranı %40'ın altında **ve** cevaplarının en az %25'i 5 sn'den kısaysa saldırı açılamaz.
   Öğrenciye nedeni yazılır. Zayıf ama dikkatle çözen (yavaş cevaplayan) öğrenci etkilenmez. 10'dan az cevabı olan değerlendirilmez.
3. **Kayıt:** Düello kayıtlarına artık hücre konumu (x, y) ve "rakip süresi sayılmadı" bilgisi de yazılır.

Oyundaki **Kurallar** penceresine iki yeni madde eklendi.

## Admin › İçerik › 🔍 Düello Analizi (yeni menü)
- Özet kutuları: toplam düello, şans eseri süreyle kazanılan (K1), hızlı işaretlerken açılan (K2), yeni kurallarla değişecek.
- Oyuncu özeti: hücre, saldırı/savunma, şans eseri kazanım, son 50 cevap (doğru oranı, ortanca süre, 5 sn altı oranı), saldırı durumu (⛔ Kapalı / ✓ Açık).
  Ada tıklayınca yalnız o oyuncunun düelloları listelenir.
- Şüpheli düellolar tablosu (en yeni üstte, en fazla 300): eşik altı süreler kırmızı, soru önizleme düğmesi.
- Filtreler: dönem (7/30/90 gün / tümü), oyuncu, şüpheli olmayanları da göster.

`scripts/duello-analiz.js` aynı analizi komut satırında yapar (adlar gizli; `--adlar`, `--kullanici=`, `--gun=`, `--tumu`).

## Değişen dosyalar
- services/duelloKural.js (yeni)
- routes/oyun.js — düello kuralları, sonuç penceresi notu, kurallar metni
- routes/admin.js, views/admin.ejs — Düello Analizi menüsü ve sayfası
- models/DuelloKayit.js — x, y, rakipGecersiz alanları
- scripts/duello-analiz.js — servisi kullanacak şekilde yenilendi

Puan formülü değişmedi. Geçmiş hücrelere dokunulmadı; şans eseri savunma artık korumadığı için diğer oyuncular bu hücreleri düelloyla geri alabilir.
