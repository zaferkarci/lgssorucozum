# v4.16.12 — Profil sekmesindeki "Davet linklerin" kartı veli için kaldırıldı (TAM PROJE)

Çalışan TÜM proje. v4.16.9 (canlı) + v4.16.11 üzerine kuruludur.

## Değişiklik
views/panel.ejs — Profil sekmesindeki "Davet linklerin" kartının görünme koşuluna
veli de eklendi (artık veli bu kartı GÖRMEZ):
  ESKI: if (k.rol !== 'ogrenci' && k.rol !== 'ogretmen')
  YENI: if (k.rol !== 'ogrenci' && k.rol !== 'ogretmen' && k.rol !== 'veli')

Yani profil kartı yalnız KURUMSAL için kalır; öğrenci/öğretmen/veli görmez.

## Korunanlar (DOKUNULMADI)
- Veli Paneli sekmesindeki "🔗 Çocuğum üye değil — davet linki oluştur" kartı ve
  POST /veli/davet-uret AYNEN duruyor. Veli, çocuğu için davet linki oluşturmaya
  devam eder.
- Kurumsal davet kartı, veli davet kodu veri yüklemesi, diğer her şey aynı.

## Değişen dosyalar (v4.16.9 tabanına göre)
- views/panel.ejs   (profil davet kartı gate'ine veli eklendi — tek satır)
- package.json      (-> 4.16.12)
Kod tarafında BAŞKA dosya değişmedi (diff ile doğrulandı). (docs altında v4.16.10/
v4.16.11/v4.16.12 sürüm notları bulunur; v4.16.10 geri alınmıştı.)

## Test
- panel.ejs EJS compile geçti. CRLF korundu.
- Doğrulama: gate'e veli eklendi; Veli Paneli davet formu (/veli/davet-uret) yerinde.

## Git
```bash
git add -A
git commit -m "v4.16.12: profil davet linklerin karti veli icin kaldirildi (veli panel daveti korundu)"
git push
git tag v4.16.12
git push origin v4.16.12
```
