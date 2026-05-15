const mongoose = require('mongoose');

// v4.3.0: Kurum modeli — okul, dershane, özel kurs gibi kurumları temsil eder.
// Kavramsal olarak "okul" ama esnek bırakıldı; ileride farklı kurum tipleri eklenebilir.
// Kurumsal rol sahibi bir Kullanıcı bir Kurum'u yönetir (Kullanici.yonettigiKurumId).
// Öğretmen ve öğrenciler bir kuruma bağlanabilir (Kullanici.bagliKurumId).
module.exports = mongoose.model('Kurum', new mongoose.Schema({
    ad:                    { type: String, required: true, trim: true },
    tip:                   { type: String, default: 'okul', enum: ['okul', 'dershane', 'kurs', 'diger'] },
    il:                    { type: String, default: '', trim: true },
    ilce:                  { type: String, default: '', trim: true },
    aciklama:              { type: String, default: '', trim: true },
    olusturanKullaniciAdi: { type: String, default: '' }, // kurumsal kullanıcının kullaniciAdi
    olusturmaTarih:        { type: Date, default: Date.now }
}));
