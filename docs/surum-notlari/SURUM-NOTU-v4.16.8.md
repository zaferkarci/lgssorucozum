# v4.16.8 — Mükerrer temizleme ADMIN SAYFASI + CLI script kaldırıldı (TAM PROJE)

Çalışan TÜM proje. v4.16.7 üzerine kuruludur.

## Sorun
Mükerrer (çift-POST) temizleme v4.16.6'da komut satırı script'i olarak verilmişti;
Render'da komut satırı pratik olmadığından kullanılamıyordu.

## Çözüm — admin sayfası (komut satırı gerekmez)
routes/admin.js: GET /admin/mukerrer-temizle (yalnız admin):
- /admin/mukerrer-temizle           -> KURU ÇALIŞMA: kaç mükerrer var raporlar, SİLMEZ.
- /admin/mukerrer-temizle?uygula=1  -> gerçekten siler.
Kural script'le aynı: her (kullaniciAdi, soruId) için ilk kayıt tutulur; son
tutulandan <= 5 sn sonrası mükerrer sayılıp silinir. Gerçek tekrar çözüm korunur.
Silmeden sonra puan/dersPuanlari gece cron'unda yeniden kurulur.

scripts/temizle-mukerrer-cevap.js KALDIRILDI (komut satırı script'i; faydası yoktu).

## Kullanım (deploy sonrası)
1. Admin oturumuyla: lgssorucozum-4.onrender.com/admin/mukerrer-temizle
   -> önce kuru rapor (kaç mükerrer var).
2. Silmek için: .../admin/mukerrer-temizle?uygula=1

## Değişen dosyalar (v4.16.7 tabanına göre)
- routes/admin.js                    (GET /admin/mukerrer-temizle eklendi)
- scripts/temizle-mukerrer-cevap.js  (KALDIRILDI)
- package.json                       (4.16.7 -> 4.16.8)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- admin.js node --check geçti. admin.js saf LF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.8: mukerrer temizleme admin sayfasi + cli script kaldirildi"
git push
git tag v4.16.8
git push origin v4.16.8
```
