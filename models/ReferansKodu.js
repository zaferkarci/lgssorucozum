const mongoose = require('mongoose');

const ReferansKoduSchema = new mongoose.Schema({
    kod:            { type: String, unique: true, index: true },
    olusturan:      { type: String, index: true }, // kullaniciAdi veya "admin"
    kullanildi:     { type: Boolean, default: false },
    kullanan:       { type: String, default: null },
    olusturmaTarih: { type: Date, default: Date.now },
    kullanimTarih:  { type: Date, default: null }
});

module.exports = mongoose.model('ReferansKodu', ReferansKoduSchema);
