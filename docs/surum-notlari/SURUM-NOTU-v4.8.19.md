# v4.8.19 — Analiz cevapları hedefe sayılmaz + "+1 soru" teklifi (TAM PROJE)

Çalışan TÜM proje. v4.8.18 üzerine kuruludur. Kural seti adım adım onaylandı.

## Kural (kilitlenen tasarım)
1. **Analiz cevapları hedef muhasebesine girmez.** Ne "Bugünkü hedefin" sayacına
   ne 30 günlük ortalamaya sayılır. Puan, soru istatistikleri, başarı yüzdeleri ve
   analiz ilerlemesi ("her konudan 2") NORMAL işler — yalnız hedef hesabı dışlar.
2. **Analiz sürerken hedef kartı tamamen gizli** (mini göstergeler ve kutlamalar
   dahil); analiz bitince ortaya çıkar.
3. **Analizin bittiği gün = ilk gün:** analiz cevapları sayılmadığı için öğrenci
   aynı gün temiz 0/2 hedefle serbest pratiğe geçer (önceki "aynı gün kilitlenme"
   davranışı böylece kalkar). İlk gün hedef min kuralıyla 2'dir.
4. **Hedef dolunca tek seferlik teklif:** "🎉 Bugünkü hedefini gerçekleştirdin!
   1 soru daha çözmek ister misin? Böylece hedefini her gün artırabilirsin."
   - ✅ Evet → tam 1 soru daha gelir; çözülünce "bugünlük bu kadar" kartı.
   - 🌙 Bugünlük bu kadar → kart hemen.
   - URL ile hile denenirse (ekstra=1 tekrar) kart gelir (sayaç kontrolü önce).
5. **Diğer günler:** hedef = max(2, floor(üyelikten-itibaren ortalama)+1); ortalamaya
   yalnız analiz-dışı cevaplar girer.

## Teknik
- `models/CevapKaydi.js`: yeni `analiz:Boolean` (varsayılan false) — yalnız EKLEME;
  mevcut alanlara/kayıtlara dokunulmaz, eski kayıtlar "analiz değil" sayılır.
- YENİ `services/analizDurumu.js` → `analizModundaMi(k)`: panel GET'teki analiz
  hesabının birebir aynası; /cevap kaydetmeden ÖNCE çağrıldığı için "analizi
  tamamlayan cevap" da doğru etiket alır.
- `routes/panel.js`: /cevap'ta etiketleme; analizde `gunlukHedefData=null` (kart
  gizleme); v4.8.12 sert durdurma → üç durumlu akış (teklif / +1 izni / kart);
  render'a `gunlukHedefEkstraSoru`.
- `services/gunlukHedef.js`: sorguya `analiz: { $ne: true }` dışlaması.
- `views/panel.ejs`: teklif kartı (hedef-dolu kartından önce); eski kutlama modalı
  teklif ekranında da susturuldu.

## Değişen / eklenen dosyalar (v4.8.18 tabanına göre)
- models/CevapKaydi.js, **YENİ** services/analizDurumu.js, services/gunlukHedef.js,
  routes/panel.js, views/panel.ejs, package.json (4.8.18 → 4.8.19)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Puanlama zinciri korunur.

## Test
- 5 JS `node --check` + panel.ejs EJS derleme geçti; EOL korundu (stray LF: 0).
- Akış simülasyonu (8 durum): analizde kart gizli/durdurma yok; 0/2 ve 1/2 normal;
  2/2 teklif; 2/2+ekstra=1 → +1 soru; 3/2 → kart; 3/2+ekstra=1 (hile) → kart;
  2/2+bitir=1 → kart. Hepsi doğru.
- Hedef sorgusunda analiz dışlaması grep ile doğrulandı.

## Önemli not (test kullanıcısı)
Etiket bundan sonraki cevaplara yazılır; bu haftaki test öğrencinin GEÇMİŞ analiz
cevapları etiketsiz olduğundan onun ortalaması şişik kalır. Testten önce o
kullanıcıyı silip yeniden açmak en temizi.

## Git
```bash
git add -A
git commit -m "v4.8.19: analiz cevaplari hedefe sayilmaz + hedef dolunca +1 soru teklifi"
git push
git tag v4.8.19
git push origin v4.8.19
```
