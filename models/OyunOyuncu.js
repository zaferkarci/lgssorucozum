const mongoose = require('mongoose');

// v4.9.0: "Bilgi Gezegenleri" oyunu — bir oyuncunun bir gezegendeki (sinif) durumu.
//   Mevcut Kullanici/puanlama modellerine DOKUNMAZ; ayri koleksiyon.
//   Altin bakiyesi = (toplam kazanilan puan) - harcananAltin. Puan asla azalmaz;
//   bakiye yalnizca bu modeldeki harcananAltin ile dusurulur.
const OyunOyuncuSchema = new mongoose.Schema({
    kullaniciAdi:  { type: String, required: true, index: true },
    sinif:         { type: String, required: true },   // gezegen: '5','6','7','8'
    rumuz:         { type: String, default: '' },        // sabit, otomatik takma ad
    renk:          { type: String, default: '#64b5f6' }, // haritada hucre rengi
    harcananAltin: { type: Number, default: 0 },
    olusturma:     { type: Date, default: Date.now }
});

OyunOyuncuSchema.index({ sinif: 1, kullaniciAdi: 1 }, { unique: true });

module.exports = mongoose.model('OyunOyuncu', OyunOyuncuSchema);
