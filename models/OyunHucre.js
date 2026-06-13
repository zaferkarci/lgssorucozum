const mongoose = require('mongoose');

// v4.9.0: Gezegen uzerindeki tek bir sahipli hucre. Bos hucreler kayit tutmaz;
//   yalnizca satin alinan/ele gecirilen hucreler burada bulunur.
const OyunHucreSchema = new mongoose.Schema({
    sinif:     { type: String, required: true },  // gezegen
    x:         { type: Number, required: true },
    y:         { type: Number, required: true },
    sahip:     { type: String, required: true, index: true }, // kullaniciAdi
    alisTarih: { type: Date, default: Date.now }
});

// Ayni gezegende bir koordinat yalnizca bir kez sahiplenilebilir.
OyunHucreSchema.index({ sinif: 1, x: 1, y: 1 }, { unique: true });

module.exports = mongoose.model('OyunHucre', OyunHucreSchema);
