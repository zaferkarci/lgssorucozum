# v4.17.27-3 — Soru zorluk/puan inceleme komutu (yalnız okur)

> Ara güncelleme. Uygulamanın çalışmasına dokunmaz; yalnız `scripts/soru-incele.js` eklenir. `package.json` değişmedi.

## Ne işe yarar
Bir veya birkaç sorunun zorluk (Z) ve ham puan (HP) hesabını bütün ham verisiyle gösterir. Veritabanında hiçbir şey
değiştirmez.

```
cd ~/lgssorucozum
node scripts/soru-incele.js 220 226            # öğrenci adları "ogr1, ogr2…" diye gizlenir
node scripts/soru-incele.js 220 226 --adlar    # adlarla
```

## Gösterdikleri
1. Sorunun kayıtlı alanları: çözülme, doğru, ortalama süre, Z, HP.
2. Bütün cevap kayıtları: tarih (TR), öğrenci, doğru/yanlış, süre, kazanılan puan; notlar: `2.kez` (geçilip tekrar
   çözülmüş, soru istatistiğine girmez), `analiz`, `<=2sn`, `>5dk`, `>10dk`.
3. Süre dağılımı: en kısa, medyan, en uzun, ortalama; 1–2 sn ve 5/10 dk üstü cevap sayıları.
4. Z'nin yeniden hesabı ve bileşenleri: doğruluk → D, süre kademeleri → S (kademe dağılımıyla), doğru sürelerin sapması → σn.
5. HP'nin yeniden hesabı: T_ref, bütün sürelerin sapması, GE (tavanda mı), ortalama hız bileşeni.
6. Kayıtlı puanlar formülle aynı mı; farklıysa hangi kayıtlar (silinmiş kullanıcı, sınıf atlatma öncesi kayıt veya gece
   hesabından sonra eklenen cevap olabilir).

## Test (yerel demo)
- Gece hesabı (cronJobs.js) çalıştırıldıktan sonra komutun yeniden hesapladığı Z ve HP kayıtlı değerlerle birebir aynı çıktı
  (Z=2, HP=5,5579; "Kayıtlı puanların hepsi formülle aynı").
- 620 cevaplı bir soruya biri 900 sn (sayfa açık kalmış), biri 1 sn olan 20 test cevabı eklenince: süre sapması 24 → 42 sn,
  GE 0,071 → 0,10 (tavan), HP 5,56 → 8,06 oldu. Komut 900 sn'lik kaydı `>10dk`, 1 sn'lik kaydı `<=2sn` diye işaretledi.
- Olmayan soru numarası "BULUNAMADI" yazdı.

## Değişen dosyalar
- scripts/soru-incele.js (yeni)
- docs/surum-notlari/SURUM-NOTU-v4.17.27-3.md
