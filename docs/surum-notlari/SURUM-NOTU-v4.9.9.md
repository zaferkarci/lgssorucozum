# v4.9.9 — Veli/öğrenci panelinde önbellek (no-store) düzeltmesi (TAM PROJE)

Çalışan TÜM proje. v4.9.8 üzerine kuruludur.

## Sorun
Veli panelindeki (öğrenci detay) doğru/yanlış listesi, öğrencinin BUGÜN çözdüğü
soruları geç gösteriyordu; ancak gece cron'undan (ya da elle tetikleyince) sonra
güncel görünüyordu. İnceleme: liste ve ders bazlı doğru/yanlış sayıları her istekte
CANLI olarak CevapKaydi'dan kuruluyor ve CevapKaydi.tarih varsayılanı Date.now —
yani veride sorun yok. Belirti, tarayıcı/proxy ÖNBELLEĞİNİN sayfanın eski kopyasını
sunmasıydı (bfcache dahil). Cron'u elle çalıştırırken yapılan yenileme önbelleği
kırdığı için "cron düzeltti" gibi göründü.

## Çözüm
İki dinamik router'a (panel ve takip) tek satırlık no-store middleware eklendi:
`Cache-Control: no-store, no-cache, must-revalidate` + `Pragma: no-cache` +
`Expires: 0`. Bu router'lar yalnızca kişiye özel/dinamik veri sunduğundan
önbelleklenmemeleri gerekir. Böylece panel ve veli takip sayfaları her açılışta
güncel veriyi gösterir; geri/ileri (bfcache) durumunda bile bayatlamaz.

Not: Cron mantığı, puanlama, istatistik hesabı DEĞİŞMEDİ. Sadece HTTP yanıt
başlıkları eklendi. Statik dosyalar (express.static) etkilenmez.

## Değişen dosyalar (v4.9.8 tabanına göre)
- routes/panel.js  (router başına no-store middleware)
- routes/takip.js  (router başına no-store middleware)
- package.json     (4.9.8 → 4.9.9)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/panel.js + routes/takip.js node --check geçti; EOL korundu (CRLF, stray LF: 0).
- Middleware, router tanımından hemen sonra/route'lardan önce yerleşti (doğrulandı).

## Git
```bash
git add -A
git commit -m "v4.9.9: panel ve takip yanitlarina no-store onbellek basligi"
git push
git tag v4.9.9
git push origin v4.9.9
```
