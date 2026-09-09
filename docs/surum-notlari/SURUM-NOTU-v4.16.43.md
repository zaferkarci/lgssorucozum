# v4.16.43 — Canlı sıralama fallback'ine 30 günlük filtre + "Genel" ikinci kaynak düzeltmesi

## 1) Canlı sıralama fallback (admin/profil tutarsızlığının gerçek sebebi)
Sorun: profil sayfası, kullanıcı yeni cevap verdiğinde cache'i "bayat" sayıp CANLI
hesaba düşüyordu; canlı hesap 30 günlük eşiği hiç uygulamıyordu (yalnız cron'da vardı).
Sonuç: aktif bir öğrenci soru çözer çözmez, normalde pasiflik eşiğiyle filtrelenmesi
gereken öğrenciler canlı hesapta yeniden "nitelikli" sayılıyor, sıralama admin panelle
(hep cache okur, filtreli) çelişiyordu — biri #1 derken diğeri #4/4 gösterebiliyordu.

Çözüm — routes/panel.js (canlı fallback bloğu, genel + ders sıralamaları):
- Ayar'dan aynı eşik (siralama_min_ort30) okunur.
- Son 30 gün aktivitesi TEK aggregate ile (kullaniciAdi bazında, analiz hariç).
- son30YeterliFn(u) — cron'daki formülle BİREBİR aynı (n/bölen > eşik).
- nitelikliFiltre VE dersNitelikliFiltre'ye eklendi. Artık admin (cache) ile profil
  (canlı, cache bayatken) HER ZAMAN aynı sonucu verir.

## 2) "Genel" — ikinci (unutulan) kaynak düzeltildi
v4.16.42'de konu-boş sorular için ünite fallback'i eklenmişti ama "Ders İstatistikleri"
görünen listesini besleyen İKİNCİ, ayrı bir hesap (dersIstatMap, satır ~737) atlanmıştı.
- routes/panel.js: `konu = sb.konu || 'Genel'` → `konu = sb.konu || sb.unite || 'Genel'`.
  (sb zaten unite alanını taşıyan sorgudan geliyor — doğrulandı.)
- Artık ekranda "Genel" yerine gerçek ünite/tema adı görünür (konu boşsa).

## %100 korunan
- Formüller (puanlama, LGS ağırlıklı ortalama), diğer tüm kod. Sadece filtre + etiket kaynağı.

## Test
- node --check panel.js geçti.
- Canlı filtre simülasyonu: eski (filtresiz) 4 kullanıcıyı nitelikli sayıyordu; yeni
  (eşik=0) yalnız aktif kullanıcıyı nitelikli sayıyor — cron ile birebir tutarlı.
- Genel düzeltmesi mock test: "Türkçe|Genel" yerine "Türkçe|2. Ünite" üretildi.

## Değişen dosyalar
- routes/panel.js
- package.json (4.16.42 -> 4.16.43)

## Git
```bash
git add -A
git commit -m "v4.16.43: canli siralama fallback 30 gunluk filtre + Genel 2. kaynak duzeltmesi"
git push
git tag v4.16.43
git push origin v4.16.43
```
