const mongoose = require('mongoose');

module.exports = mongoose.model('Unite', new mongoose.Schema({
    sinif:     { type: String, default: '' },
    ders:      { type: String, required: true },
    uniteNo:   { type: Number, required: true },
    uniteAdi:  { type: String, required: true },
    konular:   [String]
}));
