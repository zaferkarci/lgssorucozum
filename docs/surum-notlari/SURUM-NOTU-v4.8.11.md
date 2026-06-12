# v4.8.11 — Günlük hedef 30 günlük ortalamayı GEÇER (TAM PROJE)

Çalışan TÜM proje. v4.8.10 üzerine kuruludur.

## Ne değişti
Ders bazlı günlük hedef formülü, 30 günlük ortalamayı **kesinlikle geçecek** şekilde
güncellendi:
- **Önce:** `hedef = max(2, ceil(ortalama))` → tam sayı ortalamada eşit kalıyordu
  (ör. ortalama 2.0 → hedef 2, geçmiyordu).
- **Şimdi:** `hedef = max(2, floor(ortalama) + 1)` → her zaman ortalamanın üstünde.

Örnekler (ders bazında, son 30 gün ortalaması):
- ortalama 0 → hedef 2
- ortalama 1.0 → hedef 2
- ortalama 2.0 → hedef 3
- **ortalama 2.1 → hedef 3** (istenen örnek)
- ortalama 2.9 → hedef 3
- ortalama 3.0 → hedef 4

Min 2 kuralı korundu (düşük ortalamalarda hedef en az 2). Hedef her sayfa açılışında
30 günlük ortalamadan **canlı** hesaplandığı için, öğrenci ortalamasını artırdıkça hedef
de yükselir ve hep bir adım önde olur.

## Değişen dosyalar (v4.8.10 tabanına göre)
- services/gunlukHedef.js  (hedef formülü: ceil → floor+1)
- package.json             (4.8.10 → 4.8.11)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Not
Formül **ders bazında** çalışıyor (her dersin kendi 30 günlük ortalamasını geçer);
toplam "Bugünkü hedef" bunların toplamıdır — mevcut tasarım korundu. Tek dersli bir
öğrencide bu doğrudan "ortalamamı geçen tek hedef" demektir. Eğer "analiz bitmeden bu
hedef hiç gösterilmesin / sıfır olsun" gibi ek bir koşul istersen ayrıca ekleyebiliriz.

## Test
- services/gunlukHedef.js `node --check` geçti; CRLF korundu (stray LF: 0).
- Simülasyon: 0/0.5/1/1.5/2/2.1/2.9/3/4.3 ortalamalarının hepsinde hedef ortalamayı
  geçti (2.1→3, 2.0→3, 3.0→4).

## Git
```bash
git add -A
git commit -m "v4.8.11: gunluk hedef 30 gunluk ortalamayi gecsin (floor+1)"
git push
git tag v4.8.11
git push origin v4.8.11
```
