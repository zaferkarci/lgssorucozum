const mongoose = require('mongoose');

// v4.9.8: Oyun haritasinda elle kilitlenen hucreler (GLOBAL - tum sinif
//   dunyalarinda gecerli). Admin tiklayarak ekler/cikarir.
const OyunKilitSchema = new mongoose.Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true }
}, { timestamps: true });

OyunKilitSchema.index({ x: 1, y: 1 }, { unique: true });

module.exports = mongoose.model('OyunKilit', OyunKilitSchema);
