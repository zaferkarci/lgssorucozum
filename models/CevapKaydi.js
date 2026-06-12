const mongoose = require('mongoose');

const CevapKaydiSchema = new mongoose.Schema({
    soruId: { type: mongoose.Schema.Types.ObjectId, ref: 'Soru', index: true },
    kullaniciAdi: { type: String, index: true },
    dogruMu: Boolean,
    sure: Number,
    kazanilanPuan: { type: Number, default: 0 },
    tarih: { type: Date, default: Date.now },
    // v4.4.0: Soru daha önce "Geç" ile atlanmıştı, şimdi tekrar geliyor.
    //   true ise: kazanılanPuan zaten 1/5'e indirilmiştir, ama daha önemlisi
    //   bu cevap sorunun istatistiklerine (ortSure, dogruOrani, σ_sure, Z)
    //   ETKİ ETMEZ. Cron bu flag'li kayıtları soru istatistiği hesabı
    //   sırasında dışlar. Öğrencinin puan/dersOrt hesabına ise normal katılır.
    //   Soru 3+. kez geliyorsa kazanılanPuan = 0 olur (yine de kayıt açılır
    //   ki "geçmişten gelen 0 puan" görünsün).
    ikinciKezMi: { type: Boolean, default: false },
    // v4.8.19: Cevap, zorunlu seviye ANALIZI sirasinda verildi. Yalnizca gunluk
    //   hedef hesabi (bugun cozulen + ortalama) bu kayitlari DISLAR; puan, soru
    //   istatistikleri, basari yuzdeleri ve analiz ilerlemesi NORMAL isler.
    analiz: { type: Boolean, default: false }
});

// Compound index — ham puan hesabı için (soruId + dogruMu)
CevapKaydiSchema.index({ soruId: 1, dogruMu: 1 });

module.exports = mongoose.model('CevapKaydi', CevapKaydiSchema);
