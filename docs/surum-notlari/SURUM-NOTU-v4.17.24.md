# v4.17.24 — Öğretmen "Soruyu Gör": öğrencinin yanlış cevabı KIRMIZI, doğru şık YEŞİL

> Tam paket. v4.17.23-1'in tüm değişikliklerini de içerir.

## Ne değişti
- Öğretmenin (ve yönetici görünümünün) öğrenci sayfasındaki **Çözülen Sorular > Soruyu Gör** penceresinde, öğrenci soruyu **yanlış**
  yaptıysa **seçtiği şık kırmızı** gösterilir: kırmızı çerçeve/zemin, kırmızı harf kutusu ve "✗ Öğrencinin cevabı" etiketi.
  **Doğru şık yeşil olarak gösterilmeye devam eder** ("✓ Doğru").
- Altında iki özet satırı: kırmızı "✗ Öğrencinin cevabı: B şıkkı" ve yeşil "✓ Doğru cevap: C şıkkı".
- Doğru yapılan soruda doğru şıkkın etiketi "✓ Doğru · Öğrencinin cevabı" olur.
- Renk tek başına anlam taşımaz: kırmızı şıkta ve özet satırında yazılı etiket de vardır.
- Aynı soru birden çok kez çözülmüş olabilir; her satır **kendi cevabını** gösterir (pencere o satırın kaydına göre açılır).

## Önemli: eski kayıtlar
- Bu sürüme kadar sistem öğrencinin **hangi şıkkı seçtiğini kaydetmiyordu**, yalnızca doğru/yanlış sonucunu. Bu yüzden **eski yanlış
  cevaplarda seçilen şık bilinemez**; o satırlarda yalnızca doğru şık yeşil görünür ve gri bir not çıkar:
  "Öğrencinin seçtiği şık bu cevap için kaydedilmemiş (eski kayıt)".
- **Yüklemeden sonra çözülen** her cevapta seçilen şık kaydedilir ve kırmızı görünür.

## Teknik — models/CevapKaydi.js, routes/panel.js, views/takip-ogrenci-detay.ejs
- `CevapKaydi.secilenIndex` (Number, 0=A … 3=D, varsayılan null). Eski kayıtlara dokunulmaz; gece cron'u yalnız `kazanilanPuan`'ı
  güncellediği için alan korunur.
- `POST /cevap`: gönderilen `secilenIndex` geçerli aralıktaysa kaydedilir, değilse null. Puan/zorluk/sıralama hesapları değişmedi.
- Soru penceresi `soruGoster(id, secilen, dogruMu)`: "Soruyu Gör" düğmesi satırın seçimini ve sonucunu iletir.
- Öğrencinin kendi panelindeki soru listesi (views/panel.ejs) bu sürümde **değişmedi**.

## Test (yerel demo)
- Öğrenci 4 cevap gönderdi: yanlış B, doğru B, yanlış D, geçersiz indeks (9). Kayıtlar: secilenIndex = 1, 1, 3, null.
- Öğretmen penceresi (gerçek tarayıcı): yanlış B → B kırmızı + C yeşil; yanlış D → D kırmızı + C yeşil; doğru B → B yeşil
  "Doğru · Öğrencinin cevabı"; geçersiz/eski kayıt → yalnız yeşil doğru şık + gri not. Sayfada JS hatası yok.
- Eski (şıksız) doğru ve yanlış kayıtlar eskisi gibi açılıyor.

## Değişen dosyalar
- models/CevapKaydi.js, routes/panel.js, views/takip-ogrenci-detay.ejs, package.json (4.17.24)
- docs/surum-notlari/SURUM-NOTU-v4.17.24.md (yeni)
