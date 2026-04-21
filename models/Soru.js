const mongoose = require('mongoose');

const SoruSchema = new mongoose.Schema({
    sinif: String, ders: String, unite: String, konu: String,
    soruOnculu1: String, soruOnculu1Resmi: String,
    soruOnculu2: String, soruOnculu2Resmi: String,
    soruOnculu3: String, soruOnculu3Resmi: String,
    soruResmi: String, soruMetni: String,
    secenekler: [{ metin: String, gorsel: String }],
    sikDizilimi: { type: String, default: 'dikey' },
    durum: { type: String, default: 'taslak' },
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    hamPuan: { type: Number, default: null },
    zorlukKatsayisi: { type: Number, default: 3 },
    cozumSureleriTum: [Number],
    dogruCevapSureleri: [Number]
});

// Index — yayında soru filtresi + zorluk sıralaması
SoruSchema.index({ durum: 1, zorlukKatsayisi: 1 });

module.exports = mongoose.model('Soru', SoruSchema);
