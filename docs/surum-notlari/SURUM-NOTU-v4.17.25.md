# v4.17.25 — Yönetici "Kullanıcı Detay" sayfasına "Soruyu Gör" (yanlış cevap KIRMIZI, doğru YEŞİL) + sayfa düzeni düzeltmesi

> Tam paket. v4.17.24-1 … v4.17.24-5'in tüm değişikliklerini içerir; `package.json` **4.17.25**.

## Sorun
- Yönetici panelindeki **Kullanıcılar > Detay** sayfasında (`/kullanici-detay`) "Son Çözülen Sorular" tablosunda **"Soruyu Gör"
  düğmesi hiç yoktu**; kırmızı/yeşil işaretleme bu sayfaya hiç eklenmemişti (yalnız öğretmen/veli/kurum öğrenci sayfasına ve
  v4.17.24-5 ile öğrencinin kendi paneline eklenmişti).
- Aynı sayfada eski bir HTML hatası vardı: "Rolü Değiştir" kartının kapanışı eksikti. Bu yüzden sağ sütun (istatistikler ve
  çözülen sorular) sol 340 px'lik sütunun içine düşüyor, tablo daralıp sağdaki sütunlar ancak yatay kaydırmayla görünüyordu.

## Ne değişti
- **views/admin-kullanici-detay.ejs**
  - Tabloya her satırda **"Soruyu Gör"** düğmesi eklendi.
  - Pencere öğretmen/veli/kurum sayfasındakiyle aynı: öğrencinin yanlış seçtiği şık **kırmızı** ("✗ Öğrencinin cevabı"),
    doğru şık **yeşil** ("✓ Doğru"); altında "Öğrencinin cevabı: A şıkkı" ve "Doğru cevap: C şıkkı" satırları. Doğru
    çözülmüşse "✓ Doğru · Öğrencinin cevabı". Matematik ifadeleri MathJax ile çizilir.
  - Eksik `</div>` eklendi: sayfa yeniden iki sütun (solda bilgiler/formlar, sağda istatistikler + çözülen sorular).
  - Sonuç rozeti satır kırmadan görünür.
- **routes/admin.js** (`GET /kullanici-detay`): pencere için soru içeriği (metin, öncüller, görseller, şıklar, doğru şık)
  de okunur. Yetki aynı (yalnız yönetici).

## Kırmızı işaret nerelerde var (özet)
| Kim | Sayfa | Sürüm |
|---|---|---|
| Öğretmen, veli, kurum yöneticisi | Takip > öğrenci sayfası > Çözülen Sorular > Soruyu Gör | v4.17.24 |
| Öğrenci | Profilim > Ders İstatistikleri > Çözülen Sorular > Soruyu Gör | v4.17.24-5 |
| Yönetici | Kullanıcılar > Detay > Son Çözülen Sorular > Soruyu Gör | v4.17.25 |

## Önemli: eski kayıtlar
- Seçilen şık **v4.17.24 sunucuya yüklendikten sonra** kaydedilmeye başladı. Daha önce çözülen yanlışlarda seçilen şık bilinmez;
  o satırlarda yalnız doğru şık yeşil + gri not ("…kaydedilmemiş (eski kayıt)") görünür.

## Test (yerel demo, gerçek tarayıcı)
- Öğrenci gerçek `POST /cevap` ile cevap verdi: yanlış A, doğru D, yanlış D + 1 eski (şıksız) yanlış.
- Yönetici detay sayfası: 4 satırda 4 "Soruyu Gör"; yanlış A → A kırmızı + C yeşil; doğru D → D yeşil "Doğru · Öğrencinin
  cevabı"; yanlış D → D kırmızı + B yeşil; eski kayıt → yalnız yeşil + gri not. Sayfa iki sütun, tablo kaydırmasız sığıyor.
  Sayfa hatası yok.
- Öğrenci, veli, öğretmen, kurum yöneticisi pencereleri aynı sonuçları verdi (v4.17.24-5 testi tekrarlandı).

## Değişen dosyalar (v4.17.24-5'e göre)
- routes/admin.js
- views/admin-kullanici-detay.ejs
- package.json (4.17.25)
- docs/surum-notlari/SURUM-NOTU-v4.17.25.md
