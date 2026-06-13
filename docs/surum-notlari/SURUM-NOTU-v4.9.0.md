# v4.9.0 — Bilgi Gezegenleri: altyapı + harita (ADMIN ÖNİZLEME) (TAM PROJE)

Çalışan TÜM proje. v4.8.19 üzerine kuruludur. Oyun ÖĞRENCİLERE KAPALI — yalnızca
yönetici önizlemesi. Mevcut modellere ve PUANLAMAYA sıfır dokunuş.

## Bu sürümde ne var
Onaylanan tüzüğün 1. aşaması (harita; düello v4.9.1'de):
- **Gezegen seçici** `/oyun` (5/6/7/8 — her sınıfın kendi gezegeni).
- **Harita** `/oyun/:sinif`: kare ızgara, uzay temalı; sahipli hücreler oyuncu
  renginde, kendi toprağın vurgulu.
- **Rumuz:** her oyuncuya sabit, otomatik, kimlikle eşleşmeyen takma ad
  (örn. "Gümüş Galaksi-73") + sabit renk.
- **İlk hücre:** ücretsiz rastgele başlangıç yurdu (merkeze yakın).
- **Bitişik satın alma:** yalnız kendi toprağına 4-yön komşu boş hücreler.
- **Artan fiyat:** sonraki hücre = 10 × mevcut hücre sayısı (2.→10, 3.→20…).
- **Altın bakiyesi:** toplam kazanılan puan − harcanan (puana DOKUNULMAZ).
  Admin önizlemede test altını (1.000.000) ile serbestçe denenir.
- **Otomatik halka:** sahipli oran %50'yi aşınca gezegen 8×8 → 10×10 → 12×12 büyür.
- **Önizleme araçları (admin):** "👥 Test komşu ekle" (bitişik başka renkte oyuncu),
  "🗑️ Gezegeni sıfırla".

## Erişim / güvenlik
- Tüm /oyun uçları `req.session.adminGirisli === true` ister; değilse "yakında" der.
- Öğrenci panel menüsüne link EKLENMEDİ. Giriş yalnız admin panelindeki
  "🪐 Oyun (Önizleme)" bağlantısı.
- Admin önizleme oyuncusu ayrı sandbox kimliği (`__admin_onizleme__`); gerçek
  öğrenci verisiyle karışmaz.

## Eklenen / değişen dosyalar (v4.8.19 tabanına göre)
- **YENİ** models/OyunOyuncu.js, models/OyunHucre.js (ayrı koleksiyonlar)
- **YENİ** routes/oyun.js (kendi HTML'ini üretir; ayrı EJS view gerekmez)
- server.js   (tek mount satırı)
- views/admin.ejs (admin nav'a önizleme linki)
- package.json (4.8.19 → 4.9.0)
Mevcut modeller, panel, puanlama, analiz — HİÇBİRİ değişmedi (diff ile doğrulandı).
Yeni koleksiyonlar ilk kayıtta otomatik oluşur; migration gerekmez.

## Test
- 5 dosya `node --check` + admin.ejs EJS derleme geçti; EOL korundu (stray LF: 0).
- Simülasyon: gezegen büyümesi (33→10×10, 51→12×12, 73→14×14), fiyat (10×n),
  rumuz kararlılığı (aynı kimlik hep aynı, farklı kimlik/gezegen farklı). Doğru.

## Nasıl denenir (deploy sonrası, admin olarak)
1. Admin paneli → "🪐 Oyun (Önizleme)" → bir gezegen seç.
2. "Başlangıç yurdunu al" → harita üzerinde ilk hücre.
3. Yeşil kesikli komşu hücrelere tıkla → artan fiyatla satın al, altının düşsün.
4. "Test komşu ekle" ile başka renk bir oyuncu çıkar (düello görselleri için).
5. Toprağı büyüt; %50 dolunca gezegenin halka eklediğini gör. "Sıfırla" ile baştan.

## Git
```bash
git add -A
git commit -m "v4.9.0: bilgi gezegenleri altyapi ve harita - admin onizleme"
git push
git tag v4.9.0
git push origin v4.9.0
```
