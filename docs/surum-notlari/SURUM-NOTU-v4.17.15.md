# v4.17.15 — Mesajlar: üst menü rozeti, admin'den yazışma başlatma

## 1) Üst menüde "Mesajlar" + kırmızı rozet (öğrenci/veli)
- Panel üst menüsüne Mesajlar bağlantısı; okunmamış yönetici cevabı/mesajı varsa
  kırmızı rozet ve sayı gösterilir.
- Bağlantı profil sayfasındaki "Mesajlarım" kartına götürür (#mesajlarimKart).
  (Ayrı bir `mod=mesajlar` sayfası yok; link oraya çapalandı.)

## 2) Admin kullanıcıya yazışma BAŞLATABİLİR
- Yeni uç: `POST /mesaj-baslat` (adminKontrol). Kullanıcı adı doğrulanır; yoksa uyarır.
- İletişim > Mesajlar ekranının üstüne "✍️ Kullanıcıya mesaj gönder" formu:
  kullanıcı adı (mevcut kullanıcılardan otomatik tamamlamalı) + mesaj.
- Mesaj `kaynak='admin'`, `ogrenciOkudu=false` ile kaydedilir → kullanıcıda rozet yanar.

## 3) Öğrenci panelinde yönetici mesajı ayrı stil
`kaynak='admin'` olan mesajlar yeşil kutuda "↩ Yönetici mesajı" başlığıyla gösterilir;
kullanıcının kendi yazdıklarından ayrışır.

## Kapsam (değişmedi)
Kullanıcılar yalnızca yöneticiye yazar; mesaj sorgusu kendi kullanıcı adıyla sınırlıdır.
Kullanıcıdan kullanıcıya mesaj yoktur. Tüm liste ve cevap yazma admin oturumu ister.

## Test
- node --check admin.js geçti; panel.ejs ve admin.ejs derlendi.
- Boş `mod=mesajlar` bağlantısı kalmadı (3 link düzeltildi).

## Değişen dosyalar
- routes/admin.js, views/admin.ejs, views/panel.ejs
- package.json (4.17.14 -> 4.17.15)
