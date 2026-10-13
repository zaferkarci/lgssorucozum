// v4.17.21: Yonetici kimlik dogrulama — TEK KAYNAK.
//   Eskiden 6 dosyada `process.env.ADMIN_PASSWORD || '1234'` vardi: .env'de sifre
//   tanimli degilse "admin / 1234" ile herkes yonetici paneline (ve tum mesajlara)
//   girebiliyordu; depo herkese acik oldugu icin bu varsayilan da biliniyordu.
//   Artik VARSAYILAN YOK: ADMIN_USER ve ADMIN_PASSWORD .env'de tanimli degilse
//   yonetici girisi tamamen KAPALIDIR. Karsilastirma zamanlamaya dayanikli yapilir.
// v4.17.22: ADMIN_PASSWORD_HASH (bcrypt) destegi. Sifre .env'de DUZ METIN olarak
//   tutulmaz; yalniz tek yonlu ozeti tutulur (tools/admin-sifre.js ile yazilir).
//   ADMIN_PASSWORD_HASH varsa ADMIN_PASSWORD yok sayilir. Basarili dogrulama kisa
//   sure hafizada (yalniz basligin sha256 ozeti) tutulur; her istekte bcrypt calismaz.
const crypto = require('crypto');

const ZAYIF = new Set(['', '1234', 'admin', 'password', '123456', '12345678']);
const BCRYPT_RX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function hashVar() {
    return BCRYPT_RX.test(String(process.env.ADMIN_PASSWORD_HASH || '').trim());
}

function adminTanimliMi() {
    const u = process.env.ADMIN_USER;
    if (!u) return false;
    if (hashVar()) return true;
    const p = process.env.ADMIN_PASSWORD;
    return !!(p && !ZAYIF.has(String(p).toLowerCase()));
}

function esit(a, b) {
    const A = crypto.createHash('sha256').update(String(a)).digest();
    const B = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(A, B);
}

// Basarili dogrulanmis basliklarin sha256 ozeti -> son gecerlilik (ms)
const _onbellek = new Map();
const ONBELLEK_MS = 10 * 60 * 1000;
const _hataliBellek = new Map(); // yanlis basliklar (5 dk) — bcrypt yukunu sinirlar

// "Basic base64(kullanici:sifre)" basligini dogrular. Sifrede ':' olabilir.
function adminBasicDogruMu(authHeader) {
    if (!adminTanimliMi()) return false;
    const h = String(authHeader || '');
    if (!h.startsWith('Basic ') || h.length < 8) return false;
    const anahtar = crypto.createHash('sha256').update(h + '|' + String(process.env.ADMIN_PASSWORD_HASH || '')).digest('hex');
    const son = _onbellek.get(anahtar);
    if (son && son > Date.now()) return true;
    const hatali = _hataliBellek.get(anahtar);
    if (hatali && hatali > Date.now()) return false; // ayni yanlis baslik icin bcrypt tekrar calismaz

    let cozulmus = '';
    try { cozulmus = Buffer.from(h.slice(6), 'base64').toString(); } catch (e) { return false; }
    const i = cozulmus.indexOf(':');
    if (i < 0) return false;
    const u = cozulmus.slice(0, i), p = cozulmus.slice(i + 1);
    const uOk = esit(u, process.env.ADMIN_USER);
    let pOk = false;
    if (hashVar()) {
        try { pOk = require('bcrypt').compareSync(p, String(process.env.ADMIN_PASSWORD_HASH).trim()); } catch (e) { pOk = false; }
    } else {
        pOk = esit(p, process.env.ADMIN_PASSWORD);
    }
    if (uOk && pOk) {
        if (_onbellek.size > 50) _onbellek.clear();
        _onbellek.set(anahtar, Date.now() + ONBELLEK_MS);
        return true;
    }
    if (_hataliBellek.size > 500) _hataliBellek.clear();
    _hataliBellek.set(anahtar, Date.now() + 5 * 60 * 1000);
    return false;
}

// v4.17.22: Acilista bilgi icin — hangi yontem kullaniliyor (sifre DEGERI asla dondurulmez)
function adminYontemi() {
    if (!process.env.ADMIN_USER) return 'yok';
    if (hashVar()) return process.env.ADMIN_PASSWORD ? 'ozet+duzmetin' : 'ozet';
    return adminTanimliMi() ? 'duzmetin' : 'yok';
}

module.exports = { adminTanimliMi, adminBasicDogruMu, adminYontemi };
