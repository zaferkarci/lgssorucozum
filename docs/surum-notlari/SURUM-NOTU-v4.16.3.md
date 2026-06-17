# v4.16.3 — Demo kullanıcıya soru numarası gösterimi (TAM PROJE)

Çalışan TÜM proje. v4.16.2 üzerine kuruludur. Yalnız demo'ya özel küçük ekleme.

## Değişiklik
Demo kullanıcı (k.rol === 'demo') soru çözerken, sorunun ÜST etiket barında
admin "Sorular" sekmesindeki SORU NUMARASINI ("Soru No: X") görür. Mor renkli
küçük bir rozet olarak, yalnız demo'ya; gerçek öğrenci/öğretmen/moderatör bunu
GÖRMEZ.

- Soru numarası soru dokümanındaki soruNo alanindan gelir (zaten yukleniyordu).
- Gate: k.rol === 'demo' && soru.soruNo. Numarasi olmayan soruda rozet cikmaz.
- Yalniz ogrenci/demo soru bari (block2) etkilendi; ogretmen ornek-soru bari
  degismedi.

## Değişen dosyalar (v4.16.2 tabanına göre)
- views/panel.ejs   (demo soruNo rozeti, soru etiket barina)
- package.json      (4.16.2 -> 4.16.3)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- panel.ejs ejs.compile geçti. Rozet 1 kez (yalniz block2). Satir sonu korundu (CRLF).

## Git
```bash
git add -A
git commit -m "v4.16.3: demo kullaniciya soru numarasi gosterimi"
git push
git tag v4.16.3
git push origin v4.16.3
```
