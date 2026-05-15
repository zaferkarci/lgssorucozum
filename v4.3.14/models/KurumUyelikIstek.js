const mongoose = require('mongoose');

// v4.3.7: Kurum üyelik istek modeli
// Öğretmen bir kuruma katılmak isterse istek atar. Kurumsal kullanıcı bekleyen
// istekleri görür, onaylar veya reddeder. Onaylanırsa kullanıcının bagliKurumId'si
// kurumun id'sine atanır ve kurum üye listesinde görünür.
// İleride öğrenci için de aynı model kullanılabilir (kullaniciRol = 'ogrenci').
const KurumUyelikIstekSchema = new mongoose.Schema({
    kullaniciAdi:    { type: String, required: true, index: true }, // istek atan kişi
    kullaniciRol:    { type: String, required: true },              // 'ogretmen' | 'ogrenci'
    kurumId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Kurum', required: true, index: true },
    durum:           { type: String, default: 'beklemede' },        // 'beklemede' | 'kabul' | 'red'
    istekTarih:      { type: Date, default: Date.now },
    yanitTarih:      { type: Date, default: null },
    yanitlayan:      { type: String, default: '' }                  // hangi kurumsal kullanıcı yanıtladı
});

// Aynı (kullanıcı, kurum) çifti için tek aktif istek
KurumUyelikIstekSchema.index({ kullaniciAdi: 1, kurumId: 1 }, { unique: true });

module.exports = mongoose.model('KurumUyelikIstek', KurumUyelikIstekSchema);
