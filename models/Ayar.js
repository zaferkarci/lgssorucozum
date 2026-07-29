const mongoose = require('mongoose');

// Basit anahtar-değer sistem ayarları (genişletilebilir).
// Örn: { anahtar: 'siralama_min_ort30', deger: 2 }
module.exports = mongoose.model('Ayar', new mongoose.Schema({
    anahtar: { type: String, unique: true, index: true },
    deger:   { type: mongoose.Schema.Types.Mixed, default: null },
    guncelleme: { type: Date, default: Date.now }
}));
