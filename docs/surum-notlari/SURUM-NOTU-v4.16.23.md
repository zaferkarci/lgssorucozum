# v4.16.23 — Üniteler: 4 seviye ↑/↓ sıralama (ünite/konu/çıktı/süreç)

Üniteler sekmesinde her şey yukarı/aşağı taşınabilir.

## Yapılanlar

### Ünite (tema) sırası
- models/Unite.js: additive `sira: { type: Number, default: 0 }` alanı.
- routes/admin.js: liste sıralaması `{ ders:1, sira:1, uniteNo:1 }` (sira=0 iken
  uniteNo'ya düşer → MEVCUT SIRA KORUNUR; reorder edilince sira devreye girer).
- routes/admin.js: yeni `/unite-sirala` ucu — aynı ders içinde komşu üniteyle yer
  değiştirir, gruba sira=0,1,2... yazar (kararlı toplam sıra).
- views/admin.ejs: kayıtlı üniteler tablosunda her ünitenin İşlem hücresinde ↑/↓.

### Konu / öğrenme çıktısı / süreç bileşeni sırası
- views/admin.ejs (kEd_ editörü): konu, çıktı ve süreç satırlarına ↑/↓ butonları +
  kEdMoveKonu/kEdMoveCikti/kEdMoveSurec fonksiyonları (dizi içinde yer değiştir +
  yeniden render). Kaydedince konuYapisi JSON sırası korunur → SUNUCU DEĞİŞMEDİ.

## Sonuç
- Konu sırası: filtre dropdownlarında, Üniteler tablosunda, soru servis sırasında
  yansır (hepsi konular dizisini sırasıyla okur).
- Çıktı/süreç sırası: konuDetay içinde saklanır, tabloda ve editörde o sırayla görünür.
- Ünite sırası: ders içinde sira'ya göre.

## %100 korunan
- sira additive (eski üniteler sira=0 → davranış aynı, uniteNo tiebreaker).
- Editör ekle/sil/restore, /unite-ekle, /unite-guncelle (konuYapisi zaten sıra korur),
  soru servisi, cevap/istatistik, mevcut veri, satır sonları (admin.js LF, admin.ejs +
  Unite.js CRLF).

## Değişen dosyalar
- models/Unite.js (sira)
- routes/admin.js (sort + /unite-sirala)
- views/admin.ejs (editör ↑/↓ + tablo ünite ↑/↓)
- package.json (4.16.22 -> 4.16.23)

## Test
- node --check admin.js + Unite.js geçti. admin.ejs ejs.compile ile derlendi.
- Editör: konu/çıktı/süreç ↑/↓ butonları render oluyor; kEdMoveSurec swap doğrulandı.
- /unite-sirala swap + sınır (en üst/en alt no-op) simüle edildi. CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.23: Uniteler 4 seviye yukari/asagi siralama (unite/konu/cikti/surec)"
git push
git tag v4.16.23
git push origin v4.16.23
```
