# v4.13.0 — Düello + Kuşatma kaçışı (TAM PROJE)

Çalışan TÜM proje. v4.12.0 üzerine kuruludur.

## 1) Düello (komşu düşmana meydan okuma)
Oyuncu, kendi toprağına komşu bir DÜŞMAN hücresine tıklayarak (üstünde ⚔ işareti)
düello açar:
- Sistem, iki oyuncunun da DOĞRU çözdüğü ortak sorulardan RASTGELE birini seçer.
- O soruda her oyuncunun en kısa doğru çözüm süresi (`CevapKaydi.sure`) kıyaslanır;
  daha KISA süren KAZANIR. Eşitlikte savunan korur.
- Kazanırsan hedef hücre sana geçer (1 hücre).
- Günde 1 saldırı hakkı (sonuç ne olursa olsun tükenir). Sol panelde "Saldiri hakki".
- Rakibin SON hücresi korumalıdır (alınamaz).
- İki oyuncunun ortak DOĞRU çözdüğü soru yoksa düello yapılamaz (uyarı verilir).
- Sonuç şık bir pencerede gösterilir (kazandın/kaybettin, iki süre, rakip).

## 2) Kuşatma kaçışı (uzak sıçrama)
Bir oyuncu tamamen kuşatıldığında (tüm hücrelerinin 4-komşusu dolu/kilitli/dünya
kenarı; hiç boş+kilitsiz komşu yok), bitişiklik şartı olmadan uzaktaki herhangi bir
boş+kilitsiz hücreye "sıçrayabilir":
- Kuşatma sırasında haritadaki boş hücreler tıklanabilir sıçrama hedefi olur (⬇).
- Fiyat normaldir: 10 x mevcut hücre sayısı.
- Kuşatılmadıkça uzak sıçrama yapılamaz (normal kurallar geçerli).

## Teknik
- models/OyunOyuncu.js: `sonSaldiriTarih` (Date) — günlük saldırı limiti.
- routes/oyun.js:
  - require CevapKaydi.
  - `ayniGunMu`, `kusatildiMi` yardımcıları.
  - POST /oyun/duello — komşu/son-hücre/günlük-limit doğrulamaları, ortak doğru soru
    kesişimi, rastgele soru, süre kıyası, kazanınca hücre devri.
  - GET /oyun/veri — yanıta `kusatildi` + `saldiriHakki` eklendi.
  - POST /oyun/hucre-al — komşu yoksa, yalnızca kuşatılmışsa uzak sıçramaya izin.
  - İstemci: düello hedefi (komşu düşman, ⚔) ve sıçrama hedefi (kuşatınca boş, ⬇)
    render'a eklendi; duelloBaslat + sonuç penceresi; kurallar güncellendi.

## Değişen dosyalar (v4.12.0 tabanına göre)
- models/OyunOyuncu.js   (sonSaldiriTarih)
- routes/oyun.js         (duello, kusatma kacisi, veri bayraklari, istemci UI)
- package.json           (4.12.0 -> 4.13.0)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Puanlama/panel/cron etkilenmedi.

## Test
- routes/oyun.js + models/OyunOyuncu.js + inline istemci JS node --check geçti;
  kabukHtml render testi (duello modal, sicrama, saldiri hakki, kurallar) geçti;
  EOL korundu (CRLF, stray LF: 0).
- kusatildiMi birim testleri: acik->false, dusmanla cevrili->true, dusman+kilit->true,
  bir bos komsu->false, hucresiz->false, kenar+dusman->true. Hepsi dogru.

## Not
- Duello, oyuncularin GERCEK gecmis cevap verileriyle (CevapKaydi.sure) eszamansiz
  calisir; savunucunun o an online olmasi gerekmez.
- Sure kiyasi, her soru icin oyuncunun EN KISA dogru cozumunu kullanir.

## Git
```bash
git add -A
git commit -m "v4.13.0: duello (ortak dogru soru sure kiyasi) ve kusatma kacisi (uzak sicrama)"
git push
git tag v4.13.0
git push origin v4.13.0
```
