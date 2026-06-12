# v4.8.10 — Zorunlu "Seviye Analizi" akışı (TAM PROJE)

Çalışan TÜM proje. v4.8.9 üzerine kuruludur. Onaylanan kararlarla:
analiz, %66 geçiş kapısının yerini alır; "2 soru" = 2 cevaplama; kilit yalnız soru-çöz akışında.

## Ne değişti
- **v4.8.8 %66 geçiş kapısı KALDIRILDI** (ve v4.8.9'daki gate boş-durum yaması da). Yerine
  zorunlu analiz geldi.
- **Zorunlu analiz:** Her gerçek öğrenci, sınıfına uygun ve Üniteler menüsünde **açık**
  (KonuIzin) olan HER (ders, ünite, konu)'dan en az **min(2, o konudaki yayında soru)**
  FARKLI soru **cevaplayana** kadar (doğru/yanlış fark etmez) analiz modundadır.
  - Analiz modunda **ders/eksik seçimi yok sayılır**; havuz yalnızca eksik konuların
    çözülmemiş sorularına kısılır. Sıralama (ünite→konu→kolaydan zora) her konuda doğal
    olarak 2'şer ilerletir; 2 cevaba ulaşan konu düşer, sıradakine geçilir.
  - İlk girişte (çözülen=0) ve analiz bitene kadar, "Soru Çöz" landing'inde **en zayıf
    konu kartının birebir aynısı stilde** bir "Seviye Analizi" kartı çıkar (buton →
    `?mod=soru&basla=true`). **Ders seçim grid'i ve en zayıf konu kartı gizlenir.**
  - **Yeni konu eklenince** (o konuda 0 cevaplı olunca) analiz otomatik tekrar zorunlu
    olur — ekstra kod yok, geçmiş cevaplardan hesaplandığı için kendiliğinden.
- **Analiz tamamlanınca:** eskisi gibi — önce en zayıf konu önerisi, altında ders isimleri
  (ders seçimi geri gelir). Serbest pratik; geçiş kapısı yok. Sorular gerçekten bitince
  "Sistemdeki tüm soruları çözdün" (eski mesaj geri döndü).

## Sabit kurallar / detaylar
- Konuda 2'den az soru varsa eşik = var olanların hepsi (min(2, toplam)); 0 ise o konu
  analize girmez. Kapalı (KonuIzin) konu analize girmez.
- "2 soru" FARKLI soru sayar (aynı sorunun tekrar cevabı çift saymaz).
- Kilit yalnız soru-çöz akışında: Profil/Takip/Haberler/çıkış serbest (ayrı rotalar,
  dokunulmadı). Öğrenci `?ders=` / `?eksik=` ile analizden kaçamaz (analizde yok sayılır).
- Öğretmen / kurumsal / moderatör / demo analize girmez (eskisi gibi her şeyi görür).
- Skip (geç) edilen soru cevap üretmez → "2"ye sayılmaz; o konu yine gelir. Skip puan
  cezası (/cevap) ve puanlama formülü **değişmedi**.

## Değişen dosyalar (v4.8.9 tabanına göre)
- routes/panel.js   (gate kaldırıldı; KonuIzin hoist; analiz state + havuz kısıtı;
                     ders/eksik yalnız analiz bitince; render'a analizTamamlandi/analizEksikSayisi)
- views/panel.ejs   (analiz kartı; landing'de ders grid + zayıf konu kartı analizTamamlandi'ya
                     bağlı; CTA başlık/altyazı; v4.8.9 mesajı orijinaline döndü)
- package.json      (4.8.9 → 4.8.10)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı). Çekirdek modeller ve puanlama korunur.

## Test
- routes/panel.js `node --check`, views/panel.ejs EJS derleme geçti; CRLF korundu (stray LF:0).
- Gate/seviyeTamamlandi kalıntısı: 0 (tamamen kaldırıldı).
- Analiz simülasyonu (4 senaryo): hiç çözmemiş→tüm konular eksik; min(2,1)=1 ile tek soruluk
  konu tek cevapla tamam; hepsinden 2→analiz tamam; kapalı konu analize girmiyor — hepsi doğru.

## Git
```bash
git add -A
git commit -m "v4.8.10: zorunlu seviye analizi - %66 gate kaldirildi, her konudan 2 soru"
git push
git tag v4.8.10
git push origin v4.8.10
```
