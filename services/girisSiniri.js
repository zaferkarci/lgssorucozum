// v4.17.24-1: GIRIS DENEME SINIRI (/giris)
//   Yonetici elle kullanici actiginda ilk sifre 6 haneli rakamdir (900.000 olasilik).
//   Siniri olmayan bir giris formunda bu sifre kaba kuvvetle denenebilirdi. Bu servis
//   ayni IP + ayni kullanici adi icin 15 dakikada 8 hatali denemeden sonra o ikili icin
//   15 dakika girisi kapatir (dogru sifre de o sure icinde kabul edilmez).
//   - Anahtar "IP|kullaniciadi(kucuk harf)": baska bir IP'den giren gercek kullanici
//     etkilenmez; bir saldirgan tek IP'den dakikada ~0,5 deneme yapabilir (bellek: sureli).
//   - Kullanici adi var olmasa da sayilir (hangi hesabin var oldugu sizmaz).
//   - Basarili giriste o ikilinin sayaci silinir.
//   - Sayaclar bellekte tutulur (yeniden baslatmada sifirlanir); sifre/ham veri tutulmaz.
'use strict';

const PENCERE_MS = 15 * 60 * 1000;
const LIMIT = 8;
const KILIT_MS = 15 * 60 * 1000;
const _kayit = new Map(); // anahtar -> { n, ilk, kilitBitis }

function istekIp(req) {
    const uzak = (req.socket && req.socket.remoteAddress) || '';
    const xff = String((req.headers && req.headers['x-forwarded-for']) || '');
    // nginx arkasinda: baglanti yerelden gelir, gercek IP x-forwarded-for'un SON elemanidir
    if (xff && /^(::1|127\.|::ffff:127\.)/.test(uzak)) {
        const p = xff.split(',').map(x => x.trim()).filter(Boolean);
        if (p.length) return p[p.length - 1];
    }
    return uzak;
}

function anahtar(req, ad) {
    return istekIp(req) + '|' + String(ad == null ? '' : ad).trim().toLowerCase().slice(0, 60);
}

function temizlik() {
    if (_kayit.size < 5000) return;
    const simdi = Date.now();
    for (const [k, v] of _kayit) {
        if ((v.kilitBitis && v.kilitBitis < simdi) || (!v.kilitBitis && v.ilk + PENCERE_MS < simdi)) _kayit.delete(k);
    }
    if (_kayit.size >= 5000) _kayit.clear(); // son care: bellek sismesin
}

// Kilitliyse kalan saniye, degilse 0
function kilitKalanSn(req, ad) {
    const k = anahtar(req, ad);
    const v = _kayit.get(k);
    if (!v) return 0;
    const simdi = Date.now();
    if (v.kilitBitis) {
        if (v.kilitBitis > simdi) return Math.ceil((v.kilitBitis - simdi) / 1000);
        _kayit.delete(k);
        return 0;
    }
    if (v.ilk + PENCERE_MS < simdi) { _kayit.delete(k); return 0; }
    return 0;
}

function hataKaydet(req, ad) {
    temizlik();
    const k = anahtar(req, ad);
    const simdi = Date.now();
    let v = _kayit.get(k);
    if (!v || (!v.kilitBitis && v.ilk + PENCERE_MS < simdi) || (v.kilitBitis && v.kilitBitis < simdi)) {
        v = { n: 0, ilk: simdi, kilitBitis: 0 };
    }
    v.n++;
    if (v.n >= LIMIT && !v.kilitBitis) v.kilitBitis = simdi + KILIT_MS;
    _kayit.set(k, v);
}

function basarili(req, ad) {
    _kayit.delete(anahtar(req, ad));
}

module.exports = { kilitKalanSn, hataKaydet, basarili, LIMIT, PENCERE_MS, KILIT_MS };
