// v4.17.24-4: SON 1 AY — GUNLUK 2 SORU TAKVIMI (veli ve ogretmen icin)
//   Pencere sabit 30 gun degil, "bugunden bir ay geriye"dir: ayin uzunluguna gore 28, 29, 30 veya 31 gun.
//   Baslangic = gecen ayin ayni gunu + 1 gun (gecen ayda o gun yoksa gecen ayin son gunu + 1).
//     15 Ekim -> 16 Eylul..15 Ekim = 30 gun | 15 Mart -> 16 Subat..15 Mart = 28 (artik yilda 29) gun
//     15 Ocak -> 16 Aralik..15 Ocak = 31 gun | 31 Mart -> 1..31 Mart = 31 gun | 30 Mart -> 1..30 Mart = 30 gun
//   Ayin son gunuyse (30 Kasim, 28 Subat...) tam o ay gorunur: 1 Kasim..30 Kasim = 30 gun.
//   Her takip edilen ogrenci icin bu pencerenin (Europe/Istanbul gun sinirlariyla, bugun dahil)
//   gunluk cozulen soru sayisini dondurur. Kart tarafi: sayi >= ESIK ise yesil tik, degilse kirmizi.
//   (v4.17.24-3'te pencere sabit 30 gundu.)
//   Sayilan sey CevapKaydi kayitlaridir (cevaplanan her soru; "Bugunun Aktivitesi" karti ile ayni olcu).
//   Istanbul sabit UTC+3 oldugu icin (services/aktivite.js ile ayni varsayim) gun sinirlari aritmetikle bulunur;
//   boylece MongoDB surumune bagli tarih fonksiyonlari (timezone destegi) gerekmez.
'use strict';

const Kullanici = require('../models/Kullanici');
const CevapKaydi = require('../models/CevapKaydi');
const { bugunBaslangic } = require('./aktivite');

const ESIK = 2; // gunde en az 2 soru
const GUN_MS = 24 * 60 * 60 * 1000;
const IST_MS = 3 * 60 * 60 * 1000; // UTC+3

// Istanbul'daki takvim gununu "YYYY-MM-DD" olarak verir
function gunAnahtari(tarih) {
    return new Date(tarih.getTime() + IST_MS).toISOString().slice(0, 10);
}

function ayGunSayisi(yil, ay0) { // ay0: 0-11
    return new Date(Date.UTC(yil, ay0 + 1, 0)).getUTCDate();
}

/**
 * "Bugunden bir ay geriye" pencere: bugunAnahtari ('YYYY-MM-DD', Istanbul takvim gunu) dahil,
 * eskiden yeniye siralanmis gun anahtarlari. Uzunluk her zaman 28-31 arasidir.
 */
function pencereHesapla(bugunAnahtari) {
    const p = String(bugunAnahtari).split('-');
    const y = +p[0], a = +p[1] - 1, g = +p[2];
    const oy = a === 0 ? y - 1 : y;          // gecen ayin yili
    const oa = a === 0 ? 11 : a - 1;         // gecen ay (0-11)
    const oncekiGun = Math.min(g, ayGunSayisi(oy, oa));
    let ilk = Date.UTC(oy, oa, oncekiGun) + GUN_MS;     // gecen ayin ayni gununden bir sonraki gun
    if (g === ayGunSayisi(y, a)) ilk = Date.UTC(y, a, 1); // ayin son gunuyse tam o ay (1..son): 28/29/30/31
    const son = Date.UTC(y, a, g);
    const uzunluk = Math.round((son - ilk) / GUN_MS) + 1;
    const gunler = [];
    for (let i = 0; i < uzunluk; i++) gunler.push(new Date(ilk + i * GUN_MS).toISOString().slice(0, 10));
    return gunler;
}

/**
 * @param {Array<String>} ogrenciAdlari takip edilen kullanici adlari
 * @returns {Promise<Object>} { esik, gunSayisi (28-31), bugun, gunler:[YYYY-MM-DD (eskiden yeniye)],
 *                              ogrenciler:[{ kullaniciAdi, sinif, sube, sayilar:[gunSayisi adet], tamamlanan }] }
 */
async function takipTakvimi(ogrenciAdlari) {
    const bugun = bugunBaslangic();
    const gunler = pencereHesapla(gunAnahtari(bugun));
    const GUN_SAYISI = gunler.length;
    const baslangic = new Date(bugun.getTime() - (GUN_SAYISI - 1) * GUN_MS);
    const sonuc = { esik: ESIK, gunSayisi: GUN_SAYISI, bugun: gunler[GUN_SAYISI - 1], gunler, ogrenciler: [] };
    if (!Array.isArray(ogrenciAdlari) || ogrenciAdlari.length === 0) return sonuc;

    const kullanicilar = await Kullanici.find(
        { kullaniciAdi: { $in: ogrenciAdlari } },
        'kullaniciAdi sinif sube rol'
    ).lean();
    const ogrenciler = kullanicilar.filter(k => k.rol === 'ogrenci' || k.rol === 'demo');
    if (ogrenciler.length === 0) return sonuc;

    const adlar = ogrenciler.map(k => k.kullaniciAdi);
    const cevaplar = await CevapKaydi.find(
        { kullaniciAdi: { $in: adlar }, tarih: { $gte: baslangic } },
        'kullaniciAdi tarih'
    ).lean();
    const sayac = {}; // ad -> [GUN_SAYISI]
    adlar.forEach(a => { sayac[a] = new Array(GUN_SAYISI).fill(0); });
    cevaplar.forEach(c => {
        const idx = Math.floor((new Date(c.tarih).getTime() - baslangic.getTime()) / GUN_MS);
        if (idx >= 0 && idx < GUN_SAYISI && sayac[c.kullaniciAdi]) sayac[c.kullaniciAdi][idx]++;
    });

    ogrenciler.sort((a, b) => {
        const sa = Number(a.sinif) || 99, sb = Number(b.sinif) || 99;
        if (sa !== sb) return sa - sb;
        return String(a.kullaniciAdi).localeCompare(String(b.kullaniciAdi), 'tr');
    });
    sonuc.ogrenciler = ogrenciler.map(k => {
        const sayilar = sayac[k.kullaniciAdi];
        return {
            kullaniciAdi: k.kullaniciAdi,
            sinif: k.sinif || null,
            sube: k.sube || '',
            sayilar,
            tamamlanan: sayilar.filter(n => n >= ESIK).length
        };
    });
    return sonuc;
}

module.exports = { takipTakvimi, pencereHesapla, gunAnahtari, ESIK };
