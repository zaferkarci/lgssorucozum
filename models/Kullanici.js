const mongoose = require('mongoose');

const KullaniciSchema = new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true, index: true },
    sifre: String,
    email: { type: String, default: '' },
    rol: { type: String, default: 'ogrenci' }, // 'ogrenci' | 'ogretmen' | 'moderator' | 'kurumsal'
    // v4.3.0: Çoklu rol desteği — bir kullanıcı hem kurumsal hem öğretmen olabilir
    // ve roller arası geçiş yapabilir. rolListesi boş kalırsa eski tek-rol mantığı geçerli.
    rolListesi: { type: [String], default: [] },   // ör: ['kurumsal', 'ogretmen']
    aktifRol: { type: String, default: '' },        // şu an hangi rolde panel açtı
    // v4.3.0: Kurum bağlantıları
    yonettigiKurumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kurum', default: null }, // kurumsal kullanıcı için
    bagliKurumId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Kurum', default: null }, // öğretmen/öğrenci için
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    sube: { type: String, default: '' },
    soruIndex: { type: Number, default: 0 },
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    // Ders bazlı istatistikler
    dersPuanlari: [{
        ders:        String,
        toplamPuan:  { type: Number, default: 0 },
        soruSayisi:  { type: Number, default: 0 },
        toplamSure:  { type: Number, default: 0 }
    }],
    // Sıralama cache (cron job'da 05:10'da güncellenir)
    siralamaCache: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    siralamaCacheTarih: { type: Date, default: null },
    // v4.2.5: Mail değiştirme doğrulama akışı için geçici alanlar
    yeniEmailBekleyen: { type: String, default: '' },      // Kullanıcının değiştirmek istediği yeni mail
    emailDogrulamaKodu: { type: String, default: '' },     // 6 haneli kod (hash'li değil, kısa ömürlü)
    emailDogrulamaSonGecerli: { type: Date, default: null }, // Kod son geçerlilik tarihi (15 dk)
    // v4.3.69: Login zaman damgası — "bugün aktif" tespiti için
    sonGiris: { type: Date, default: null },
    // v4.4.0: Geçilen sorular — öğrenci "Geç" butonuna basıp soruyu atladığında
    //   buraya eklenir. Sıralamada bu soru o ders/ünite/konu'nun en sonuna
    //   itilir. Soru 2. kez çözüldüğünde puan = kazanılan/5 olur (3+ ise 0).
    //   CevapKaydı oluşmaz "geç" eyleminde; sadece bu liste güncellenir.
    //   Soru çözüldüğünde bu listeden silinmez — gecisSayisi 1 olarak kalır,
    //   ileride aynı soru tekrar gelse de (cron yeniden hesaplarsa) 2. kez
    //   sayılır.
    gecilenSorular: [{
        soruId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Soru' },
        gecisSayisi:     { type: Number, default: 1 }, // kaç kere geçildi
        sonGecisTarihi:  { type: Date, default: Date.now }
    }]
});

// Compound indexes — sıralama filtreleri için
KullaniciSchema.index({ il: 1, ilce: 1, okul: 1 });
KullaniciSchema.index({ okul: 1, sinif: 1, sube: 1 });

module.exports = mongoose.model('Kullanici', KullaniciSchema);
