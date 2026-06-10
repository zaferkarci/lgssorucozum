const mongoose = require('mongoose');

// v4.8.7: Konu izinleri.
// Varsayilan ACIK semantigi: yalnizca KAPATILAN (acik:false) konular saklanir.
// Kayit yoksa ilgili sinif/ders/unite/konu ACIK kabul edilir (mevcut davranis korunur).
const KonuIzinSchema = new mongoose.Schema({
    sinif: { type: String, default: '' },
    ders:  { type: String, default: '' },
    unite: { type: String, default: '' },
    konu:  { type: String, default: '' },
    acik:  { type: Boolean, default: true }
});

KonuIzinSchema.index({ sinif: 1, ders: 1, unite: 1, konu: 1 }, { unique: true });

module.exports = mongoose.model('KonuIzin', KonuIzinSchema);
