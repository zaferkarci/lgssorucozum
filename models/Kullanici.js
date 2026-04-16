const mongoose = require('mongoose');

module.exports = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true },
    sifre: String,
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    soruIndex: { type: Number, default: 0 },
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number }]
}));
