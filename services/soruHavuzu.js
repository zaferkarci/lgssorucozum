// services/soruHavuzu.js
// v4.17.37: Admin > Kullanicilar icin SORU HAVUZU ozeti.
//   Her sinif seviyesi icin konu konu: yayindaki soru sayisi, konu acik mi (KonuIzin), o sinifta o konuda EN COK soru
//   cozen ogrenci ve ona gore KALAN soru sayisi. Kalan 0 olan acik konuda en hizli ogrenci soru bulamaz.
//   Yalniz okur. Bir ogrencinin bir konudaki "cozdugu" = o konudaki yayindaki sorulardan cevap verdigi FARKLI soru sayisi
//   (dogru/yanlis fark etmez; cevaplanan soru bir daha gelmez). Ogrenci, sorunun sinifinda ise sayilir.
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const KonuIzin = require('../models/KonuIzin');

const anahtar = s => (s.ders || '') + '|' + (s.unite || '') + '|' + (s.konu || '');

async function soruHavuzuHesapla(kullanicilar) {
    const ogrSinif = {};
    (kullanicilar || []).forEach(k => {
        if (k.rol !== 'ogrenci') return;
        const sn = String(Number(k.sinif) || '');
        if (sn) ogrSinif[k.kullaniciAdi] = sn;
    });
    const sorular = await Soru.find({ durum: 'yayinda' }, 'sinif ders unite konu').lean();
    const kapali = await KonuIzin.find({ acik: false }, 'sinif ders unite konu').lean();
    const kapaliSet = new Set(kapali.map(x => String(x.sinif) + '#' + anahtar(x)));

    const siniflar = {}; // sn -> { konular: { key: {...} } }
    const soruBilgi = {}; // soruId -> { sn, key }
    sorular.forEach(s => {
        const sn = String(Number(s.sinif) || '');
        if (!sn) return;
        const key = anahtar(s);
        const sv = siniflar[sn] || (siniflar[sn] = { sinif: Number(sn), konular: {} });
        const kn = sv.konular[key] || (sv.konular[key] = {
            ders: s.ders || '', unite: s.unite || '', konu: s.konu || '',
            toplam: 0, acik: !kapaliSet.has(sn + '#' + key), enCok: 0, enCokAd: '', bitiren: 0, cozen: 0
        });
        kn.toplam++;
        soruBilgi[String(s._id)] = { sn, key };
    });

    // ogrenci -> konu -> cozulen farkli soru sayisi (yalniz kendi sinifindaki sorular)
    const cevaplar = await CevapKaydi.find({}, 'kullaniciAdi soruId').lean();
    const gorulen = new Set();
    const sayac = {}; // ad -> { key: n }
    cevaplar.forEach(c => {
        const sn = ogrSinif[c.kullaniciAdi];
        if (!sn || !c.soruId) return;
        const sb = soruBilgi[String(c.soruId)];
        if (!sb || sb.sn !== sn) return;
        const iz = c.kullaniciAdi + '#' + c.soruId;
        if (gorulen.has(iz)) return;
        gorulen.add(iz);
        const m = sayac[c.kullaniciAdi] || (sayac[c.kullaniciAdi] = {});
        m[sb.key] = (m[sb.key] || 0) + 1;
    });

    const ogrenciSayisi = {};
    Object.values(ogrSinif).forEach(sn => { ogrenciSayisi[sn] = (ogrenciSayisi[sn] || 0) + 1; });

    Object.keys(sayac).forEach(ad => {
        const sv = siniflar[ogrSinif[ad]];
        if (!sv) return;
        let acikCozulen = 0;
        Object.keys(sayac[ad]).forEach(key => {
            const kn = sv.konular[key]; if (!kn) return;
            const n = sayac[ad][key];
            kn.cozen++;
            if (n >= kn.toplam) kn.bitiren++;
            if (n > kn.enCok || (n === kn.enCok && kn.enCokAd && ad.localeCompare(kn.enCokAd, 'tr') < 0)) { kn.enCok = n; kn.enCokAd = ad; }
            if (kn.acik) acikCozulen += n;
        });
        if (!sv.enCokCozen || acikCozulen > sv.enCokCozen.acikCozulen) sv.enCokCozen = { ad, acikCozulen };
    });

    return Object.keys(siniflar).sort((a, b) => a - b).map(sn => {
        const sv = siniflar[sn];
        const konular = Object.values(sv.konular).map(k => Object.assign(k, { kalan: k.toplam - k.enCok }));
        konular.sort((a, b) => (b.acik - a.acik) || (a.kalan - b.kalan) ||
            a.ders.localeCompare(b.ders, 'tr') || a.unite.localeCompare(b.unite, 'tr') || a.konu.localeCompare(b.konu, 'tr'));
        const toplam = konular.reduce((t, k) => t + k.toplam, 0);
        const acikToplam = konular.filter(k => k.acik).reduce((t, k) => t + k.toplam, 0);
        const ec = sv.enCokCozen || null;
        return {
            sinif: sv.sinif, toplam, acikToplam, kapaliToplam: toplam - acikToplam,
            ogrenciSayisi: ogrenciSayisi[sn] || 0,
            biten: konular.filter(k => k.acik && k.kalan <= 0).length,
            azalan: konular.filter(k => k.acik && k.kalan > 0 && k.kalan <= 3).length,
            enCokCozen: ec ? { ad: ec.ad, acikCozulen: ec.acikCozulen, kalanAcik: acikToplam - ec.acikCozulen } : null,
            konular
        };
    });
}

module.exports = { soruHavuzuHesapla };
