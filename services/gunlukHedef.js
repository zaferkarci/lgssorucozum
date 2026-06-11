// services/gunlukHedef.js
// v4.5.0: Ders bazlı günlük hedef hesabı.
//
// Tasarım kararları (kullanıcı isteği):
//   - Aralık: Son 30 gün
//   - Her ders min hedef: 2 soru → toplam 12
//   - Ders hedef formülü: max(2, floor(son 30 gün ortalama) + 1)  // ortalamayı GEÇER (v4.8.11)
//   - 6 ders sabit: Mat, Türkçe, Fen, İnkılap, Din, İngilizce
//   - "Bugün" başlangıcı: Europe/Istanbul 00:00 (services/aktivite.js'tekiyle aynı)

const CevapKaydi = require('../models/CevapKaydi');
const Unite = require('../models/Unite');
const Kullanici = require('../models/Kullanici');
const { bugunBaslangic } = require('./aktivite');

// LGS dersleri sabiti — services/lgsOrtalama.js ile aynı isim sırası
const LGS_DERSLER = [
    'Matematik',
    'Türkçe',
    'Fen Bilimleri',
    'T.C. İnkılâp Tarihi',
    'Din Kültürü',
    'İngilizce'
];

const LGS_KATSAYI = {
    'Matematik':          4,
    'Türkçe':             4,
    'Fen Bilimleri':      4,
    'T.C. İnkılâp Tarihi': 1,
    'Din Kültürü':        1,
    'İngilizce':          1
};

const MIN_DERS_HEDEF = 2;       // Her ders en az 2 soru
const ARALIK_GUN = 30;          // Son 30 gün

/**
 * Son N gün başlangıç tarihi (Istanbul saatine göre N gün öncesi 00:00).
 */
function aralikBaslangic(gun = ARALIK_GUN) {
    const bugun = bugunBaslangic();
    return new Date(bugun.getTime() - gun * 24 * 60 * 60 * 1000);
}

/**
 * Bir kullanıcı için ders bazlı günlük hedef hesabı.
 *
 * @param {String} kullaniciAdi
 * @returns {Promise<Object>} {
 *   dersler: [{
 *     ders: 'Matematik',
 *     katsayi: 4,
 *     son30GunSayisi: 60,      // son 30 günde çözülen soru
 *     ortalama: 2.0,            // soru/gün
 *     hedef: 2,                 // bugünkü hedef (min 2)
 *     bugunCozulen: 1,          // bugün çözülen soru
 *     kalan: 1,                 // hedef - bugünCozulen (0+ olabilir)
 *     tamamlandi: false,        // bugünCozulen >= hedef
 *     ilerleme: 50              // yüzde 0-100
 *   }, ...],
 *   toplamHedef: 12,
 *   toplamBugun: 8,
 *   toplamTamamlandi: false,
 *   genelOrtalama: 8.4          // son 30 gün toplam / 30
 * }
 */
