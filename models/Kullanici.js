const mongoose = require('mongoose');

const KullaniciSchema = new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true, index: true },
    sifre: String,
    email: { type: String, default: '' },
    rol: { type: String, default: 'ogrenci' }, // 'ogrenci' | 'ogretmen' | 'moderator'
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    sube: { type: String, default: '' },
    soruIndex: { type: Number, default: 0 },
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
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
});

// Compound indexes — sıralama filtreleri için
KullaniciSchema.index({ il: 1, ilce: 1, okul: 1 });
KullaniciSchema.index({ okul: 1, sinif: 1, sube: 1 });

module.exports = mongoose.model('Kullanici', KullaniciSchema);
