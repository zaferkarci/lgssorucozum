const mongoose = require('mongoose');

module.exports = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true },
    sifre: String,
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    sube: { type: String, default: '' },
    soruIndex: { type: Number, default: 0 },
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number }],
    // Ders bazlı istatistikler
    dersPuanlari: [{
        ders:        String,
        toplamPuan:  { type: Number, default: 0 },
        soruSayisi:  { type: Number, default: 0 },
        toplamSure:  { type: Number, default: 0 }
    }],
    // Sıralama cache (cron job'da 05:00'da güncellenir)
    siralamaCache: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    siralamaCacheTarih: { type: Date, default: null }
}));
