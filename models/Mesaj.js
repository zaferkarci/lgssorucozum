const mongoose = require('mongoose');

const MesajSchema = new mongoose.Schema({
    adSoyad:    { type: String, required: true },
    email:      { type: String, required: true },
    telefon:    { type: String, default: '' },
    konu:       { type: String, default: '' },
    mesaj:      { type: String, required: true },
    okundu:     { type: Boolean, default: false, index: true },
    // v4.17.14: Panel ici yazisma + hatali soru bildirimi ayni sistemde.
    //   kaynak: 'iletisim' (girissiz form) | 'panel' (ogrenci/veli paneli) | 'hatali-soru'
    kullaniciAdi: { type: String, default: '', index: true },  // girissiz ise bos
    kaynak:       { type: String, default: 'iletisim', index: true },
    soruId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Soru', default: null },
    soruBilgi:    { type: String, default: '' },   // ozet: ders/konu/soru no
    ogrenciOkudu: { type: Boolean, default: true },// yeni cevap gelince false olur
    yazilmaTarih: { type: Date, default: Date.now, index: true },
    // v4.17.13: Admin cevaplari. YALNIZCA admin oturumlu uclardan okunur/yazilir;
    //   hicbir genel (public) sayfa veya API bu alani dondurmez.
    yanitlar: [{
        metin: { type: String, default: '' },
        yazan: { type: String, default: 'admin' },
        tarih: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Mesaj', MesajSchema);
