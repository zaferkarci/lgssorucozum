const mongoose = require('mongoose');

const CevapKaydiSchema = new mongoose.Schema({
    soruId: { type: mongoose.Schema.Types.ObjectId, ref: 'Soru', index: true },
    kullaniciAdi: { type: String, index: true },
    dogruMu: Boolean,
    sure: Number,
    kazanilanPuan: { type: Number, default: 0 },
    tarih: { type: Date, default: Date.now }
});

// Compound index — ham puan hesabı için (soruId + dogruMu)
CevapKaydiSchema.index({ soruId: 1, dogruMu: 1 });

module.exports = mongoose.model('CevapKaydi', CevapKaydiSchema);
