# v4.16.9 — Mükerrer temizleme sayfasına liste (tutulan + silinen) (TAM PROJE)

Çalışan TÜM proje. v4.16.8 üzerine kuruludur.

## Değişiklik
/admin/mukerrer-temizle artık her mükerrer için İKİ kaydı da tablo halinde gösterir:
- TUTULAN satırı (ilk kayıt — korunur)
- SILINECEK / SILINDI satırı (mükerrer — silinir)
Her satırda: Kullanıcı, SoruId, Tarih (Europe/Istanbul, ms dahil), Sonuç
(doğru/yanlış), Süre, _id; silinen satırda ayrıca aradaki Fark (sn).

Böylece silmeden önce gerçekten çift-POST mü diye iki kaydı yan yana görüp
karar verebilirsin. Kuru çalışma "SILINECEK", uygula sonrası "SILINDI" yazar.
Liste en fazla 3000 çift gösterir (fazlası varsa not düşülür).

Silme kuralı v4.16.8 ile AYNI (her kullaniciAdi+soruId için ilk kayıt tutulur;
son tutulandan <= 5 sn sonrası silinir; gerçek tekrar çözüm korunur).

## Değişen dosyalar (v4.16.8 tabanına göre)
- routes/admin.js   (/admin/mukerrer-temizle: tutulan+silinen liste tablosu)
- package.json      (4.16.8 -> 4.16.9)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- admin.js node --check geçti; saf LF korundu.
- colak gerçek verisiyle biçim testi: TUTULAN 21:43:50.601 / SILINECEK
  21:43:51.312, fark 0.7 sn dogru hesaplandi.

## Git
```bash
git add -A
git commit -m "v4.16.9: mukerrer temizleme sayfasina tutulan+silinen liste tablosu"
git push
git tag v4.16.9
git push origin v4.16.9
```
