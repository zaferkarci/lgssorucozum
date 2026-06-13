# v4.9.8 — Elle kilit + otomatik kümeleyici başlangıç + sıralama (ADMIN ÖNİZLEME) (TAM PROJE)

Çalışan TÜM proje. v4.9.7 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi.
Mevcut modeller/panel/PUANLAMA değişmedi.

## Üç değişiklik

### 1) Türkiye kilidi artık ELLE (otomatik poligon kaldırıldı)
Önceki otomatik kırmızı kilitler haritayla tam uyuşmuyordu. Artık kilitler **admin
tarafından elle** çiziliyor ve kalıcı (yeni model `OyunKilit`, GLOBAL — tüm sınıf
dünyalarında geçerli):
- Haritanın altındaki **"🔒 Kilit düzenle"** butonu kilit modunu açar. Bu moddayken
  herhangi bir hücreye tıklamak o hücreyi kilitler/açar (anında, kırmızı taralı).
- **"🇹🇷 Türkiye taslağı"**: yaklaşık Türkiye poligonunu kilitlere tek tıkla ekler
  (başlangıç noktası olarak; sonra elle düzeltebilirsin).
- **"Kilitleri temizle"**: tüm kilitleri siler.
- Kilitli hücre alınamaz, başlangıç oraya düşmez, test komşu oraya konmaz.
- "Sıfırla" yalnız o dünyanın oyuncu/hücre verisini siler; **kilitler korunur**.

### 2) Başlangıç yurdu OTOMATİK + kümeleyici
Elle yerleştirme kaldırıldı. **"🎲 Başlangıç yurdu (otomatik)"** butonu, mevcut tüm
hücrelerin ortasına (kümeye) en yakın boş + kilitsiz hücreye yerleşir; dünya boşsa
Nazilli civarına. Böylece yeni oyuncular birbirine yakın doğar (düello kolaylaşır).

### 3) Sıralama listesi
Sağ panele **"SIRALAMA (X. Sınıf)"** eklendi: o sınıf dünyasındaki oyuncular,
rumuz + sahip oldukları hücre sayısına göre azalan sıralı (kendin 👑 ile işaretli).
Yeni uç: `GET /oyun/siralama/:sinif` (aggregate).

## Yeni/değişen dosyalar (v4.9.7 tabanına göre)
- **YENİ** models/OyunKilit.js (global kilit hücreleri, unique x,y)
- routes/oyun.js (DB-tabanlı kilit + auto-cluster baslangic + siralama + kilit
  uçları + istemci kilit modu/sıralama)
- package.json (4.9.7 → 4.9.8)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). server.js değişmedi (model
require ile otomatik kaydolur).

## Yeni/değişen uçlar (hepsi admin korumalı)
- POST /oyun/kilit-degistir (toggle), /oyun/kilit-turkiye-taslak, /oyun/kilit-temizle
- GET  /oyun/siralama/:sinif
- POST /oyun/baslangic (artık otomatik kümeleyici; x,y kabul etmez)

## Test
- routes/oyun.js + models/OyunKilit.js + inline istemci JS node --check geçti;
  EOL korundu (CRLF, stray LF: 0). Eski referans (BLOKE/yerlestir) kalmadı.
- Render testi: otomatik başlangıç butonu, kilit düzenle/taslak/temizle, sıralama
  paneli, kilitMod, kilitDegistir, yukleSiralama — hepsi doğrulandı.

## Sonraki
v4.9.9 = düello + kuşatma kaçışı.

## Git
```bash
git add -A
git commit -m "v4.9.8: elle kilit, otomatik kumeleyici baslangic, siralama listesi"
git push
git tag v4.9.8
git push origin v4.9.8
```
