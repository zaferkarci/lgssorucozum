const mongoose = require('mongoose');

const YasakliKelimeSchema = new mongoose.Schema({
    kelime: { type: String, unique: true, index: true, lowercase: true },
    ekleyenTarih: { type: Date, default: Date.now }
});

module.exports = mongoose.model('YasakliKelime', YasakliKelimeSchema);
