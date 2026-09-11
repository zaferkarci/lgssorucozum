# v4.16.45 — Sınıf Atlatmada okul geçiş noktalarında okul bağını kes

## İstek
5., 9. sınıfa veya Mezun'a (13) geçen öğrencilerin okul ile bağı tamamen bitsin
(ilkokul->ortaokul, ortaokul->lise, lise->mezuniyet geçiş noktaları). Yeni okullarını
kendileri seçebilsinler.

## Çözüm — routes/admin.js (/admin/sinif-atlat)
- Yeni sınıfı 5, 9 veya 13 (Mezun) olan gruplar için (mevcut sınıf atlatma resetine ek
  olarak) `okul` ve `sube` alanları da boşaltılır (`''`). İl/ilçe DOKUNULMAZ (aynı
  şehir/ilçede kalırlar, sadece okul/şube seçimi sıfırlanır).
- `bagliKurumId` (kurumsal hesap bağlantısı) BİLİNÇLİ OLARAK DOKUNULMADI — bu ayrı ve
  daha büyük bir ilişki (kurumsal/onaylı hesap yönetimi), sınıf atlatmayla otomatik
  kesilmemeli.
- Kendi kendine okul seçme akışı zaten VARDI: panel.js `/profil/konum-guncelle` +
  panel.ejs "Konum bilgileri" kartı (İl/İlçe/Okul kademeli seçim, mevcut /api/okullar
  ucu). okul boşalınca kart otomatik "⚠️ Eksik" gösterir ve öğrenci kendi okulunu seçer
  — YENİ arayüz yazmaya gerek kalmadı.
- Kuru çalışma raporuna "Okul bağı" sütunu (Kesilecek/Korunur) ve özet sayısı eklendi;
  onay diyaloğuna da bu bilgi eklendi.

## %100 korunan
- Diğer tüm sınıf atlatma mantığı (puan/ders/oyun sıfırlama, Mezun sıralama hariç
  tutma), mevcut /profil/konum-guncelle akışı. Sadece okul/şube reset koşulu eklendi.

## Test
- node --check admin.js geçti.
- Gruplama simülasyonu: 4->5, 8->9, 12->Mezun için okulKesilecek=true; 5->6, 6->7,
  7->8, 11->12 için false — doğrulandı.
- admin.ejs (ayarlar modu) gerçek render testi geçti, Sınıf Atlatma linki sağlam.

## Değişen dosyalar
- routes/admin.js
- package.json (4.16.44 -> 4.16.45)

## Git
```bash
git add -A
git commit -m "v4.16.45: sinif atlatmada okul gecis noktalarinda (5/9/Mezun) okul bagini kes"
git push
git tag v4.16.45
git push origin v4.16.45
```
