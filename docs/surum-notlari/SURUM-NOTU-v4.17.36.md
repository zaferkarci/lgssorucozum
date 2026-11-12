# Sürüm Notu — v4.17.36

**Tarih:** 10 Kasım 2026
**Tür:** Günün ilk güncellemesi (tam paket, package.json 4.17.36)

## "Kendi kendine işaretledi" — çift / hayalet dokunma koruması

### Bulgu (canlı veri, son 35 gün)
- **13 kez:** öğrenci bir soruyu cevapladıktan ~1,5 sn sonra, **henüz görmediği** sonraki soruya 1 sn'lik cevap kaydı.
  Telefonun ikinci dokunuşu yeni açılan sayfada aynı yere düşüyor → öğrenci "kendi kendine işaretlendi" görüyor.
- **5 kez:** aynı soruya 0,2 sn arayla **iki kayıt** (çift gönderim; v4.16.6'daki 5 sn koruması aynı anda gelen iki isteği yakalayamıyordu).
- 3 sn'den kısa cevaplarda 25 ve 29 Ekim (görsel güncellemeleri) sonrasında artış yok; görsel değişiklikleri neden değil.

### Düzeltme
1. **Tarayıcı:** soru sayfası açıldıktan sonraki ilk 1 sn'de şık ve "Geç" dokunuşları yok sayılır;
   bir şık gönderilince tüm şıklar ve "Geç" kilitlenir (ikinci dokunuş hiçbir şey göndermez).
2. **Sunucu:** aynı öğrencinin bir önceki cevap isteğinden 2,5 sn geçmeden gelen istek **yazılmaz**; öğrenci soruyu yeniden görür.
   Kontrol veritabanına gitmeden önce yapıldığı için aynı anda gelen iki istekte de yalnız ilki geçer.
   (Gerçek bir sonraki cevap — sayfa açılışı + okuma — 2,5 sn'den kısa sürmez.)

### Eski kayıtların temizliği: `scripts/hayalet-cevap-temizle.js` (tek seferlik)
- **ÇİFT:** aynı soruya 2,5 sn içinde ikinci kayıt → fazladan kayıt silinir (puan/istatistik iki kez sayılıyordu).
- **HAYALET:** bir cevaptan 2,5 sn içinde başka soruya en fazla 2 sn'lik cevap → silinir; soru öğrenciye yeniden gelir.
- `--uygula` olmadan yalnız listeler. Puanlar ve istatistikler bir sonraki gece hesabında (05:10) güncellenir.
```
su - elcezeri -c "cd ~/lgssorucozum && node scripts/hayalet-cevap-temizle.js"
su - elcezeri -c "cd ~/lgssorucozum && node scripts/hayalet-cevap-temizle.js --uygula"
```

## Öykü: "soruları göremiyor"
- Kod hatası değil: 5. sınıfta yayında 94 soru var, Öykü 61'ini çözmüş; kalan 33 sorunun hepsi **kapalı konularda**
  (5. sınıfta 10 kapalı konu). Admin › Konu İzinleri'nden sıradaki konular açılınca soruları gelir.

## Değişen dosyalar
- `routes/panel.js` — /cevap: 2,5 sn hayalet/çift istek koruması
- `views/panel.ejs` — soru sayfası: açılışta 1 sn dokunma koruması, gönderimden sonra şık kilidi
- `scripts/hayalet-cevap-temizle.js` — yeni (eski kayıtları listeler / siler)
- `package.json` — 4.17.36
- `docs/surum-notlari/SURUM-NOTU-v4.17.36.md` — bu not

## Test (demo, telefon görünümü)
- Açılıştan hemen sonra dokunma → gönderilmedi. 1,2 sn sonra çift dokunma → tek kayıt.
- Yeni soru açılır açılmaz dokunma → gönderilmedi.
- Tarayıcıyı atlayıp aynı anda 2 istek → 1 kayıt (ikincisi yok sayıldı); 1 sn sonra başka soruya istek → yok sayıldı.
- Temizlik komutu: 1 ÇİFT + 2 HAYALET bulundu, `--uygula` ile silindi, ikinci çalıştırmada 0.
