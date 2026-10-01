const mongoose = require('mongoose');

// v4.17.8: "Bunlar farkli sorular" olarak isaretlenen ciftler.
//   Telafi ekraninda bir daha gosterilmez. Anahtar, iki soru id'sinin
//   siralanmis birlesimi oldugu icin (a,b) ve (b,a) ayni kaydi verir.
const DuplicateYoksaySchema = new mongoose.Schema({
    anahtar:    { type: String, unique: true, index: true }, // 'kucukId_buyukId'
    aId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Soru' },
    bId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Soru' },
    isaretleyen:{ type: String, default: 'admin' },
    tarih:      { type: Date, default: Date.now }
});

// Iki id'den sabit anahtar uret
DuplicateYoksaySchema.statics.anahtarUret = function (a, b) {
    const x = String(a), y = String(b);
    return x < y ? x + '_' + y : y + '_' + x;
};

module.exports = mongoose.model('DuplicateYoksay', DuplicateYoksaySchema);
