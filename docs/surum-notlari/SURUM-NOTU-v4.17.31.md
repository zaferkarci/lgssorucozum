# Sürüm Notu — v4.17.31

**Tarih:** 26 Ekim 2026
**Tür:** Günün ilk güncellemesi (package.json 4.17.31). Sitenin kodu değişmedi; yeniden başlatma gerekmez.

## Yeni: `scripts/cevap-duzelt.js` (tek seferlik düzeltme)

Bir soruda iki şık aynı girildiği için **yanlış sayılan cevapları "doğru" yapar.**
Örnek: 599 numaralı soruda A ve D aynı, kayıtlı doğru cevap D; A'yı seçenler yanlış sayılmış.

Gece hesabı (05:10) cevabın doğru mu olduğunu yeniden kontrol etmez, kayıttaki doğru/yanlış bilgisini kullanır.
Bu yüzden sorunun doğru cevabını değiştirmek eski cevapları düzeltmez; bu komut kayıtları düzeltir.

### Kullanım
```
su - elcezeri -c "cd ~/lgssorucozum && node scripts/cevap-duzelt.js 599 A"                    # yalnız listeler
su - elcezeri -c "cd ~/lgssorucozum && node scripts/cevap-duzelt.js 599 A --uygula"           # uygular
su - elcezeri -c "cd ~/lgssorucozum && node scripts/cevap-duzelt.js 599 A --kullanici=alpay"  # yalnız bir kullanıcı
```
Seçenekler: `--adlar` (adları yazar; varsayılan ogr1, ogr2…), `--kullanici=<ad>`, `--uygula`, `--zorla`.

### Ne yapar
- Önce şıkları listeler ve seçilen şık ile doğru şıkkın metin ve görsel olarak **aynı** olduğunu kontrol eder.
  Aynı değilse durur (`--zorla` ile geçilebilir).
- O soruda o şıkkı seçip yanlış sayılmış kayıtları bulur. Seçilen şık v4.17.24'ten beri kaydediliyor.
- Seçilen şıkkı kayıtlı olmayan eski yanlış kayıtlara dokunmaz, yalnız listeler. Kişiyi biliyorsanız `--kullanici=<ad>` ile o kişinin kaydı da alınır.
- `--uygula` olmadan **hiçbir şey değiştirmez.** Aynı komutu iki kez çalıştırmak zarar vermez (ikincide 0 kayıt).
- `--uygula` ile kayıtlar "doğru" olur. Puan, sorunun doğru sayısı ve zorluğu bir sonraki gece hesabında güncellenir.
- "Geçilip tekrar çözülmüş" kayıtlara bugünkü formülle puanın 1/5'i yazılır (gece hesabı bu kayıtların puanını yeniden hesaplamaz).
- Sorunun kendisine dokunmaz: aynı girilen şıkkı admin panelinden ayrıca düzeltin (doğru cevap D kalsın).

## Değişen dosyalar
- `scripts/cevap-duzelt.js` — yeni
- `package.json` — 4.17.31
- `docs/surum-notlari/SURUM-NOTU-v4.17.31.md` — bu not
