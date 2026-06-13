# v4.9.1 — Analiz etiketi geriye dönük onarım aracı (TAM PROJE)

Çalışan TÜM proje. v4.9.0 üzerine kuruludur.

## Sorun
v4.8.19'daki "analiz cevapları hedefe sayılmaz" kuralı, etiketi yalnız o sürümden
SONRAKİ cevaplara yazıyor. v4.8.19 deploy'undan ÖNCE analiz yapmış öğrencilerin
(ör. zaynephafsa) analiz cevapları etiketsiz (analiz=false) kaldığı için günlük
hedef ortalamasına giriyor ve hedefi şişiriyordu.

## Çözüm — tek seferlik onarım aracı (admin)
Yeni uç: `GET /admin/analiz-etiket-onar?kullanici=ADI`
- Öğrencinin TÜM cevaplarını tarih sırasıyla **replay eder** ve her cevabın
  verildiği an analiz tamamlanmamışsa onu analiz cevabı sayar — canlı etiketleme
  (`analizModundaMi`) ile **birebir aynı** mantık (KonuIzin açık konular, sınıf
  yayında soruları, konu başına min(2,toplam) distinct eşiği).
- Varsayılan = **kuru çalışma**: sadece raporlar (kaç cevap işaretlenecek), DB'ye
  dokunmaz.
- `&uygula=1` eklenince analiz dönemindeki cevaplara `analiz:true` yazar.

Sadece okuma + tek `updateMany`; puan, süre, istatistik, başarı yüzdeleri
DEĞİŞMEZ — yalnız hedef hesabının dışlayacağı etiket düzeltilir.

## zaynephafsa için kullanım
1. Önce kuru çalışma (rapor):
   `https://<site>/admin/analiz-etiket-onar?kullanici=zaynephafsa`
2. Rapordaki "işaretlenecek cevap" sayısı makul görünüyorsa uygula:
   `https://<site>/admin/analiz-etiket-onar?kullanici=zaynephafsa&uygula=1`
3. zaynephafsa paneline girince hedef kartı analiz cevapları hariç yeniden
   hesaplanır (ilk gün tabanı 2).

Not: Aynı aracı v4.8.19 öncesi analiz yapmış başka kullanıcılar için de
kullanabilirsin. Bundan sonra açılan/yeni analiz yapan öğrencilerde etiket zaten
canlı yazıldığı için onarım gerekmez.

## Değişen dosyalar (v4.9.0 tabanına göre)
- routes/admin.js   (yeni /admin/analiz-etiket-onar uç)
- package.json      (4.9.0 → 4.9.1)
Başka HİÇBİR dosya değişmedi (diff ile doğrulandı).

## Test
- routes/admin.js node --check geçti; EOL korundu (LF).
- Replay simülasyonu: analiz dönemindeki cevaplar doğru seçildi, analiz bittikten
  sonraki serbest pratik cevapları hariç tutuldu.

## Roadmap notu
Oyun düellosu (önceden v4.9.1 denmişti) artık **v4.9.2**'ye kaydı.

## Git
```bash
git add -A
git commit -m "v4.9.1: analiz etiketi geriye donuk onarim araci"
git push
git tag v4.9.1
git push origin v4.9.1
```
