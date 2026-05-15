const mongoose = require('mongoose');

// v4.3.18: Kurum içi sınıf modeli.
// Bir kurumda 8/A, 8/B, 7/A gibi sınıflar var. Her sınıfa N öğretmen atanabilir
// (sınırsız). Öğretmen kuruma bağlı (onaylanmış) olmalı veya kurumsal yöneticinin
// kendisi olmalı.
//
// "Karma" yaklaşım: Sınıflar öğrencilerin sinif+sube beyanından otomatik üretilir
// (kurum üyeleri sayfası açıldığında lazy). Kurumsal yönetici ileride bir öğrencinin
// sinif/sube'sini güncelleyebilir.
const KurumSinifSchema = new mongoose.Schema({
    kurumId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Kurum', required: true, index: true },
    sinif:             { type: Number, required: true },              // 5, 6, 7, 8
    sube:              { type: String, required: true },              // 'A', 'B', vb
    atananOgretmenler: [{ type: String }],                            // [kullaniciAdi]
    olusmaTarih:       { type: Date,   default: Date.now }
});

// Aynı kurumda aynı sinif+sube tek olmalı
KurumSinifSchema.index({ kurumId: 1, sinif: 1, sube: 1 }, { unique: true });

module.exports = mongoose.model('KurumSinif', KurumSinifSchema);
