# v4.17.8 — Telafi: benzerlik tabanlı tespit + tek tek onay + "farklı" listesi

## Sorun
"Tekrar eden soru bulunamadı" diyordu ama gerçekte tekrar eden sorular vardı.
Sebep: telafi aracı YALNIZCA metin+şıkların BİREBİR aynı olduğu grupları arıyordu.
Küçük farklar (şık sırası, gizli boşluk, farklı tire/karakter, metinde ufak değişiklik)
imzayı değiştirdiği için gerçek tekrarlar yakalanmıyordu.

## Yeni davranış
- Tespit artık `duplicateTespit.duplicateBul` ile **benzerlik tabanlı**.
  Ekranda eşik seçilebiliyor: %100 / %95 / %90 / %85 (varsayılan) / %75.
- Sonuçlar **çift çift** listeleniyor; her çift yan yana gösteriliyor:
  soru no, ünite/konu, metin özeti, şıklar, **cevap sayısı** ve "Aç" bağlantısı.
- **Hiçbir işlem otomatik yapılmıyor.** Her çift için iki buton:
  * **"Aynı soru — telafi uygula"**: küçük soruNo'lu ASIL kalır; her iki soruyu da
    çözmüş kullanıcıların SONRAKİ çözümü silinir, puanı geri alınır (soruIndex -1);
    kopya arşivlenir (durum='arsiv') ve bir daha listeye girmez.
  * **"Farklı sorular — bir daha gösterme"**: çift DuplicateYoksay'a yazılır.

## YENİ models/DuplicateYoksay.js
- `anahtar` (iki id'nin sıralı birleşimi, unique) + aId/bId/isaretleyen/tarih.
- Sıralı anahtar sayesinde (a,b) ve (b,a) aynı kayıt sayılır.
- Ekranda kaç çiftin bu sebeple gizlendiği gösterilir.

## Bilinen sınır (sayfada da yazılı)
Tamamen görselden oluşan (metni boş) sorular taramaya girmez — benzerlik metin
üzerinden hesaplanır. Aynı görselin iki kez yüklenmesi farklı URL ürettiği için
görsel karşılaştırması da güvenilir olmaz.

## Test (sahte veri)
- "2 + 2 = ?" / "2+2=?" / "2 + 2 = kaçtır?" -> çiftler bulundu; farklı soru (üçgen)
  listeye girmedi.
- "Farklı" işaretlenen çift sonraki listede ÇIKMADI (3 -> 2).
- Telafi: küçük soruNo asıl seçildi, kopya arşivlendi.
- Puan: iki soruyu da çözen kullanıcının 2. çözümü silindi (-5 puan, -1 soruIndex);
  tek çözüm yapan kullanıcıya dokunulmadı.
- node --check (admin + model) geçti.

## Değişen/eklenen dosyalar
- models/DuplicateYoksay.js (yeni)
- routes/admin.js (telafi ucu yeniden yazıldı + /admin/duplicate-cift)
- package.json (4.17.7 -> 4.17.8)
