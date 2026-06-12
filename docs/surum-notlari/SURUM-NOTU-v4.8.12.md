# v4.8.12 — Günlük hedef: üyelikten itibaren ortalama + hedef dolunca bitir (TAM PROJE)

Çalışan TÜM proje. v4.8.11 üzerine kuruludur.

## 1) Hedef her ders için ayrı (korundu)
Hedef zaten **ders bazında** hesaplanıyor: her dersin kendi 30 günlük ortalaması →
`max(2, floor(ortalama)+1)`. Toplam "Bugünkü hedef" bunların toplamıdır. Değişmedi.

## 2) Ortalama artık ÜYELİK tarihinden itibaren
Önce ortalama her zaman 30'a bölünüyordu; yeni üyeler haksızca düşük ortalama
(ve hep min 2 hedef) alıyordu. Artık **bölen = min(30, üyelikten geçen gün)**:
- Yeni üye (5 gün, 15 soru): 15/5 = 3 → hedef 4 (eskiden 15/30=0.5 → hedef 2 idi).
- Köklü üye (≥30 gün): 30 günlük pencere aynen sürer (ör. son30=63 → 2.1 → hedef 3).
Üyelik tarihi kullanıcı `_id`'sinin oluşturulma zamanından alınır (modelde ayrı alan yok).

> Not: ≥30 günlük üyelerde davranış "son 30 gün" olarak kalır (responsive). Eğer
> herkes için **ömür boyu** ortalama (üyelikten bugüne tüm sorular / tüm günler)
> istersen söyle, bölmeyi öyle değiştiririm.

## 3) Günlük hedef dolunca soru çözümü biter + bilgilendirme kartı
Öğrenci günlük hedefini tamamlayınca (tüm derslerin hedefi tutunca = `toplamTamamlandi`),
**analiz bitmiş** durumdaysa ve soru-çöz akışındaysa, o gün için soru sunumu durur ve
şu kart gösterilir:
> 🎯 **Bugünkü hedefini tamamladın!** Günlük hedefini tuttun, bugünlük bu kadar. Daha
> çok soru çözmek için **her gün yeniden gel** ve hedefini zamanla yükselt.
> 📌 Yeni sorular seni bekliyor olacak!

Bununla çelişen eski "Devam et / Dinlen" modalı bu durumda **bastırıldı** (artık "bitir"
mesajıyla tutarlı). Ertesi gün (bugünCozulen sıfırlanır) hedef yeniden açılır, sorular gelir.
Analiz devam ederken bu durdurma uygulanmaz (zorunlu analiz önce biter).

## Varsayım (aksini istersen değiştiririm)
"Hedefi gerçekleştirme" = `toplamTamamlandi` (her dersin günlük hedefi tutuldu) —
mevcut "✓ Bugünkü hedefini tamamladın!" göstergesiyle aynı ölçüt. İstersen "toplam
çubuk dolunca" (toplamBugün ≥ toplamHedef, ders dağılımı fark etmez) yapabiliriz.

## Değişen dosyalar (v4.8.11 tabanına göre)
- services/gunlukHedef.js  (bölen: üyelikten itibaren; Kullanici require)
- routes/panel.js          (hedef dolunca sorular=[] + gunlukHedefDolduMu; render local)
- views/panel.ejs          (hedef-dolu kartı; çelişen modal bastırıldı)
- package.json             (4.8.11 → 4.8.12)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Puanlama ve analiz akışı korundu.

## Test
- 3 dosya `node --check` / EJS derleme geçti; CRLF korundu (stray LF: 0).
- Bölen simülasyonu: yeni üye 15/5=3→hedef 4; eski üye 30 pencere (son30=63→2.1→hedef 3);
  yeni üye 0 soru → hedef 2. Hepsi doğru.

## Git
```bash
git add -A
git commit -m "v4.8.12: uyelikten itibaren ortalama + gunluk hedef dolunca bitir + kart"
git push
git tag v4.8.12
git push origin v4.8.12
```
