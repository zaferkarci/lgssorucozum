const mongoose = require('mongoose');

const ReferansKoduSchema = new mongoose.Schema({
    kod:            { type: String, unique: true, index: true },
    olusturan:      { type: String, index: true }, // kullaniciAdi veya "admin"
    // v4.3.0: 'kurumsal' tipi eklendi — kurumsal kullanıcı kayıtları için
    tip:            { type: String, default: 'ogrenci' }, // 'ogrenci' | 'ogretmen' | 'kurumsal' | 'veli' | 'demo' | 'aile' (v4.17.21-1)
    // v4.3.0: Kurumsal davet kodları hangi kuruma bağlı olduğunu tutar.
    // Kurumsal kullanıcı bir kurumu yönettiğinde, ürettiği öğrenci/öğretmen kodları
    // o kuruma otomatik bağlanır (kayıt olan öğretmen/öğrenci direkt kuruma kaydolur).
    kurumId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Kurum', default: null },
    kullanildi:     { type: Boolean, default: false },
    kullanan:       { type: String, default: null },
    kopyalandi:     { type: Boolean, default: false },
    // v4.17.5: Kart ciktisi alindi mi? Ayni kodun iki kez yazdirilip iki kisiye
    //   dagitilmasini onler. Yazdirma ekrani varsayilan olarak yazdirilmamislari verir.
    yazdirildi:      { type: Boolean, default: false, index: true },
    yazdirilmaTarih: { type: Date, default: null },
    kopyalanmaTarih: { type: Date, default: null },
    // v4.17.20: Basili karta dusmus bir kullanici kodu yonetici kartina cevrildiyse
    //   eski sahibi burada saklanir (iz kaydi; tarama raporu icin).
    oncekiOlusturan: { type: String, default: null },
    // v4.17.21-1: tip:'aile' kodunda kullanan=ogrenci, aileVeli=birlikte acilan veli hesabi
    aileVeli: { type: String, default: null },
    olusturmaTarih: { type: Date, default: Date.now },
    kullanimTarih:  { type: Date, default: null }
});

module.exports = mongoose.model('ReferansKodu', ReferansKoduSchema);
