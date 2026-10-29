# Sürüm Notu — v4.17.33-1

**Tarih:** 29 Ekim 2026
**Tür:** Aynı gün güncellemesi (package.json değişmedi, 4.17.33). Sitenin kodu değişmedi; yeniden başlatma gerekmez.

## `scripts/gorsel-duzenle.js` düzeltmesi
- **Hata:** `--soru=` verilmeden çalıştırınca "0 soru" diyordu. Boş değer 0 sayısına dönüşüp yalnız "0 numaralı soru"yu arıyordu.
  Artık `--soru` verilmezse tüm sorular taranır.
- JPG olarak dönen görsellerin piksel ölçüsü de okunur (önceden "?" yazıyordu); ölçü değişmişse görsel atlanır.

## Değişen dosyalar
- `scripts/gorsel-duzenle.js`
- `docs/surum-notlari/SURUM-NOTU-v4.17.33-1.md` — bu not

## Test (demo)
- `--soru` olmadan: 65 soru tarandı, 3 görsel adresi bulundu; JPG ölçüsü okundu (420x300).
- `--soru=990002`: 1 soru.
