# v4.17.18 — Harita temiz: sahip adı hover ile, "undefined" rumuz düzeltmesi

## Sorun
- Haritadaki isim etiketleri (`.lbl`) toprakların üstünü kapatıyordu; alınan alanlar görünmüyordu.
- Bazı rumuzlar "Gizemli undefined-11" gibi görünüyordu.

## Çözüm — routes/oyun.js
- Etiketler varsayılan KAPALI. Yön tuşlarının altına "🏷 Isimleri goster/gizle" düğmesi eklendi (`ETK`).
- Hücrelerdeki yerel `title` yerine `data-t` / `data-r` / `data-s`; anında açılan özel hover kutusu (`.tip`):
  sahip rumuzu + renk noktası, kendi hücrende "(sen)", düello hücresinde "⚔ Duello: …",
  kilitli / fetih bekleyen / sıçrama hücrelerinde açıklama. Metin `textNode` ile basılır (HTML yorumlanmaz).
- Hover edilen oyuncunun görünür tüm hücreleri vurgulanır (`.hc.dolu.vurgu`).
- Dokunmatik: hücreye dokununca kutu 2 sn görünür.
- `rumuzUret`: `(h >> 3)` → `(h >>> 3)`. İşaretli kaydırma h ≥ 2^31 iken negatif indeks veriyordu.
  h < 2^31 için sonuç aynı; düzgün rumuzlar değişmez.
- `rumuzGoster()`: eski "undefined" kayıtlar /veri, /siralama ve düello yanıtında düzeltilmiş gösterilir;
  `oyuncuGetir()` oyuncu girdiğinde kaydı kalıcı düzeltir.

## Test
- `node --check` geçti; satır sonları (CRLF) korundu.
- Örnek veriyle Chromium'da: etiket 0, yerel title 0, hover kutusu doğru rumuzu gösteriyor,
  aynı sahibin 6 hücresi vurgulanıyor, düğme etiketleri açıp kapatıyor, konsol hatası yok.

## Değişen dosyalar
- routes/oyun.js
- package.json (4.17.17 -> 4.17.18)

## Sürüm adlandırma (bu sürümden itibaren)
- Günün ilk güncellemesi: tam paket, normal semver (`vX.Y.Z`, `lgssorucozum-vX.Y.Z-tam.zip`).
- Aynı gün sonraki güncellemeler: `vX.Y.Z-1`, `-2`… yalnız değişen dosyalar, klasör yapısıyla
  (`lgssorucozum-vX.Y.Z-N-degisenler.zip`).
- `-N` eki yalnız zip adında, sürüm notu dosya adında ve commit mesajında kullanılır.
  `package.json` "version" günün semver'inde kalır (ara güncellemede dokunulmaz).
