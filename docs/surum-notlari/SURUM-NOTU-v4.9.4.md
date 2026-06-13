# v4.9.4 — Harita pencereleme: ulaşılamaz "ölü bölge" kaldırıldı (TAM PROJE)

Çalışan TÜM proje. v4.9.3 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi.

## Sorun
Otomatik halka büyümesi haritayı (örn. 14×14) toprağın çok ötesine kadar
büyütüyordu; uzaktaki boş hücreler kimseye komşu olmadığından alınamıyor ama
"oynanabilir boşluk" gibi görünüp ölü bölge izlenimi veriyordu.

## Çözüm — pencereleme
Harita artık tüm toprakların **sınır kutusu + 1 hücre çerçeve** (alınabilir sınır)
penceresine sığar; minimum 8×8. Böylece:
- Gösterilen boş hücreler ya bir toprağa komşudur (alınabilir, yeşil "+") ya da
  yakın çerçevededir; uzakta ulaşılamaz void kalmaz.
- Pencere, topraklar büyüdükçe kendiliğinden genişler (halka mantığı bu şekilde
  örtük olarak korunur).
- Satın alma mantığı (bitişiklik + boşluk kontrolü) DEĞİŞMEDİ; yalnız ne kadarının
  çizildiği daraltıldı.

Not: Bitişik-büyüme oyununda her an yalnız "sınır" hücreleri alınabilir; daha
içerideki/uzaktaki boş hücreler büyüdükçe ulaşılır. Yeşil "+" = şimdi alınabilir,
soluk hücre = ileride büyüyeceğin alan (ayrı gösterilir).

## Dünya haritası görseli (önemli)
Mevcut zemin kendi stilize SVG'm (gerçek dünyaya birebir benzemiyor). **Gerçek,
telifsiz bir world-map .svg dosyasını yüklersen** (ör. Wikimedia "BlankMap-World"
public-domain), onu olduğu gibi zemine gömerim ve gerçek dünya görünür. Dış kaynak
erişimim olmadığından bu dosyayı ben sağlayamıyorum.

## Değişen dosyalar (v4.9.3 tabanına göre)
- routes/oyun.js  (haritaHtml pencereleme + GET handler sınır kutusu hesabı)
- package.json    (4.9.3 → 4.9.4)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Modeller, satın alma kuralı,
puanlama — dokunulmadı.

## Test
- node --check geçti; EOL korundu (CRLF, stray LF: 0).
- Pencere simülasyonu: boş→8×8; tek hücre→~8×8 merkezli; geniş küme→sınır kutusu+1;
  dar küme→min 8×8. Render: 8×8 pencerede toplam 64 hücre, doğru alınabilir/soluk
  ayrımı, "Harita W×H" istatistiği. Hepsi doğru.

## Sonraki
Düello + kuşatma kaçışı artık **v4.9.5**.

## Git
```bash
git add -A
git commit -m "v4.9.4: harita pencereleme - ulasilamaz olu bolge kaldirildi"
git push
git tag v4.9.4
git push origin v4.9.4
```
