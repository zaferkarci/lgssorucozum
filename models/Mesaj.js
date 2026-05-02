const mongoose = require('mongoose');

const MesajSchema = new mongoose.Schema({
    adSoyad:    { type: String, required: true },
    email:      { type: String, required: true },
    telefon:    { type: String, default: '' },
    konu:       { type: String, default: '' },
    mesaj:      { type: String, required: true },
    okundu:     { type: Boolean, default: false, index: true },
    yazilmaTarih: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Mesaj', MesajSchema);
