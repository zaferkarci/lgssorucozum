const mongoose = require('mongoose');

const soruSchema = new mongoose.Schema({
  soru_no: Number,
  ders: String,
  konu: String,
  soru_metni: String,
  gorsel: String,

  secenekler: {
    A: String,
    B: String,
    C: String,
    D: String
  },

  dogru_cevap: String,

  GE: { type: Number, default: 0.5 },
  cozulme_sayisi: { type: Number, default: 0 },
  dogru_sayisi: { type: Number, default: 0 },
  toplam_sure: { type: Number, default: 0 },

  // 🔥 YENİ EKLEDİĞİMİZ
  durum: { type: String, default: "taslak" }

}, { timestamps: true });

module.exports = mongoose.model('Soru', soruSchema);