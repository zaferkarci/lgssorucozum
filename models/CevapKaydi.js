const mongoose = require('mongoose');

module.exports = mongoose.model('CevapKaydi', new mongoose.Schema({
    soruId: { type: mongoose.Schema.Types.ObjectId, ref: 'Soru', index: true },
    kullaniciAdi: { type: String, index: true },
    dogruMu: Boolean,
    sure: Number,
    kazanilanPuan: { type: Number, default: 0 },
    tarih: { type: Date, default: Date.now }
}));
