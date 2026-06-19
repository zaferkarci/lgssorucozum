# v4.16.15 — Sorular ekranı: 6 kademeli client-side cascade filtre (TAM PROJE)

Çalışan TÜM proje. v4.16.14 üzerine kuruludur. "Yol 2" rollout 2. adım:
Sorular (soruListesi) filtre satırı, önizlemedeki gibi client-side otomatik
cascade'e çevrildi ve iki yeni alan eklendi.

## Bu sürümde yapılanlar

### Sorular (soruListesi) filtresi — views/admin.ejs
- Filtre satırı artık 6 kademe: Sınıf · Ders · Ünite · Konu · Öğrenme Çıktısı ·
  Süreç Bileşeni.
- Seçenekler /api/unite-bilgi'den CLIENT-SIDE dolar; bir üst seçilince alttakiler
  SAYFA YENİLEMEDEN otomatik gelir (önizlemedeki davranış).
- onchange="this.form.submit()" kaldırıldı; yerine "Filtrele" butonu eklendi.
  Filtre GET ile uygulanır, sayfa dönünce seçimler geri yüklenir (JSON.stringify
  ile güvenli restore; sunucu-render fallback option'ları da var).
- "Filtreyi Temizle" ve sayaç korundu; durum-değiştir butonları filtreyi
  (çıktı/süreç dahil) korur.

### Sunucu tarafı — routes/admin.js
- filCikti → soruFiltre.ogrenmeCiktisi, filSurec → soruFiltre.surecBileseni
  (Soru bu alanları v4.16.14'te kazanmıştı). Liste çekme/render mantığı AYNEN
  korundu; sadece iki filtre alanı eklendi.
- soru-durum-degistir: filtre korumasına filCikti/filSurec eklendi.

## %100 korunan
- Zorluk Raporu filtresi DOKUNULMADI (hâlâ sunucu-render + this.form.submit()).
- Soru listesi render'ı, sıralama, önizleme paneli, durum kartları — AYNEN.
- konular şeması ve tüm tüketicileri, mevcut soru/ünite verisi, satır sonları
  (admin.ejs CRLF), ilgisiz tüm kod.

## SONRAKİ ADIMLAR (aynı desen)
- Zorluk Raporu (zorlukRapor) — Sorular ile birebir aynı dönüşüm.
- PDF Yükle, Görselli PDF Yükle (serbest metin → dropdown), Soru Dağılımı.
- İstenirse Konu İzinleri.

## Değişen dosyalar
- routes/admin.js (filCikti/filSurec sunucu filtresi + durum-degistir koruması)
- views/admin.ejs (soruListesi filtre formu → client-side cascade + 2 alan + script)
- package.json (4.16.14 -> 4.16.15)

## Test
- node --check admin.js geçti. admin.ejs ejs.compile ile derlendi.
- Cascade mantığı örnek veriyle simüle edildi: Sınıf→Ders→Ünite→Konu→Çıktı→Süreç
  doğru daraldı; boş-sınıflı ünite davranışı sunucuyla tutarlı.
- Zorluk Raporu formunun değişmediği doğrulandı (this.form.submit(): 12 → 8,
  yalnız soruListesi'nin 4'ü kaldırıldı).
- Diff: admin.ejs'te yalnız hedef bölgeler değişti; CRLF korundu.

## Git
```bash
git add -A
git commit -m "v4.16.15: Sorular ekrani 6 kademeli client-side cascade filtre + Ogrenme Ciktisi/Surec"
git push
git tag v4.16.15
git push origin v4.16.15
```
