const mongoose = require('mongoose');

// Düello sonuçları (admin istatistikleri için). Mevcut oyun/düello mantığına
// DOKUNMAZ; düello bitince ayrı koleksiyona yalnızca ekleme yapılır.
module.exports = mongoose.model('DuelloKayit', new mongoose.Schema({
    sinif:         { type: String, default: '', index: true },
    saldiranAd:    { type: String, default: '', index: true }, // kullaniciAdi
    saldiranRumuz: { type: String, default: '' },
    rakipAd:       { type: String, default: '', index: true }, // kullaniciAdi
    rakipRumuz:    { type: String, default: '' },
    soruId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Soru', default: null },
    saldiranSure:  { type: Number, default: null },
    rakipSure:     { type: Number, default: null },
    kazananAd:     { type: String, default: '' },              // kullaniciAdi
    // v4.17.37-2: hucre konumu ve savunanin suresi gecersiz (sans eseri) sayildi mi
    x:             { type: Number, default: null },
    y:             { type: Number, default: null },
    rakipGecersiz: { type: Boolean, default: false },
    tarih:         { type: Date, default: Date.now, index: true }
}));
