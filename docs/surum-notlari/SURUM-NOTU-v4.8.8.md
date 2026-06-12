# v4.8.8 — Soru çözüm akışı: konu geçiş kapısı (mastery gate) + geçilmiş soru puan tavanı (TAM PROJE)

Çalışan TÜM proje. v4.8.7 üzerine kuruludur. Tasarım adım adım onaylandı.

## Yeni akış (kilitlenen tasarım)
- Açık konular ünite/konu sırasına dizilir; konu içinde sorular **kolaydan zora** gelir
  (mevcut sıralama). Çözülen = 0 olan öğrenci **1. ünite / 1. konu**'dan başlar.
- **Geçiş kapısı:** Bir **(ders, konu)** konusunda **en az min(3, o konudaki yayında soru
  sayısı)** soru cevaplanmış VE **başarı ≥ %66** ise konu "geçildi" sayılır; o konunun
  kalan **normal** soruları havuzdan çıkar, sıradaki konuya geçilir. Ölçüt, konu
  kartındaki ile **aynı kümülatif yüzde** (doğru/toplam) — pencere yok.
- **%66 tutmazsa:** konu budanmaz; sıralı akışta o konunun soruları gelmeye devam eder.
  Sorular bitip hâlâ < %66 ise (çözülmüş tekrar sorulmaz) öğrenci doğal olarak sonraki
  konuya geçer; sen o konuya **yeni soru ekledikçe** onlar gelir ve yüzde yükselebilir.
- **Geçilmiş (skip) sorular muaftır:** Konu geçilse bile geçilmiş sorular **budanmaz**,
  konunun sonunda bekler. Çözülüp **yanlış** olursa kümülatif yüzde %66 altına düşer ve
  konu **yeniden açılır** (normal soruları tekrar gelmeye başlar).

## Geçilmiş soru puan tavanı (düzeltme)
Önceki kod sınırsız `1/5^geçişSayısı` uyguluyordu (asla 0 olmuyordu) ve koddaki eski
yorum bununla çelişiyordu. Tarife göre **tavan** eklendi:
- 2. çözüm (geçişSayısı=1): puan **/5** (1/5)
- 3. çözüm (geçişSayısı=2): puan **/25** (1/25)
- 4. ve sonrası (geçişSayısı≥3): **0**
Geçilmiş sorunun sona itilmesi ve istatistiklere katılmaması (ikinciKezMi) aynen korunur.

## Sabit kurallar
- Yalnızca **açık** konular (KonuIzin) ve **gerçek öğrenciler**; öğretmen/kurumsal/
  moderatör/demo tüm soruları görmeye devam eder.
- **Skip** cevap üretmez → başarı yüzdesini etkilemez; geçilmiş soru sonunda çözülünce
  (düşük/0 puanla bile) doğru/yanlışı yüzdeye sayılır (kartla tutarlı).
- İlerleme **CevapKaydı'ndan anlık** hesaplanır (ayrı tablo yok → senkron-bug yok);
  her cevaptan sonra panel yeniden hesaplandığı için **zayıf konu kartları da canlı**
  güncellenir. Mevcut öğrenciler geçmiş cevaplarıyla "ilk geçilmemiş konu"dan devam eder.
- Konuda 0 soru → atlanır; 1–2 soruluk konuda eşik = var olanların hepsi + ≥ %66.
- **Puanlama/cevap zincirinin geri kalanına dokunulmadı** (Z/hız/GE formülü aynı).

## Değişen dosyalar (v4.8.7 tabanına göre)
- routes/panel.js   (soru havuzuna mastery gate; geçilmiş soru puan tavanı)
- package.json      (4.8.7 → 4.8.8)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Çekirdek modeller değişmedi.

## Test
- routes/panel.js `node --check` geçti; CRLF korundu (stray LF: 0).
- Simülasyon — Gate: konu %66 ile geçilince normal kalan soru budandı, geçilmiş soru
  muaf kaldı (havuz: [skip-soru, sonraki-konu]). Puan tavanı: 1/5, 1/25, 0, 0 — doğru.

## Git
```bash
git add -A
git commit -m "v4.8.8: mastery gate (gecilen konu budama, skip muaf) + gecilmis soru puan tavani"
git push
git tag v4.8.8
git push origin v4.8.8
```
