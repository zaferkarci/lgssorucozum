# v4.9.6 — Başlangıç hücresini elle seçme (ADMIN ÖNİZLEME) (TAM PROJE)

Çalışan TÜM proje. v4.9.5 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi.

## Ne değişti
"Başlangıç yurdu" artık Nazilli'ye sabit değil; **elle seçilebilir** (tek seferlik):
- Sol paneldeki **"🎲 Başlangıç yurdunu seç"** butonuna basınca yerleştirme modu
  açılır; haritanın üstünde "bir hücreye tıkla" uyarısı çıkar ve görünür penceredeki
  tüm boş hücreler tıklanabilir olur.
- Tıkladığın hücreye ilk toprağın kurulur; sayfa o bölgeye odaklanır.
- Yalnız ilk hücre içindir; sonrası yine bitişik + artan fiyat kuralıyla işler.
- İstersen önce mini-harita/yön tuşlarıyla istediğin bölgeye (ör. başka kıtaya)
  gidip oraya da başlayabilirsin.

Sunucu: `POST /oyun/baslangic` artık opsiyonel `x,y` kabul eder; geçerli ve boş
bir dünya hücresiyse oraya kurar (dolu hücrede uyarı verir). x,y gönderilmezse
eski Nazilli/küme mantığı yedek olarak durur.

## Değişen dosyalar (v4.9.5 tabanına göre)
- routes/oyun.js  (baslangic ucu x,y; istemcide yerleştirme modu + uyarı)
- package.json    (4.9.5 → 4.9.6)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Satın alma/komşuluk/dünya
zemini/viewport kuralları AYNEN.

## Test
- routes/oyun.js node --check + inline istemci JS node --check geçti; EOL korundu.
- Kabuk: buton metni/onclick, uyarı bandı; istemci: yerleştir bayrağı, baslangicMod,
  ilkHucreKoy, boş hücre tıklama — hepsi doğrulandı.

## Sonraki
v4.9.7 = düello + kuşatma kaçışı.

## Git
```bash
git add -A
git commit -m "v4.9.6: baslangic hucresini elle secme - yerlestirme modu"
git push
git tag v4.9.6
git push origin v4.9.6
```
