// v4.17.21: Yonetici kimlik dogrulama — TEK KAYNAK.
//   Eskiden 6 dosyada `process.env.ADMIN_PASSWORD || '1234'` vardi: .env'de sifre
//   tanimli degilse "admin / 1234" ile herkes yonetici paneline (ve tum mesajlara)
//   girebiliyordu; depo herkese acik oldugu icin bu varsayilan da biliniyordu.
//   Artik VARSAYILAN YOK: ADMIN_USER ve ADMIN_PASSWORD .env'de tanimli degilse
//   yonetici girisi tamamen KAPALIDIR. Karsilastirma zamanlamaya dayanikli yapilir.
const crypto = require('crypto');

const ZAYIF = new Set(['', '1234', 'admin', 'password', '123456', '12345678']);

function adminTanimliMi() {
    const u = process.env.ADMIN_USER, p = process.env.ADMIN_PASSWORD;
    return !!(u && p && !ZAYIF.has(String(p).toLowerCase()));
}

function esit(a, b) {
    const A = crypto.createHash('sha256').update(String(a)).digest();
    const B = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(A, B);
}

// "Basic base64(kullanici:sifre)" basligini dogrular. Sifrede ':' olabilir.
function adminBasicDogruMu(authHeader) {
    if (!adminTanimliMi()) return false;
    const h = String(authHeader || '');
    if (!h.startsWith('Basic ')) return false;
    let cozulmus = '';
    try { cozulmus = Buffer.from(h.slice(6), 'base64').toString(); } catch (e) { return false; }
    const i = cozulmus.indexOf(':');
    if (i < 0) return false;
    const u = cozulmus.slice(0, i), p = cozulmus.slice(i + 1);
    const uOk = esit(u, process.env.ADMIN_USER);
    const pOk = esit(p, process.env.ADMIN_PASSWORD);
    return uOk && pOk;
}

module.exports = { adminTanimliMi, adminBasicDogruMu };
