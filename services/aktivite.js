// services/aktivite.js
// v4.3.69: Günlük aktivite özetleri — admin, öğretmen, veli için.

const Kullanici = require('../models/Kullanici');
const CevapKaydi = require('../models/CevapKaydi');

/**
 * Bugünün başlangıcı (00:00:00 Europe/Istanbul) — Date objesi UTC.
 * Istanbul UTC+3 (yaz/kış sabit) olduğundan basitçe UTC'den 3 saat geri al.
 * Daha sağlam yaklaşım için Intl/Date API kullanılabilir ama bu yeterli.
 */
function bugunBaslangic() {
    const now = new Date();
    // Istanbul saatine göre 00:00
    const istanbulOffsetMs = 3 * 60 * 60 * 1000; // UTC+3
    const localMs = now.getTime() + istanbulOffsetMs;
    const localDate = new Date(localMs);
    // Istanbul saatinde tarih bileşenlerini al, gün başlangıcına ayarla
    const yil = localDate.getUTCFullYear();
    const ay = localDate.getUTCMonth();
    const gun = localDate.getUTCDate();
    // Istanbul 00:00:00 → UTC olarak -3 saat
    return new Date(Date.UTC(yil, ay, gun, 0, 0, 0) - istanbulOffsetMs);
}

/**
 * Sınıf seviyelerine göre aktivite özetini hesapla.
 * @param {Array<Object>} kullanicilar - öğrenci listesi (rol === 'ogrenci')
 * @param {Date} bugun - Bugün başlangıcı (Date)
 * @returns {Promise<Object>} { sinifOzeti, detayListe, toplamGiris, toplamCozum }
 */
async function aktiviteOzeti(kullanicilar, bugun) {
    const ogrenciler = kullanicilar.filter(k => k.rol === 'ogrenci' || k.rol === 'demo');
    if (ogrenciler.length === 0) {
        return { sinifOzeti: {}, detayListe: [], toplamGiris: 0, toplamCozum: 0 };
    }
    const ogrAdlari = ogrenciler.map(k => k.kullaniciAdi);

    // Bugün soru çözen kullanıcıların aggregate'i: { kullaniciAdi, soruSayisi }
    const cevapAgr = await CevapKaydi.aggregate([
        { $match: { kullaniciAdi: { $in: ogrAdlari }, tarih: { $gte: bugun } } },
        { $group: { _id: '$kullaniciAdi', soruSayisi: { $sum: 1 } } }
    ]);
    const cevapMap = {};
    cevapAgr.forEach(c => { cevapMap[c._id] = c.soruSayisi; });

    // Sınıfa göre özet
    const sinifOzeti = {}; // { '8': { girisYapan, cozumYapan, toplamCozum, toplam } }
    const detayListe = []; // { kullaniciAdi, sinif, sube, girisYaptiMi, cozumSayisi }
    let toplamGiris = 0, toplamCozum = 0;

    ogrenciler.forEach(k => {
        const sinif = String(k.sinif || '?');
        if (!sinifOzeti[sinif]) {
            sinifOzeti[sinif] = { girisYapan: 0, cozumYapan: 0, toplamCozum: 0, toplam: 0 };
        }
        sinifOzeti[sinif].toplam++;

        const girisYaptiMi = k.sonGiris && new Date(k.sonGiris) >= bugun;
        const cozumSayisi = cevapMap[k.kullaniciAdi] || 0;

        if (girisYaptiMi) { sinifOzeti[sinif].girisYapan++; toplamGiris++; }
        if (cozumSayisi > 0) { sinifOzeti[sinif].cozumYapan++; }
        sinifOzeti[sinif].toplamCozum += cozumSayisi;
        toplamCozum += cozumSayisi;

        // Aktif olanları detay listesine ekle (giriş yapmış VEYA soru çözmüş)
        if (girisYaptiMi || cozumSayisi > 0) {
            detayListe.push({
                kullaniciAdi: k.kullaniciAdi,
                sinif: k.sinif || '?',
                sube: k.sube || '',
                okul: k.okul || '',
                il: k.il || '',
                ilce: k.ilce || '',
                girisYaptiMi,
                cozumSayisi,
                sonGiris: k.sonGiris || null
            });
        }
    });

    // Detay listesini sırala: önce çözüm sayısı azalan, sonra ad
    detayListe.sort((a, b) => {
        if (b.cozumSayisi !== a.cozumSayisi) return b.cozumSayisi - a.cozumSayisi;
        return (a.kullaniciAdi || '').localeCompare(b.kullaniciAdi || '', 'tr');
    });

    return { sinifOzeti, detayListe, toplamGiris, toplamCozum };
}

module.exports = {
    bugunBaslangic,
    aktiviteOzeti,
    /**
     * Öğretmen/veli için: takip edilen kullanıcı adlarının bugünkü aktivitesi.
     * @param {Array<String>} ogrenciAdlari
     * @returns {Promise<Object>} aktiviteOzeti çıktısıyla aynı yapı
     */
    takipEdilenAktivite: async function(ogrenciAdlari) {
        if (!Array.isArray(ogrenciAdlari) || ogrenciAdlari.length === 0) {
            return { sinifOzeti: {}, detayListe: [], toplamGiris: 0, toplamCozum: 0 };
        }
        const kullanicilar = await Kullanici.find(
            { kullaniciAdi: { $in: ogrenciAdlari } },
            'kullaniciAdi sinif sube okul il ilce rol sonGiris'
        ).lean();
        return await aktiviteOzeti(kullanicilar, bugunBaslangic());
    }
};
