# v4.16.52 — Sınıf atlatmada OYUN sıfırlama + eski dünya temizliği

## Sorun
Sınıf atlatma sonrası öğrenci yeni sınıfın oyun dünyasında sıfırdan başlıyordu (OyunOyuncu
{sinif,kullaniciAdi} bazlı olduğu için), ANCAK eski sınıfın haritasındaki fethedilmiş
hücreleri hâlâ onun üzerine kayıtlı kalıyordu. Sonuç: 6. sınıf dünyası, artık orada
olmayan öğrencilerin toprakları ile doluydu; o hücreler kimseye açılmıyordu.

Sebep: OyunHucre kaydı {sinif, x, y, sahip} şeklinde; sahip alanı kullanıcının SINIFINDAN
bağımsız. Sınıf değişince bu kayıtlar öksüz kalıyor.

## Yapılanlar
### routes/admin.js — /admin/sinif-atlat (uygula)
- Her atlatılan grup için, atlatma sonrası o öğrencilerin TÜM oyun verisi silinir:
  OyunHucre {sahip: $in adlar} ve OyunOyuncu {kullaniciAdi: $in adlar}.
- Böylece eski dünyadaki topraklar boşa çıkar, öğrenci yeni dünyada gerçekten sıfırdan
  başlar. Kendi try/catch'i var; hata atlatmayı bozmaz.
- Kullanıcı sorgusuna kullaniciAdi eklendi, gruplara `adlar[]` toplanıyor.

### YENİ: /admin/oyun-temizle (Sistem > 🧹 Oyun Temizliği)
Önceki sürümlerde oluşmuş mevcut karışıklığı onarır:
- Tüm OyunHucre ve OyunOyuncu kayıtları taranır; kaydın `sinif`'i sahibinin GÜNCEL
  sınıfıyla uyuşmuyorsa (ya da kullanıcı hiç yoksa) temizlenecek olarak işaretlenir.
- Öğrencinin KENDİ güncel sınıfındaki ilerlemesine DOKUNULMAZ.
- Kuru çalışma (varsayılan): dünya / oyuncu / hücre sayısı / sebep tablosu.
  ?uygula=1 ile siler.
- OyunKilit (global kilitli hücreler) hiç etkilenmez.

## %100 korunan
- Oyun mantığı, düello, puanlama, diğer tüm kod. Sadece temizlik eklendi.

## Test
- node --check admin.js geçti; admin.ejs render (ayarlar/duello/kullanicilar/yedek) OK,
  Sistem menüsünde 5 link de görünüyor.
- Tespit mantığı simülasyonu: eski dünya hücreleri (alpay@6: 3 hücre + oyuncu kaydı),
  Mezun olanın eski kaydı (zeynep@12), silinmiş kullanıcı kaydı tespit edildi;
  GÜNCEL dünyadaki kayıtlar (alpay@7, mehmet@8) korundu.

## Kullanım
1. Mevcut karışıklık için: Admin → Sistem → 🧹 Oyun Temizliği → kuru çalışma → uygula.
2. Bundan sonraki sınıf atlatmalarda temizlik otomatik yapılır.

## Değişen dosyalar
- routes/admin.js, views/admin.ejs
- package.json (4.16.51 -> 4.16.52)

## Git
```bash
git add -A
git commit -m "v4.16.52: sinif atlatmada oyun sifirlama + eski dunya temizligi"
git push
git tag v4.16.52
git push origin v4.16.52
```
