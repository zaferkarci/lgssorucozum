# Sürüm Notu — v4.17.37-1 (13 Kasım 2026)

## Düzeltme: "Büyüt" görseli büyütmüyordu

**Şikâyet:** Soru görseline veya "🔍 Büyüt" düğmesine basınca açılan pencerede görsel aynı boyutta kalıyordu.

**Sebep:** Büyütme penceresi görseli yalnızca kendi piksel boyutuna kadar gösteriyordu (`max-width:96vw`).
Telefonda soru görseli zaten ekran genişliğinde olduğu için pencerede de aynı boyutta görünüyordu; küçük görseller hiç büyümüyordu.

**Yeni davranış (public/js/gorsel-buyut.js):**
- Pencere açılınca görsel ekranı dolduracak kadar büyütülür (küçük görseller de).
- Telefonda geniş/basık görseller (ekrana sığdırınca yine küçük kalanlar) doğrudan 2 kata kadar büyük açılır, yana kaydırılarak okunur.
- Görsele dokununca 2,5 kat yakınlaşır (dokunulan yer parmağın altında kalır), tekrar dokununca ekrana sığar.
- Sol üstte **−** / **+** düğmeleri: 1x–5x arası.
- **✕ Kapat**, boş alana dokunmak ve Esc ile kapanma aynen sürüyor. Alt yazı güncellendi.
- Şıklardaki görsel büyütme düğmesi cevap vermez (değişmedi); demo testinde büyütme sırasında hiçbir cevap gönderilmedi.

**Demo testi (390×844 telefon):**
| Görsel | Sayfada | Eski pencere | Yeni pencere açılış | Dokununca |
|---|---|---|---|---|
| Geniş 2048×761 | 338×126 | ≈338×126 | 716×266 (yana kaydırılır) | 358×133 (sığdır) ↔ 2,5x |
| Küçük 206×211 | 206×211 | 206×211 | 358×367 | 895×917 |

Yalnız istemci tarafı JS değişti; veritabanı ve puanlama etkilenmez. Kullanıcılar sayfayı yenilemeli (Ctrl+F5 / telefonda sayfayı yeniden yükle).
