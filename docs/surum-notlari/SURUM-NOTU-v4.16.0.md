# v4.16.0 — Ders/Ünite/Konu seçerek çözme + kolaydan zora sıralama (TAM PROJE)

Çalışan TÜM proje. v4.14.2 üzerine kuruludur.

## Özellik
Öğrenci, önerilen (en zayıf konu) kartını tercih etmezse, soru çözme ekranında
DERS → ÜNİTE → KONU seçerek çözüme devam edebilir. Seçenekler admin'in tanımladığı
Unite tablosundan (sınıf/ders/ünite/konu) gelir; yalnız çözülmemiş sorusu olan
ünite/konular gösterilir (yanlarında kalan soru sayısı).

- Ders seç → o dersin tüm çözülmemiş soruları
- Ders + Ünite → o ünite
- Ders + Ünite + Konu → o konu
Ünite ve konu opsiyoneldir ("Tüm üniteler" / "Tüm konular").

### Kolaydan zora sıralama
Manuel ders/ünite/konu seçimi aktifken, seçili kapsamdaki sorular ÇOK KOLAYDAN
ÇOK ZORA (zorluk katsayısı artan) sıralanır. Öğrenciye her zaman listenin ilk
(en kolay) çözülmemiş sorusu gösterildiğinden, ilerledikçe sorular zorlaşır.
Geçilen (atlanan) sorular yine en sona itilir.

### Hedef kuralı korunur
Seçim, mevcut günlük hedef akışına dokunmaz; hedef dolunca yine "+1 soru / bugünlük
bu kadar" ekranı çıkar. Yani seçim yalnız HANGİ soruların geleceğini daraltır,
hedef kuralı aynen işler.

## Teknik
- routes/panel.js:
  - Yeni filtreler: ?unite= ve ?konu= (mevcut ?ders= ile birlikte).
  - dersUniteKonuAgaci: Unite tablosundan (uniteNo sıralı) + çözülmemiş soru
    sayıları; yalnız sorusu olan düğümler. Filtrelerden ÖNCE, tam havuzdan sayılır.
  - Manuel seçimde (ders|unite|konu) saf zorluk-artan yeniden sıralama.
  - Boş-seçim yönlendirme koşuluna unite/konu eklendi.
- views/panel.ejs:
  - Ders grid'inin altına kademeli (Ders/Ünite/Konu) açılır menü seçici + Başla.
  - İstemci JS ünite/konu listelerini ağaçtan doldurur; sayıları gösterir.

## Değişen dosyalar (v4.14.2 tabanına göre)
- routes/panel.js
- views/panel.ejs
- package.json (4.14.2 -> 4.15.0)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- panel.js node --check; panel.ejs ejs.compile; istemci JS izole syntax — hepsi geçti.
- Satır sonları korundu (ikisi de CRLF).
- Kolaydan-zora sıralama birim testi: z1 -> z3 -> z5, geçilen soru en sonda,
  sorular[0] = en kolay taze soru.

## Git
```bash
git add -A
git commit -m "v4.16.0: ders unite konu secerek cozme + kolaydan zora siralama"
git push
git tag v4.16.0
git push origin v4.16.0
```
