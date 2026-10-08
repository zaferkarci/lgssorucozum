# v4.17.20 — Veli gizlilik düzeltmesi: eşsiz referans kartları, veli takip taraması, öğrenci veli kontrolü

## Olay
Karekodlu referans kartı çıktısı (`/admin/referans-yazdir`) kodları yalnız **tip + kullanılmamış**
filtresiyle seçiyordu; kodu **kimin ürettiğine bakmıyordu**. Velilerin çocukları için ürettiği davet
kodları (ve veliye kayıtta otomatik verilen öğrenci kodları) da kartlara basılıp dağıtıldı.
Bu kodlarla kaydolan her kişi `kayit-yap` içinde o velinin **onaysız (kabul)** takibine giriyordu →
alakasız veliler başka çocukların verisini gördü.

## 1) Her referans kodu/kartı eşsiz — routes/admin.js, routes/auth.js, views/admin.ejs
- **Kart çıktısı artık her seferinde SIFIRDAN yönetici kodu üretir** ve hemen `yazdirildi` işaretler.
  Hiçbir veli/öğretmen/kurum kodu karta düşemez; bir kod ikinci kez basılamaz (`?tekrar=1` kaldırıldı).
- `referansKoduUret`: eşzamanlı üretimde E11000 çakışması yakalanır, kod atlanıp yenisi üretilir.
- Admin "Bekleyen Kodlar" listesi: yalnız **yönetici kodu** kopyalanabilir. Kullanıcıya ait kodlar
  "🔒 Kullanıcıya ait — dağıtma", karttaki kodlar "🖨️ Kartta basılı" olarak salt okunur.
- "Tüm Bekleyenleri Sil" → **Yönetici Kodlarını Sil** (kullanıcıların davet linkleri silinmez).

## 2) Dağıtılmış kartlar için kayıt koruması — routes/auth.js
- `kodSahibiCoz(ref)`: **basılı karta düşmüş kullanıcı kodu** sahipsiz (yönetici kodu) sayılır:
  rol tipten belirlenir (veli kartı → veli), **otomatik takip kurulmaz**. Elde kalan kartlar
  güvenle kullanılabilir. Sunucu loguna `[kayit-yap] Basili karttaki kullanici kodu …` yazılır.

## 3) Veli Takip Taraması — /admin/veli-tarama (services/veliTarama.js)
Admin > Kullanıcılar > **🛡️ Veli Taraması** (Referans sayfasında da bağlantı var). Yalnız okur; işlem
butonla yapılır. Her veli–öğrenci takibine şüphe puanı:
| İşaret | Puan |
|---|---|
| Öğrenci, velinin kodu **basılı karta düştükten sonra** o kartla kaydolmuş | +100 (kesin) |
| Velinin çocuk sayısı eşiği aşıyor (varsayılan 4, sayfadan değişir) | +30 |
| Öğrencinin 3+ velisi var | +20 |
| Farklı il / farklı ilçe | +25 / +10 |
| Velinin basılmamış davet linkiyle kaydolmuş | −20 |
| Öğrenci isteği kendisi kabul etmiş | −40 |
| Öğrenci "evet, velim" demiş | −100 |
Kategori: Kesin ≥100, Yüksek ≥40, Orta ≥20, Düşük <20. Öğretmen takipleri yalnız basılı kart
sızıntısıysa listelenir.
- **Seçilenleri takipten ayır** / **Kesin şüphelilerin tümünü ayır** (`/admin/veli-tarama/ayir`):
  ilişki `red` olur, `ayrilmaSebebi='admin-tarama'`. "Ayrılan veliye bildirim gönder" işaretliyse veliye
  sistem bildirimi gider (çocuğuysa yeniden istek gönderebilir; öğrenci onaylarsa bağlantı döner).
- **Kartlardaki kodları yönetici koduna çevir** (`/admin/veli-tarama/kod-temizle`): basılı ama
  kullanılmamış kullanıcı kodları yönetici koduna çevrilir (eski sahip `oncekiOlusturan`'da saklanır);
  kart geçerli kalır, veli panelinden kalkar.

## 4) Öğrenci kendini takip eden velileri görür — routes/panel.js, routes/takip.js, views/panel.ejs
- Onaylanmamış veli varsa öğrenci panelinin en üstünde (soru çözme ekranı hariç) sarı kart:
  "👪 Seni takip eden veliler" — her velinin yanında **✓ Evet, velim** ve **✕ Takipten çıkar**.
- `POST /takip/veli-onayla`: öğrenci onayı (`ogrenciOnayTarih`). Öğrenci veli isteğini kabul
  ettiğinde de onay otomatik yazılır. Tüm veliler onaylanınca kart kalkar.
- Takip sayfası: "Beni Takip Edenler (öğretmen ve veli)" — veli satırları 👪 Veli etiketiyle.

## 5) Bildirim — services/sistemBildirim.js, routes/takip.js, routes/panel.js
- Öğrenci bir veliyi takipten çıkarınca veliye: **"«öğrenci» kullanıcısı sizi takipten çıkardı…"**
  (Mesaj `kaynak:'sistem'`; panel > Mesajlar'da 🔔 Sistem bildirimi, üst menüde rozet).
- Sistem bildirimleri admin mesaj gelen kutusunda listelenmez.
- Düzeltme: Mesajlar sayfası açılınca yeni cevaplar/bildirimler artık **okundu** işaretlenir
  (rozet önceden hiç kalkmıyordu).

## Modeller
- TakipIliski: `ogrenciOnayTarih`, `ayrilmaSebebi`, `ayrilmaTarih` (yeni, varsayılanlı).
- ReferansKodu: `oncekiOlusturan` (yeni, varsayılanlı). Göç gerekmez.

## Test (yerel demo kopyası, sızıntı senaryosu)
- Velinin 6 kodu basılı → 6 alakasız öğrenci takipte: tarama 6'sını **Kesin** buldu; "Kesin
  şüphelilerin tümünü ayır" → 6 ilişki ayrıldı, veliye 6 bildirim; veli artık detay sayfasını ve
  istatistik API'sini açamıyor ("Erişim engellendi").
- Elde kalan basılı kartla kayıt → rol veli, takip ilişkisi 0.
- Yeni kart çıktısı → 3 kod, hepsi `olusturan:'admin'`, `yazdirildi:true`; kullanıcı kodu yok.
- Öğrenci: kartta 2 veli; birini onayladı, diğerini çıkardı → çıkarılan veli Mesajlar'da bildirimi
  rozetle gördü; ikinci açılışta rozet kalktı. Admin gelen kutusunda sistem kaydı yok.
- `node --check` tüm routes/services/models; panel.ejs ve admin.ejs derlendi; CRLF korundu.

## Değişen dosyalar
- routes/admin.js, routes/auth.js, routes/takip.js, routes/panel.js
- views/panel.ejs, views/admin.ejs
- models/TakipIliski.js, models/ReferansKodu.js
- services/veliTarama.js (yeni), services/sistemBildirim.js (yeni)
- package.json (4.17.19 -> 4.17.20)
