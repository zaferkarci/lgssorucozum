# v4.17.19 — Soru çözerken zorluk gizlendi

## Sorun
Öğrenci soru çözme ekranında, soru kartının üst etiket çubuğunda "Zorluk: …" görünüyordu.
Öğrenci zorluğu cevap vermeden önce görüyordu; oysa cevaptan sonra sonuç bandında zaten
zorluk ve kazanılan puan gösteriliyor.

## Çözüm — views/panel.ejs
- Öğrenci çözüm ekranındaki (`sorular.length && basla` dalı) `ep-zorluk` etiketi artık
  yalnız `moderator || demo` iken basılıyor. Gerçek öğrenci çözüm sırasında zorluğu görmez.
- Cevaptan sonraki sonuç bandı ("Bu sorunun zorluğu: …") aynen korundu.
- Öğretmen/kurumsal "Örnek Soru" ekranındaki zorluk etiketi değiştirilmedi.
- `zorlukBilgisi(soru)` hesabı ve diğer etiketler (sınıf, ders, ünite, konu, hatalı soru bildir, süre) aynen.

## Test
- panel.ejs ejs ile derlendi.
- Değişen satır 3 durumda render edildi: öğrenci → etiket yok; moderatör → var; demo → var.

## Değişen dosyalar
- views/panel.ejs
- package.json (4.17.18 -> 4.17.19)
