# v4.10.0 — Kuşatma = otomatik fetih (ölü bölge çözümü) (ADMIN ÖNİZLEME) (TAM PROJE)

Çalışan TÜM proje. v4.9.9 üzerine kuruludur. Oyun hâlâ yalnız admin önizlemesi.

## Sorun (ölü bölge)
Satın alma katı 4-komşuluk olduğundan, kendi toprağınla çevrelediğin bir cebin
İÇİNDE (çepere 2+ hücre uzakta) kalan hücreler "+" almıyordu; halka halka
doldurmadan tıklanamadıkları için "ölü alan" görünüyorlardı.

## Çözüm — kuşatma ile otomatik fetih (Go mantığı)
Bir hücre alındığında, o alımla **kapanan boşluk(lar)** tespit edilir (flood-fill):
- Boşluk yalnızca **senin hücrelerin + kilitli (Türkiye) hücreler** ile çevriliyse
  (dünya kenarına kaçış yok, başka oyuncuya değmiyorsa) → **kuşatılmış** sayılır.
- Kuşatılan tüm boş hücreler **otomatik fetih kuyruğuna** girer.
- Fetih fiyatı **satın almayla aynı**: her hücre bir öncekinden 10 fazla (10 × mevcut
  hücre). Altın elverdikçe sırayla fethedilir.
- **Altın yetmezse fetih durur**; kalan hücreler kuyrukta bekler (haritada sarı
  kesikli, kum saati görünümü). Öğrenci soru çözüp **altın kazandıkça**, oyunu her
  açtığında (viewport verisi çekilirken) kuyruk otomatik işlenir — kaldığı yerden
  devam eder. **Üst sınır yok.**
- Başka oyuncunun hücresine değen ya da dünya kenarına açık boşluklar fethedilmez.

## Teknik
- models/OyunOyuncu.js: yeni `bekleyenFetih: [{x,y}]` kuyruğu.
- routes/oyun.js:
  - `bolgeTara(...)` flood-fill kuşatma tespiti (kilitler duvar; düşman/kenar = açık;
    arama üst sınırı 20000 — performans koruması).
  - `bekleyenFetihIsle(...)` kuyruğu altın elverdikçe işler (insertMany).
  - `/oyun/hucre-al`: alımdan sonra kuşatma tespiti + kuyruğa alma + işleme.
  - `/oyun/veri`: her çekişte bekleyen fetih işlenir; viewport'taki bekleyen hücreler
    döner. İstemci sarı kesikli "bekliyor" hücresi çizer.

Not: Admin önizlemesinde test altını çok yüksek olduğundan fetih genelde anında
tamamlanır (duraklama gerçek öğrencilerin düşük altınında devreye girer).

## Değişen dosyalar (v4.9.9 tabanına göre)
- models/OyunOyuncu.js
- routes/oyun.js
- package.json (4.9.9 → 4.10.0)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Puanlama/panel/cron etkilenmedi.

## Test
- routes/oyun.js + models/OyunOyuncu.js + inline istemci JS node --check geçti;
  EOL korundu (CRLF, stray LF: 0).
- bolgeTara birim testleri: 3x3 halka→1, açık→yok, kilit-duvar→kapalı, düşman
  sınırda→yok, 2x2 cep→4. Hepsi doğru.

## Sonraki
v4.10.1+ = düello + kuşatma kaçışı (komşu düşmana ortak-soru düellosu).

## Git
```bash
git add -A
git commit -m "v4.10.0: kusatma ile otomatik fetih - olu bolge cozumu ve bekleyen fetih kuyrugu"
git push
git tag v4.10.0
git push origin v4.10.0
```
