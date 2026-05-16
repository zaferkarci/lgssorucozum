const mongoose = require('mongoose');

// Öğretmen-Öğrenci takip ilişkisi modeli
// İstek akışı: Öğretmen istek gönderir (durum: 'beklemede') → Öğrenci kabul/red eder
// v4.3.20: 'kaynak' alanı eklendi — takip ilişkisinin nasıl oluştuğunu belirtir.
//   'bireysel' → öğretmen kendi davet kodu/isteğiyle takip (normal akış)
//   'sinif'    → kurum sınıf öğretmeni ataması sonucu otomatik oluşan takip
// Öğretmen sınıftan çıkarılınca sadece 'sinif' kaynaklı takipler silinir.
const TakipIliskiSchema = new mongoose.Schema({
    ogretmenAdi:    { type: String, required: true, index: true }, // takip eden öğretmen
    ogrenciAdi:     { type: String, required: true, index: true }, // takip edilen öğrenci
    isteyenRol:     { type: String, default: 'ogretmen' },         // 'ogretmen' veya 'ogrenci' — kim başlattı
    durum:          { type: String, default: 'beklemede' },        // 'beklemede' | 'kabul' | 'red'
    kaynak:         { type: String, default: 'bireysel' },         // 'bireysel' | 'sinif'
    istekTarih:     { type: Date, default: Date.now },
    yanitTarih:     { type: Date, default: null }
});

// Aynı çift için sadece bir aktif kayıt olsun (unique compound index)
TakipIliskiSchema.index({ ogretmenAdi: 1, ogrenciAdi: 1 }, { unique: true });

module.exports = mongoose.model('TakipIliski', TakipIliskiSchema);
