# Sürüm Notu — v4.17.37-2 (13 Kasım 2026)

## Yeni: scripts/duello-analiz.js (yalnız okur)

Düellolarda "soruyu okumadan hızlı işaretleyip şans eseri doğru gelen kısa sürelerle kazanma" durumunu ölçer.
Veritabanında hiçbir şey değiştirmez. Öğrenci adları varsayılan olarak gizlidir (ogr1, ogr2…).

Kullanım (proje klasöründe):
- `node scripts/duello-analiz.js` — tüm düellolar
- `node scripts/duello-analiz.js --kullanici=ad` — yalnız bu kişinin düelloları (onun adı açık)
- `node scripts/duello-analiz.js --adlar` — tüm adlar açık
- `node scripts/duello-analiz.js --gun=30` — yalnız son 30 gün
- `--tumu` — şüpheli olmayan düelloları da listeler

Çıktı:
1. Şüpheli düellolar: kazananın süresi geçersizse (10 sn altı veya sorunun doğru cevap medyanının %25'inin altı) `!` ile işaretlenir.
   K1 = önerilen "geçerli süre" kuralıyla bu soru düelloya seçilmezdi; K2 = saldıranın o anki son 50 cevabında doğru oranı %40 altı, saldırı açılamazdı.
2. Oyuncu özeti: hücre, saldırı/savunma, şüpheli kazanım, son 50 cevapta doğru oranı, medyan süre, 5 sn altı oranı.
   Doğru oranı %40 altında ve cevaplarının yarısından fazlası 5 sn altında olanlar "HIZLI ISARETLEME" diye işaretlenir.

Oyun kurallarında henüz değişiklik yok; liste incelendikten sonra karar verilecek.
