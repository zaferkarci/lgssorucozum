# v4.7.3 — kutu düzenleme (boyutlandır + taşı)

Sadece **`views/gorselli-pdf-yukle.ejs`** değişti (+ package.json versiyon).
Sunucu/route/model el değmedi.

## Ne eklendi
Kırpma penceresinde kutuyu çizdikten sonra:
- **Köşelerden boyutlandırma** (4 köşe tutamacı).
- **Gövdeden sürükleyip taşıma** (kutunun ortasından tut-sürükle).
- Kutu sayfa sınırları içinde kalır; istediğin gibi olunca "Kes ve Yükle".

Artık yanlış çizince baştan çizmen gerekmiyor; düzeltebiliyorsun.

## Çekirdekte HÂLÂ olmayan (en riskli, isteğe bağlı)
- Gemini'nin önerdiği kutunun hazır gelmesi (otomatik kutu).
- Soru → sayfa otomatik eşleme.
Bunlar çıkarımı değiştirmeyi + Gemini koordinatlarını pdf.js ile hizalamayı
gerektirir (oynak kısım). İstersen ayrıca ele alırız.

## Kur
- `views/gorselli-pdf-yukle.ejs` ve `package.json`'ı repodakiyle değiştir, push.

## Git
```bash
git add -A
git commit -m "v4.7.3: kirpma kutusu duzenleme - kose boyutlandirma ve surukleme"
git push
git tag v4.7.3
git push origin v4.7.3
```
