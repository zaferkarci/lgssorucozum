# v4.8.16 — Repo temizliği (TAM PROJE, işlev kodu %100 korundu)

Çalışan TÜM proje. v4.8.15 üzerine kuruludur. Bu sürümde HİÇBİR işlev kodu
değişmedi (içeriği değişen tek dosya: package.json sürüm satırı).

## Silinenler (gerçek çöp)
- `admin.ejs` (kök) — eskimiş kopya. Canlı dosya `views/admin.ejs`; Express
  `app.set('views', 'views')` ile yalnız views/ klasöründen render eder, kökteki
  dosya hiçbir yerden referans almıyordu (170 KB ölü ağırlık).
- `git` — 0 baytlık başıboş dosya.

## Taşınanlar (içerik korunur, kök sadeleşir)
- `KURULUM*.md` (5 dosya) → `docs/`
- `SURUM-NOTU-v4.8.1…15.md` (15 dosya) → `docs/surum-notlari/`
- `_arsiv/` → `docs/arsiv/` (puanlama dokümanları ve servereski.js — SİLİNMEDİ)

## Yeni kök (sade)
CLAUDE.md, .gitignore, package.json, package-lock.json, server.js, cronJobs.js,
mailGonder.js + models/ routes/ services/ views/ public/ + docs/

## Doğrulama
- 30 işlev JS dosyası `node --check` geçti; 13 EJS view derlendi.
- v4.8.15 ile diff: içeriği değişen tek dosya package.json; diğer her şey
  taşıma/silme. Puanlama, analiz, soru akışı, modeller — dokunulmadı.
- Silinen/taşınan her şey git geçmişinde durur; gerekirse `git checkout v4.8.15 -- <dosya>`
  ile geri alınabilir.

## Git
```bash
git add -A
git commit -m "v4.8.16: repo temizligi - eski kopyalar silindi, dokumanlar docs/ altina"
git push
git tag v4.8.16
git push origin v4.8.16
```
