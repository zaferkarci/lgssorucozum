const mongoose = require('mongoose');

// Haberler & Duyurular — admin tarafından yazılır, herkese gösterilir
const HaberSchema = new mongoose.Schema({
    baslik:    { type: String, required: true },
    icerik:    { type: String, required: true },
    yayinTarih: { type: Date, default: Date.now, index: true },
    olusturan: { type: String, default: 'admin' }
});

module.exports = mongoose.model('Haber', HaberSchema);
