const mongoose = require('mongoose');

const ReferansKoduSchema = new mongoose.Schema({
    kod:            { type: String, unique: true, index: true },
    olusturan:      { type: String, index: true }, // kullaniciAdi veya "admin"
    // v4.3.0: 'kurumsal' tipi eklendi — kurumsal kullanıcı kayıtları için
    tip:            { type: String, default: 'ogrenci' }, // 'ogrenci' | 'ogretmen' | 'kurumsal'
    // v4.3.0: Kurumsal davet kodları hangi kuruma bağlı olduğunu tutar.
    // Kurumsal kullanıcı bir kurumu yönettiğinde, ürettiği öğrenci/öğretmen kodları
    // o kuruma otomatik bağlanır (kayıt olan öğretmen/öğrenci direkt kuruma kaydolur).
    kurumId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Kurum', default: null },
    kullanildi:     { type: Boolean, default: false },
    kullanan:       { type: String, default: null },
    kopyalandi:     { type: Boolean, default: false },
    kopyalanmaTarih: { type: Date, default: null },
    olusturmaTarih: { type: Date, default: Date.now },
    kullanimTarih:  { type: Date, default: null }
});

module.exports = mongoose.model('ReferansKodu', ReferansKoduSchema);