async function gunlukHedefHesap(kullaniciAdi) {
    if (!kullaniciAdi) {
        return { dersler: [], toplamHedef: 0, toplamBugun: 0, toplamTamamlandi: false, genelOrtalama: 0 };
    }

    const bugun = bugunBaslangic();
    const aralikBas = aralikBaslangic(ARALIK_GUN);

    // v4.8.12: Ortalama boleni — uye olunan tarihten itibaren. Yeni uyeler 30'a
    //   bolunup haksiz dusuk ortalama almasin diye bolen = min(30, uyelik gunu).
    //   Uyelik tarihi _id'nin olusturulma zamanindan alinir (ayri alan yok).
    let bolen = ARALIK_GUN;
    try {
        const ku = await Kullanici.findOne({ kullaniciAdi }, '_id').lean();
        if (ku && ku._id && typeof ku._id.getTimestamp === 'function') {
            const uyelik = ku._id.getTimestamp();
            const gunFarki = Math.ceil((Date.now() - uyelik.getTime()) / (24 * 60 * 60 * 1000));
            bolen = Math.min(ARALIK_GUN, Math.max(1, gunFarki));
        }
    } catch (e) { bolen = ARALIK_GUN; }

    // Tek aggregate ile hem son 30 gün hem bugün hesabı için ham veri çek
    // — sonra JS'de filtreyle ayırırız (1 sorgu, 2 amaç)
    const kayitlar = await CevapKaydi.find(
        {
            kullaniciAdi,
            tarih: { $gte: aralikBas }
            // Not: ikinciKezMi olan kayıtlar BURADA da hesaba dahil edilir —
            // öğrenci "çözüm yaptı", görev açısından önemli. Sorunun
            // istatistiklerini bozmaz ama günlük hedefe sayılır.
        },
        'soruId tarih'
    ).populate('soruId', 'ders').lean();

    // v4.6.4: Hedef dersleri artık admin > Üniteler'de tanımlı derslerle sınırlı.
    //   - Üniteye ders eklendikçe hedefe de otomatik eklenir (her çağrıda DB'den okunur).
    //   - Bilinen LGS dersleri doğru sıra+katsayı ile önce gelir; ünitede olan
    //     diğer (özel) dersler sona eklenir (katsayı varsayılan 1).
    //   - Hiç ünite yoksa (uç durum) eski 6 LGS dersine güvenli geri dönüş.
    let aktifDersler;
    try {
        const uniteDersleri = await Unite.distinct('ders');
        if (uniteDersleri && uniteDersleri.length > 0) {
            const bilinen = LGS_DERSLER.filter(d => uniteDersleri.includes(d));
            const ekstra = uniteDersleri.filter(d => d && !LGS_DERSLER.includes(d));
            aktifDersler = bilinen.concat(ekstra);
        } else {
            aktifDersler = LGS_DERSLER.slice();
        }
    } catch (e) {
        aktifDersler = LGS_DERSLER.slice(); // hata olursa güvenli varsayılan
    }
    if (!aktifDersler || aktifDersler.length === 0) aktifDersler = LGS_DERSLER.slice();

    // Ders → { son30: N, bugun: M }
    const sayim = {};
    aktifDersler.forEach(d => { sayim[d] = { son30: 0, bugun: 0 }; });

    let toplamSon30 = 0;
    kayitlar.forEach(k => {
        const ders = k.soruId && k.soruId.ders;
        if (!ders || !sayim[ders]) return; // LGS dersi değilse atla
        sayim[ders].son30++;
        toplamSon30++;
        if (k.tarih && new Date(k.tarih) >= bugun) {
            sayim[ders].bugun++;
        }
    });

    // Her ders için hedef + ilerleme hesabı
    const dersler = aktifDersler.map(ders => {
        const son30Sayisi = sayim[ders].son30;
        const bugunCozulen = sayim[ders].bugun;
        const ortalama = son30Sayisi / bolen;
        // v4.8.11: Hedef 30 günlük ortalamayı GEÇMELI — floor(ortalama)+1 (min 2).
        //   örn ortalama 0 → 2; 1.0 → 2; 2.0 → 3; 2.1 → 3; 2.9 → 3; 3.0 → 4
        const hedef = Math.max(MIN_DERS_HEDEF, Math.floor(ortalama) + 1);
        const kalan = Math.max(0, hedef - bugunCozulen);
        const tamamlandi = bugunCozulen >= hedef;
        const ilerleme = hedef > 0 ? Math.min(100, Math.round((bugunCozulen / hedef) * 100)) : 0;
        return {
            ders,
            katsayi: LGS_KATSAYI[ders] || 1,
            son30GunSayisi: son30Sayisi,
            ortalama: Math.round(ortalama * 100) / 100, // 2 basamak
            hedef,
            bugunCozulen,
            kalan,
            tamamlandi,
            ilerleme
        };
    });

    const toplamHedef = dersler.reduce((t, d) => t + d.hedef, 0);
    const toplamBugun = dersler.reduce((t, d) => t + d.bugunCozulen, 0);
    const toplamTamamlandi = dersler.every(d => d.tamamlandi);
    const genelOrtalama = Math.round((toplamSon30 / bolen) * 10) / 10;

    return {
        dersler,
        toplamHedef,
        toplamBugun,
        toplamTamamlandi,
        genelOrtalama
    };
}

module.exports = {
    gunlukHedefHesap,
    LGS_DERSLER,
    LGS_KATSAYI,
    MIN_DERS_HEDEF,
    ARALIK_GUN
};
