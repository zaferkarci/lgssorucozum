# v4.8.17 — Üniteler menüsüne manuel ekleme (TAM PROJE)

Çalışan TÜM proje. v4.8.16 üzerine kuruludur.

## Ne eklendi
Admin → İçerik → Üniteler ekranına **"➕ Manuel Ünite Ekle"** kartı (Excel yükleme
kartının hemen altında). Excel'e gerek kalmadan tek ünite eklenir:
- Alanlar: Sınıf, Ders (zorunlu), Ünite No, Ünite Adı (zorunlu), Konular.
- Konular tek metin alanına **her satıra bir tane veya virgülle** yazılır —
  mevcut "Düzenle" (unite-guncelle) ile birebir aynı biçim/ayrıştırma.
- Kaydedince Üniteler listesine döner; yeni ünite listede görünür ve diğer her
  yerde (soru ekleme önerileri, Konu İzinleri, Soru Dağılımı, analiz) otomatik
  kullanılır — hepsi Unite koleksiyonundan beslendiği için ek iş gerekmez.

## Excel akışı AYNEN korundu
Şablon indirme, sürükle-bırak yükleme, önizleme, "ekle/sıfırla" modu — hiçbirine
dokunulmadı. Manuel form ayrı bir kart ve ayrı bir endpoint.

## Teknik
- Yeni endpoint: `POST /unite-ekle` (adminKontrol korumalı) — `unite-guncelle`
  ile aynı alanlar ve aynı konular ayrıştırması; `new Unite().save()`.
- Ünite adı boşsa uyarı verip geri döner.

## Değişen dosyalar (v4.8.16 tabanına göre)
- routes/admin.js   (yeni /unite-ekle endpoint'i)
- views/admin.ejs   (Üniteler ekranına manuel ekleme kartı)
- package.json      (4.8.16 → 4.8.17)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/admin.js `node --check`, views/admin.ejs EJS derleme geçti; EOL korundu.
- Konu ayrıştırma simülasyonu: satır satır, virgüllü, tek konu, boş — hepsi doğru.
- Form action ↔ endpoint eşleşmesi doğrulandı.

## Git
```bash
git add -A
git commit -m "v4.8.17: uniteler menusune manuel sinif ders unite konu ekleme"
git push
git tag v4.8.17
git push origin v4.8.17
```
