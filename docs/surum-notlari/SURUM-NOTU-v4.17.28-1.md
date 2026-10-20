# v4.17.28-1 — Görselli PDF Yükle: Ünite ve Konu açılır listeden (Üniteler kartlarından)

> Ara güncelleme, v4.17.28'in üstüne. `package.json` değişmedi (4.17.28).

## Ne değişti — views/gorselli-pdf-yukle.ejs
- Üst form yeni düzende: **Sınıf** ve **Ders** bir satırda; **Ünite** ve **Konu** ayrı satırlarda açılır liste.
- Ünite ve konular **her zaman Üniteler kartlarından** (Admin › Üniteler, `/api/unite-bilgi`) gelir; serbest metin yok.
  - Ünite listesi seçili sınıf + derse göre dolar ("1. Çarpanlar ve Katlar" gibi). Sınıf veya ders değişince yenilenir.
  - Konu listesi seçilen ünitenin konularıdır; ünite seçilmeden konu seçilemez.
  - O sınıf ve ders için ünite kartı yoksa: "Bu sınıf ve ders için ünite kartı yok (Admin › Üniteler)".
- Ünite/konu seçilirse PDF'ten çıkan **bütün sorulara atanır**; yapay zekânın tahmini bunları değiştirmez.
  - Yalnız ünite seçilirse: yapay zekânın konu tahmini **yalnız o ünitenin konuları** içinde eşleştirilir; eşleşmezse
    soru kartında konu seçilmeyi bekler.
  - Hiçbiri seçilmezse eskisi gibi yapay zekâ her soru için önerir.
- Soru kartlarındaki ünite/konu seçimi aynen duruyor; her soru yine tek tek değiştirilebilir.
- Sunucu tarafı (`/pdf-analiz`, `/pdf-sorulari-kaydet`) değişmedi; seçilen ünite/konu eskisi gibi analize de gönderilir.

## Test (yerel demo)
- 8. sınıf Matematik: 4 ünite listelendi; "1. Çarpanlar ve Katlar" seçilince konular "Çarpanlar ve Katlar", "EBOB ve EKOK".
  Türkçe'ye geçince liste yenilendi; 12. sınıfta "ünite kartı yok" çıktı.
- Ünite + konu seçilip analiz edildi (yapay zekâ yanıtı taklit edildi): iki soruya da aynı ünite/konu atandı, soru
  kartlarında seçili göründü.
- Yalnız ünite seçildi: konusu ünitede olan soru otomatik eşleşti ("EBOB ve EKOK"), olmayan soru konu seçimini bekledi.
- Sayfada hata yok.

## Değişen dosyalar
- views/gorselli-pdf-yukle.ejs
- docs/surum-notlari/SURUM-NOTU-v4.17.28-1.md
