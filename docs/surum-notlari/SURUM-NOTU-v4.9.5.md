# v4.9.5 — Dünya haritası zemini + viewport mimarisi (ADMIN ÖNİZLEME) (TAM PROJE)

Çalışan TÜM proje. v4.9.4 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi;
öğrencilere kapalı. Mevcut modeller/panel/PUANLAMA değişmedi.

## Büyük mimari değişiklik (onaylanan tüzük)
- **Gerçek dünya zemini:** Yüklediğin world SVG, ülke/şehir sınırları eritilip
  kıta-only (yeşil kıta + lacivert okyanus) hâline getirildi; `public/world.svg`
  olarak STATİK sunulur (tarayıcı bir kez yükler, her sayfada gömülmez).
- **Mantıksal dünya:** 400×200 = 80.000 hücre, her sınıf (5/6/7/8) kendi dünyası.
- **Viewport:** ekranda yalnız 20×20 = 400 hücre çizilir (akıcı). Dünya arka planı
  yüzde-tabanlı hizalanır (her ekran boyutunda ızgarayla çakışır).
- **Gezinme:** yön tuşları + ekran okları (kaydır) + **mini-harita** (tıkla → o
  bölgeye atla; sahipli hücreler nokta olarak, görünür pencere sarı dikdörtgen).
  Böylece uzak rakipler bulunabilir (düello hazırlığı).
- **Başlangıç merkezi:** Türkiye/Aydın/**Nazilli** (≈ dünya hücresi 231,58). İlk
  hücre buradan/ küme merkezinden en yakın boş hücreye düşer; yeni oyuncular
  birbirine yakın doğar.
- **Açılış penceresi:** kendi toprağında (yoksa Nazilli).
- **Her hücre alınabilir** (okyanus dahil); ilk ücretsiz, sonrası bitişik + artan
  fiyat (10 × hücre sayısı). Kurallar değişmedi, yalnız koordinat artık dünya.

## Uçlar (hepsi admin korumalı)
- GET /oyun (dünya seçici), GET /oyun/:sinif (viewport kabuk)
- GET /oyun/veri/:sinif?vx&vy (görünür bölge JSON), GET /oyun/minimap/:sinif
- POST /oyun/baslangic | /hucre-al | /test-komsu | /sifirla

## Performans
80.000 hücre mantıksal; tarayıcı her an ~400 hücre + arka plan + birkaç nokta çizer.
50 bin+ kullanıcı için kapasite var; ekran yükü sabit kalır.

## Değişen / eklenen dosyalar (v4.9.4 tabanına göre)
- routes/oyun.js  (viewport mimarisi — yeniden yazıldı)
- **YENİ** public/world.svg (kıta-only dünya, statik)
- package.json    (4.9.4 → 4.9.5)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). server.js mount ve admin linki
v4.9.0'dan beri zaten yerinde.

## Test
- routes/oyun.js node --check + inline istemci JS node --check geçti; EOL korundu
  (CRLF, stray LF: 0).
- Hizalama: bg-size 2000%×1000%, vx=221→%58.2; Nazilli viewport vx=221,vy=48.
- world.svg geçerli (<svg> 2754×1398), statik sunulur.

## Sonraki
v4.9.6 = düello + kuşatma kaçışı.

## Git
```bash
git add -A
git commit -m "v4.9.5: dunya haritasi zemini ve viewport mimarisi - admin onizleme"
git push
git tag v4.9.5
git push origin v4.9.5
```
