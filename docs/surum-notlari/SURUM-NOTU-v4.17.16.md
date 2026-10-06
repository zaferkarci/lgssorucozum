# v4.17.16 — Mesajlar artık gerçek bir sayfa

## Sorun
v4.17.15'te üst menüdeki "✉️ Mesajlar" bağlantısı `?mod=profil#mesajlarimKart`
adresine gidiyordu: tıklayınca profil sayfası açılıyor, kullanıcı mesaj bölümünü
aramak zorunda kalıyordu. Kafa karıştırıcıydı.

## Çözüm — views/panel.ejs
- "Mesajlarım" kartı profil sayfasından ÇIKARILDI ve kendi sayfasına taşındı:
  yeni `<% } else if (mod === 'mesajlar') { %>` bloğu (ortalanmış, max 760px kapsayıcı).
- Üst menüdeki 3 bağlantı (öğrenci / veli / diğer) `?mod=mesajlar` adresine çevrildi;
  sayfa açıkken menü öğesi "aktif" görünür. Okunmamış cevap rozeti aynen korundu.

Böylece akış: üst menü → ✉️ Mesajlar → mesaj yazma kutusu + geçmiş yazışma tek ekranda.

## Test
- panel.ejs derlendi.
- Yeni sayfa 3 senaryoda render edildi: mesaj yok / mesaj+cevap / yönetici mesajı —
  hepsinde başlık ve gönderme kutusu mevcut.
- `mesajlarimKart` artık tek yerde (profil kopyası kalmadı).

## Değişen dosyalar
- views/panel.ejs
- package.json (4.17.15 -> 4.17.16)
