const mongoose = require('mongoose');

module.exports = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, unite: String, konu: String, soruOnculu: String,
    soruMetni: String, soruResmi: String,
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    hamPuan: { type: Number, default: null },
    zorlukKatsayisi: { type: Number, default: 3 },
    cozumSureleriTum: [Number],
    dogruCevapSureleri: [Number]
}));
