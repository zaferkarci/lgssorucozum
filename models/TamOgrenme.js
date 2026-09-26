const mongoose = require('mongoose');

// v4.17.0: Tam Ogrenme ilerleme durumu — kullanici + ders basina TEK kayit.
//   Konu sirasi ve %85 basarisi CevapKaydi'ndan turetilir (burada saklanmaz);
//   burada yalnizca AKIS durumu tutulur:
//     blokSayac      -> son tekrar turundan beri cozulen soru sayisi
//     tekrarKuyrugu  -> tekrar turunda sorulacak konular (her konu 2 kez eklenir)
const TamOgrenmeSchema = new mongoose.Schema({
    kullaniciAdi: { type: String, index: true },
    sinif:        { type: String, default: '' },
    ders:         { type: String, default: '' },
    blokSayac:    { type: Number, default: 0 },
    tekrarKuyrugu:{ type: [String], default: [] },
    guncelleme:   { type: Date, default: Date.now }
});

TamOgrenmeSchema.index({ kullaniciAdi: 1, sinif: 1, ders: 1 }, { unique: true });

module.exports = mongoose.model('TamOgrenme', TamOgrenmeSchema);
