# v4.8.18 — Analiz sürerken günlük hedef sınırı/kesintisi yok (TAM PROJE)

Çalışan TÜM proje. v4.8.17 üzerine kuruludur.

## Sorun
İlk gün hedef ders başına 2 soru olduğundan, öğrenci zorunlu analizin daha 2.
sorusunda "🎉 Hedefini tamamladın — Devam et / Dinlen?" modalı ve ders toast'larıyla
kesiliyordu. Analiz tek oturuşta, kesintisiz tamamlanmalı.

## Durum tespiti (kod doğrulaması)
- Soru havuzunu boşaltan SERT durdurma (v4.8.12) zaten `analizTamamlandi` şartlı —
  analiz sırasında havuz HİÇ kesilmiyor; bu sürümde de değişmedi.
- Kesintinin kaynağı, analiz şartı taşımayan ESKİ kutlama katmanıydı (v4.5.0 modal
  + ders toast'ları).

## Düzeltme
panel.ejs'deki hedef kutlama scripti artık analiz sürerken hiç çalışmıyor
(`analizTamamlandi` false iken toast da modal da gösterilmez). Analiz bitince
kutlamalar ve günlük hedef davranışı eskisi gibi.

## Bilinen davranış (tasarım gereği, ayrı karar)
Analizin bittiği GÜN, analiz cevapları o günün hedefini çoktan doldurmuş olacağından
v4.8.12 durdurması hemen devreye girer: öğrenci aynı gün serbest pratiğe geçemez,
"Bugünkü hedefini tamamladın" kartını görür; serbest pratik ertesi gün açılır.
İstenirse "analizin bittiği gün sınır uygulanmasın" şeklinde genişletilebilir.

## Değişen dosyalar (v4.8.17 tabanına göre)
- views/panel.ejs  (kutlama scriptine analiz kapısı)
- package.json     (4.8.17 → 4.8.18)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). panel.js'e dokunulmadı.

## Test
- EJS derleme geçti; CRLF korundu. Gate render testi: analiz sürerken false,
  bitmişken true, local yoksa true (eski davranış). Sert durdurma koşulunun
  değişmediği grep ile doğrulandı.

## Git
```bash
git add -A
git commit -m "v4.8.18: analiz surerken hedef modal/toast kesintisi kaldirildi"
git push
git tag v4.8.18
git push origin v4.8.18
```
