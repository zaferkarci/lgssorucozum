// services/lgsOrtalama.js
// v4.3.65: LGS resmi ağırlıklı ortalama hesabı için TEK KAYNAK.
// Önceden bu hesap cronJobs.js + routes/panel.js + routes/takip.js +
// views/panel.ejs + views/takip-ogrenci-detay.ejs olarak 5 yerde kopyala-
// yapıştır şeklinde duruyordu. Bir yeri unutmak veri tutarsızlığı
// yaratıyordu. Artık tek bu modül.
//
// Formül (MEB LGS 2025 Puan Hesaplama Kılavuzu):
//   ortOrtalama = (Mat×4 + Türkçe×4 + Fen×4 + İnkılap×1 + Din×1 + İng×1) / 15
//
// Min 5 soru ders bazlı nitelik şartı: bir dersten 5'ten az soru çözülmüşse
// o ders 0 ortalama sayılır. Bu, "Din'den 2 soruyu doğru yaparak ortalamayı
// şişirme" gibi spam'leri engeller.

const LGS_DERS_KATSAYISI = {
    'Matematik':          4,
    'Türkçe':             4,
    'Fen Bilimleri':      4,
    'T.C. İnkılâp Tarihi': 1,
    'Din Kültürü':        1,
    'İngilizce':          1
};
const LGS_TOPLAM_KATSAYI = 15; // 4+4+4+1+1+1
const DERS_MIN_SORU = 5;       // ders bazlı nitelik eşiği

/**
 * LGS ağırlıklı ortalama hesabı.
 * @param {Array} dersPuanlari - [{ ders, toplamPuan, soruSayisi }, ...]
 * @returns {Number} ortOrtalama (0-100 arası)
 */
function lgsAgirlikliOrtalama(dersPuanlari) {
    if (!Array.isArray(dersPuanlari) || dersPuanlari.length === 0) return 0;
    const dersOrtMap = {};
    for (const d of dersPuanlari) {
        // v4.3.65: 5+ soru ders bazlı nitelik şartı
        if (d && d.soruSayisi >= DERS_MIN_SORU && d.toplamPuan != null) {
            dersOrtMap[d.ders] = d.toplamPuan / d.soruSayisi;
        }
    }
    let agirlikliToplam = 0;
    for (const dersAdi in LGS_DERS_KATSAYISI) {
        const ort = dersOrtMap[dersAdi] || 0; // çözülmemiş veya niteliksiz ders: 0
        agirlikliToplam += ort * LGS_DERS_KATSAYISI[dersAdi];
    }
    return agirlikliToplam / LGS_TOPLAM_KATSAYI;
}

module.exports = {
    lgsAgirlikliOrtalama,
    LGS_DERS_KATSAYISI,
    LGS_TOPLAM_KATSAYI,
    DERS_MIN_SORU
};
