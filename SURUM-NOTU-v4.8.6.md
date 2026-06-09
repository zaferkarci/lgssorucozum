# v4.8.6 — Veli aktivite kartı yanlış öğrenciyi gösteriyordu (TAM PROJE)

Çalışan TÜM proje. v4.8.5 üzerine kuruludur.

## Sorun
Veli panelinde "Bugünün Aktivitesi" kartı, veliye ait olmayan bir öğrencinin
(örn. Tezcan velisi → çocuğu Kerem iken kartta "Ülkem"in) aktivitesini
gösterebiliyordu. Buna karşın aynı sayfadaki "Çocuklarım" listesi doğru
çocuğu (Kerem) listeliyordu — bu tutarsızlık hatanın ipucuydu.

## Kök neden
`TakipIliski.ogretmenAdi` alanı hem öğretmen hem veli için ortak "takipçi"
slotudur; veli/öğretmen ilişkileri `isteyenRol` ile ayrılır
('veli' / 'ogretmen' / 'ogrenci'). Veri akışında iki yer aynı ilişkiyi
okuyor ama farklı filtreliyordu:

- panel.js "Çocuklarım" (veliCocuklar): `isteyenRol: 'veli'` ile **filtreli** → doğru.
- `/takip/aktivite-bugun` endpoint'i: `{ ogretmenAdi, durum: 'kabul' }` —
  `isteyenRol` **filtresi YOK**. Bu yüzden veliyle aynı `ogretmenAdi` slotunu
  paylaşan, veliye ait olmayan (öğretmen/sınıf kaynaklı) bir ilişki de sonuca
  girip aktivite kartında yanlış öğrenci olarak görünüyordu.

## Düzeltme
`routes/takip.js` → `/takip/aktivite-bugun`: ilişki sorgusu rol'e göre
kapsamlandı. Veli için `isteyenRol: 'veli'` eklenir (panel.js'deki "Çocuklarım"
mantığıyla birebir aynı). Öğretmen/kurumsal yolu HİÇ değişmez.

Doğrulama (simülasyon): tezcan velisi için
- Eski (filtresiz): [kerem, ulkem]  ← hata
- Yeni (v4.8.6):    [kerem]          ← düzeldi

## Değişen dosyalar (v4.8.5 tabanına göre)
- routes/takip.js   (aktivite-bugun ilişki sorgusu rol'e göre kapsamlandı)
- package.json      (4.8.5 → 4.8.6)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Not — kontrol edilecek
Bu düzeltme, "Ülkem"in karta sızmasının sebebinin veliye ait OLMAYAN bir ilişki
(isteyenRol ≠ 'veli') olduğunu varsayar; "Çocuklarım" listesi yalnız Kerem'i
gösterdiğine göre durum budur. Eğer "Çocuklarım" listesinde de Ülkem görünüyorsa,
o zaman DB'de gerçekten (tezcan → ulkem, isteyenRol:'veli') bir kayıt var demektir;
bu durumda veli panelindeki "çocuğu kaldır" ile o ilişkiyi silmek gerekir (kod
değil, veri sorunu). Deploy sonrası veli panelinde hızlı bir göz at yeter.

## Test
- routes/takip.js `node --check` geçti; CRLF korundu (stray LF: 0).
- Filtre mantığı simülasyonla doğrulandı (yukarıda).

## Git
```bash
git add -A
git commit -m "v4.8.6: veli aktivite-bugun sorgusu isteyenRol veli ile kapsamlandi"
git push
git tag v4.8.6
git push origin v4.8.6
```
