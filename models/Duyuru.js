const mongoose = require('mongoose');

// v4.16.46: Önemli duyuru pop-up'ı. Aynı anda yalnız BİR duyuru aktif olur
// (yeni duyuru yayınlanınca öncekiler pasife çekilir).
// Hedefleme:
//   hedefTip 'hepsi'       -> tüm öğrenciler
//   hedefTip 'sinif'       -> hedefSiniflar dizisindeki sınıf seviyeleri (13 = Mezun)
//   hedefTip 'kullanicilar'-> hedefKullanicilar dizisindeki kullaniciAdi'lar
const DuyuruSchema = new mongoose.Schema({
    aktif:      { type: Boolean, default: false, index: true },
    metin:      { type: String, default: '' },
    gorselUrl:  { type: String, default: '' },
    kilitli:    { type: Boolean, default: false }, // true: kapatilamaz, arka planla etkilesim yok
    hedefTip:   { type: String, default: 'hepsi' }, // 'hepsi' | 'sinif' | 'kullanicilar'
    hedefSiniflar:     { type: [Number], default: [] },
    hedefKullanicilar: { type: [String], default: [] },
    olusturan:  { type: String, default: 'admin' },
    yayinTarih: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Duyuru', DuyuruSchema);
