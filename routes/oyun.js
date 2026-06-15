// v4.9.8 — "Bilgi Gezegenleri": dunya zemini + viewport + elle kilit + siralama.
//   YALNIZCA ADMIN onizlemesi. Ogrencilere kapali; panel menusunde link yok.
//   Mevcut modeller/PUANLAMA degismez; oyun verisi ayri koleksiyonlarda.
//   - Mantiksal dunya: DW x DH hucre (her sinif kendi dunyasi).
//   - Viewport: VP x VP hucre; tarayici yalniz bunu cizer.
//   - Kilit: OyunKilit (global) - admin elle isaretler; kilitli hucre alinamaz.
//   - Baslangic: OTOMATIK + kumeleyici (oyuncular birbirine yakin dogar).
//   - Siralama: her sinif dunyasinda rumuz + alinan hucre sayisi (azalan).
const express = require('express');
const router = express.Router();

const OyunHucre = require('../models/OyunHucre');
const OyunOyuncu = require('../models/OyunOyuncu');
const OyunKilit = require('../models/OyunKilit');
const Kullanici = require('../models/Kullanici');
const CevapKaydi = require('../models/CevapKaydi');

// ---- sabitler ----
const DW = 400, DH = 200;
const VP = 20;
const NAZILLI = { x: 231, y: 58 };
const ADMIN_OYUNCU = '__admin_onizleme__';
const ADMIN_TEST_ALTIN = 1000000;
const KOMSU = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function adminMi(req) { return !!(req.session && req.session.adminGirisli === true); }
function kapali(res) { return res.status(403).send('<div style="font-family:sans-serif;padding:40px;text-align:center;">Oyun yakinda. (Su an yalnizca yonetici onizlemesi.)</div>'); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// v4.11.0: Oyuncu cozumleme. Admin -> ADMIN_OYUNCU (onizleme; herhangi sinif,
//   test altini, admin araclari). Ogrenci/demo -> kendi adi + kendi sinifi (5-8);
//   altin = puan - harcanan. Diger roller oynayamaz.
async function oyuncuCoz(req, sinifParam) {
    // v4.12.0: Once OTURUM kullanicisina bak. Gercek ogrenci/demo ise KENDI
    //   kimligiyle, kendi sinif gezegeninde oynar — admin Basic-Auth (adminGirisli)
    //   ayni tarayicida yapiskan kalmis olsa bile. Boylece bir ogrenci hesabi asla
    //   admin onizlemesine (tum dunyalar + test altini) dusmez.
    const su = req.session && req.session.kullaniciAdi;
    if (su) {
        // v4.13.1: Oturumda kullanici varsa ve sinif seviyesi (5-8) belirliyse, ROLU
        //   ne olursa olsun YALNIZ kendi gezegeninde oynar. Boylece hicbir gercek
        //   kullanici (yapiskan admin/adminGirisli olsa bile) tum dunyalari goren
        //   onizlemeye dusemez.
        const k = await Kullanici.findOne({ kullaniciAdi: su }, 'rol sinif').lean();
        if (k) {
            const m = String(k.sinif == null ? '' : k.sinif).match(/([5-8])/);
            if (m) return { ok: true, kullaniciAdi: su, sinif: m[1], admin: false };
        }
    }
    // Ogrenci/demo oturumu yoksa: saf admin (Basic-Auth) -> onizleme.
    if (adminMi(req)) {
        const s = ['5', '6', '7', '8'].includes(String(sinifParam)) ? String(sinifParam) : '5';
        return { ok: true, kullaniciAdi: ADMIN_OYUNCU, sinif: s, admin: true };
    }
    return { ok: false };
}

// v4.13.0: Iki tarih ayni gun mu (gunluk saldiri limiti).
function ayniGunMu(a, b) {
    a = new Date(a); b = new Date(b);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// v4.13.0: Oyuncu kusatilmis mi? Tum hucrelerinin 4-komsusu dolu/kilitli/kenar ise
//   (hic bos+kilitsiz komsu yok) kusatilmistir; uzak sicramaya izin verilir.
async function kusatildiMi(sinif, oyuncuAdi) {
    const tum = await OyunHucre.find({ sinif }, 'x y sahip').lean();
    const occSet = new Set(tum.map(h => h.x + ',' + h.y));
    const lockSet = await kilitSeti();
    const benim = tum.filter(h => h.sahip === oyuncuAdi);
    if (!benim.length) return false;
    for (const h of benim) {
        for (const dd of KOMSU) {
            const nx = h.x + dd[0], ny = h.y + dd[1];
            if (nx < 0 || ny < 0 || nx >= DW || ny >= DH) continue;
            const kk = nx + ',' + ny;
            if (!occSet.has(kk) && !lockSet.has(kk)) return false;
        }
    }
    return true;
}

// Turkiye taslagi (opsiyonel seed) icin yaklasik poligon + yardimcilar.
const TR_POLY = [
  [26.0,41.7],[28.0,42.0],[31.5,41.8],[35.0,42.0],[38.0,41.3],[41.0,41.5],
  [41.5,41.0],[43.5,41.2],[44.0,39.8],[44.8,39.0],[44.2,37.8],[42.0,37.2],
  [38.5,36.7],[36.5,36.2],[36.0,36.0],[35.5,36.6],[32.0,36.0],[30.0,36.3],
  [28.5,36.6],[27.2,37.0],[26.3,38.3],[26.7,39.5],[26.2,40.5],[26.0,41.0]
];
function hucreLonLat(x, y) { return [ (x + 0.5) / DW * 360 - 180, 90 - (y + 0.5) / DH * 180 ]; }
function noktaPoligonda(px, py, poly) {
    let ic = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) ic = !ic;
    }
    return ic;
}
async function kilitSeti() { const ks = await OyunKilit.find({}, 'x y').lean(); return new Set(ks.map(k => k.x + ',' + k.y)); }
async function kilitliMi(x, y) { return !!(await OyunKilit.findOne({ x, y }, '_id').lean()); }

// v4.10.0: Kusatma tespiti — (sx,sy) bos hucresinden 4-yon flood-fill. Bolge
//   yalnizca benim hucrelerim + kilitler ile cevriliyse (dunya kenarina kacis
//   yok, baska oyuncuya degmez) kapali=true ve hucreler doner. occupied: Map(key->sahip).
function bolgeTara(sx, sy, occupied, locks, benimAdi) {
    const CAP = 20000;
    const seen = new Set([sx + ',' + sy]);
    const stack = [[sx, sy]];
    const hucreler = [];
    while (stack.length) {
        const cur = stack.pop(); const cx = cur[0], cy = cur[1];
        hucreler.push(cur);
        if (cx === 0 || cy === 0 || cx === DW - 1 || cy === DH - 1) return { kapali: false };
        if (hucreler.length > CAP) return { kapali: false };
        for (const d of KOMSU) {
            const nx = cx + d[0], ny = cy + d[1];
            if (nx < 0 || ny < 0 || nx >= DW || ny >= DH) continue;
            const key = nx + ',' + ny;
            const sah = occupied.get(key);
            if (sah) { if (sah !== benimAdi) return { kapali: false }; continue; }
            if (locks.has(key)) continue;
            if (!seen.has(key)) { seen.add(key); stack.push([nx, ny]); }
        }
    }
    return { kapali: true, hucreler };
}

// v4.10.0: Bekleyen fetih kuyrugunu altin elverdikce isler. Fiyat satin almayla
//   ayni: 10 x mevcut hucre. Altin yetmezse durur, kalan kuyrukta bekler; altin
//   gelince (tekrar cagrilinca) kaldigi yerden devam eder.
async function bekleyenFetihIsle(oyuncu, sinif) {
    if (!oyuncu.bekleyenFetih || !oyuncu.bekleyenFetih.length) return 0;
    const occupied = new Set((await OyunHucre.find({ sinif }, 'x y').lean()).map(h => h.x + ',' + h.y));
    let say = await OyunHucre.countDocuments({ sinif, sahip: oyuncu.kullaniciAdi });
    let bakiye = await altinBakiye(oyuncu);
    const kalan = [], ekle = [];
    let durdu = false;
    for (const c of oyuncu.bekleyenFetih) {
        const key = c.x + ',' + c.y;
        if (occupied.has(key)) continue;
        if (durdu) { kalan.push(c); continue; }
        const fiyat = 10 * say;
        if (bakiye < fiyat) { durdu = true; kalan.push(c); continue; }
        ekle.push({ sinif, x: c.x, y: c.y, sahip: oyuncu.kullaniciAdi });
        occupied.add(key); bakiye -= fiyat; say += 1;
        oyuncu.harcananAltin = (oyuncu.harcananAltin || 0) + fiyat;
    }
    if (ekle.length) await OyunHucre.insertMany(ekle);
    oyuncu.bekleyenFetih = kalan;
    oyuncu.markModified('bekleyenFetih');
    await oyuncu.save();
    return ekle.length;
}

function hashStr(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }
const ADJ = ['Mavi', 'Kizil', 'Altin', 'Gumus', 'Parlak', 'Sessiz', 'Hizli', 'Gizemli', 'Yesil', 'Mor', 'Beyaz', 'Turuncu'];
const NOUN = ['Kuyrukluyildiz', 'Yildiz', 'Nebula', 'Komet', 'Meteor', 'Galaksi', 'Pulsar', 'Yorunge', 'Asteroit', 'Ay'];
const RENK = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac', '#f06292', '#9575cd', '#aed581', '#4fc3f7', '#ff8a65', '#a1887f'];
function rumuzUret(id) { const h = hashStr(id); return ADJ[h % ADJ.length] + ' ' + NOUN[(h >> 3) % NOUN.length] + '-' + (h % 90 + 10); }
function renkUret(id) { return RENK[hashStr(id) % RENK.length]; }

async function oyuncuGetir(kullaniciAdi, sinif) {
    let o = await OyunOyuncu.findOne({ kullaniciAdi, sinif });
    if (!o) {
        const id = sinif + ':' + kullaniciAdi;
        o = await new OyunOyuncu({
            kullaniciAdi, sinif,
            rumuz: (kullaniciAdi === ADMIN_OYUNCU) ? 'Komutan (Onizleme)' : rumuzUret(id),
            renk: (kullaniciAdi === ADMIN_OYUNCU) ? '#ffd54f' : renkUret(id),
            harcananAltin: 0
        }).save();
    }
    return o;
}
async function altinBakiye(oyuncu) {
    if (oyuncu.kullaniciAdi === ADMIN_OYUNCU) return ADMIN_TEST_ALTIN - (oyuncu.harcananAltin || 0);
    const k = await Kullanici.findOne({ kullaniciAdi: oyuncu.kullaniciAdi }, 'puan').lean();
    return Math.round((k && k.puan) || 0) - (oyuncu.harcananAltin || 0);
}

// ---- GET /oyun : dunya secici ----
router.get('/oyun', async (req, res) => {
    const ctx = await oyuncuCoz(req);
    if (!ctx.ok) return kapali(res);
    // v4.12.0: Ogrenci/demo oturumu (yapiskan admin olsa bile) kendi gezegenine gider;
    //   secici (tum dunyalar) yalniz saf admin onizlemesinde gosterilir.
    if (!ctx.admin) return res.redirect('/oyun/' + ctx.sinif);
    // v4.13.1: Tum-dunya secicisi YALNIZ acik istekle (?yonetici=1) gosterilir.
    //   Aksi halde ciplak /oyun hicbir zaman tum dunyalari listelemez; saf admin
    //   tek bir dunyaya yonlendirilir (istedigi dunyaya /oyun/<sinif> ile gidebilir).
    if (req.query.yonetici !== '1') return res.redirect('/oyun/8');
    const kart = (s, ad) => '<a href="/oyun/' + s + '" style="display:block;padding:22px;margin:10px 0;background:linear-gradient(135deg,#15324f,#0d2540);color:#fff;border-radius:14px;text-decoration:none;font-size:18px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.3);">&#127758; ' + ad + '</a>';
    res.send('<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bilgi Gezegenleri</title></head>'
        + '<body style="margin:0;background:#070d1c;color:#e8eaf6;font-family:Segoe UI,sans-serif;min-height:100vh;">'
        + '<div style="max-width:520px;margin:0 auto;padding:30px 20px;">'
        + '<div style="font-size:13px;color:#9fa8da;">YONETICI ONIZLEMESI</div>'
        + '<h1 style="margin:0 0 6px;">&#127758; Bilgi Gezegenleri</h1>'
        + '<p style="color:#9fa8da;font-size:14px;">Bir sinif dunyasi sec. Her sinifin kendi dunyasi var. Ogrencilere kapali.</p>'
        + kart('5', '5. Sinif Dunyasi') + kart('6', '6. Sinif Dunyasi') + kart('7', '7. Sinif Dunyasi') + kart('8', '8. Sinif Dunyasi')
        + '<a href="/admin" style="display:inline-block;margin-top:16px;color:#9fa8da;font-size:13px;">&#8592; Admin paneline don</a>'
        + '</div></body></html>');
});

// ---- GET /oyun/veri/:sinif?vx&vy : viewport JSON ----
router.get('/oyun/veri/:sinif', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.params.sinif);
    if (!ctx.ok) return res.status(403).json({ ok: false });
    const sinif = ctx.sinif, OYUNCU = ctx.kullaniciAdi;
    let vx = clamp(parseInt(req.query.vx) || 0, 0, DW - VP);
    let vy = clamp(parseInt(req.query.vy) || 0, 0, DH - VP);
    try {
        const ben = await oyuncuGetir(OYUNCU, sinif);
        await bekleyenFetihIsle(ben, sinif); // altin geldiyse bekleyen fetihleri isle
        const owned = await OyunHucre.find({
            sinif,
            x: { $gte: vx - 1, $lte: vx + VP },
            y: { $gte: vy - 1, $lte: vy + VP }
        }, 'x y sahip').lean();
        const oyuncular = await OyunOyuncu.find({ sinif }, 'kullaniciAdi rumuz renk').lean();
        const players = {};
        oyuncular.forEach(o => { players[o.kullaniciAdi] = { rumuz: o.rumuz, renk: o.renk }; });
        const klist = await OyunKilit.find({
            x: { $gte: vx, $lt: vx + VP },
            y: { $gte: vy, $lt: vy + VP }
        }, 'x y').lean();
        const bloke = klist.map(k => k.x + ',' + k.y);
        const bekleyen = (ben.bekleyenFetih || []).filter(c => c.x >= vx && c.x < vx + VP && c.y >= vy && c.y < vy + VP).map(c => c.x + ',' + c.y);
        const hucreSayisi = await OyunHucre.countDocuments({ sinif, sahip: OYUNCU });
        const bakiye = await altinBakiye(ben);
        const kusatildi = await kusatildiMi(sinif, OYUNCU);
        const saldiriHakki = !(ben.sonSaldiriTarih && ayniGunMu(ben.sonSaldiriTarih, new Date()));
        res.json({ ok: true, vx, vy, owned, players, bloke, bekleyen, bakiye, hucreSayisi, fiyat: 10 * hucreSayisi, admin: OYUNCU, kusatildi, saldiriHakki });
    } catch (e) {
        console.error('[oyun veri]', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// ---- GET /oyun/minimap/:sinif : tum sahipli hucreler ----
router.get('/oyun/minimap/:sinif', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.params.sinif);
    if (!ctx.ok) return res.status(403).json({ ok: false });
    const sinif = ctx.sinif;
    try {
        const hucreler = await OyunHucre.find({ sinif }, 'x y sahip').lean();
        const oyuncular = await OyunOyuncu.find({ sinif }, 'kullaniciAdi renk').lean();
        const renkMap = {};
        oyuncular.forEach(o => { renkMap[o.kullaniciAdi] = o.renk; });
        const noktalar = hucreler.map(h => ({ x: h.x, y: h.y, renk: renkMap[h.sahip] || '#888' }));
        res.json({ ok: true, noktalar });
    } catch (e) { res.status(500).json({ ok: false }); }
});

// ---- GET /oyun/siralama/:sinif : rumuz + alinan hucre (azalan) ----
router.get('/oyun/siralama/:sinif', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.params.sinif);
    if (!ctx.ok) return res.status(403).json({ ok: false });
    const sinif = ctx.sinif, OYUNCU = ctx.kullaniciAdi;
    try {
        const agg = await OyunHucre.aggregate([
            { $match: { sinif } },
            { $group: { _id: '$sahip', sayi: { $sum: 1 } } },
            { $sort: { sayi: -1 } },
            { $limit: 50 }
        ]);
        const oyuncular = await OyunOyuncu.find({ sinif }, 'kullaniciAdi rumuz renk').lean();
        const pm = {};
        oyuncular.forEach(o => { pm[o.kullaniciAdi] = { rumuz: o.rumuz, renk: o.renk }; });
        const liste = agg.map(a => ({
            rumuz: (pm[a._id] || {}).rumuz || a._id,
            renk: (pm[a._id] || {}).renk || '#888',
            sayi: a.sayi,
            ben: a._id === OYUNCU
        }));
        res.json({ ok: true, liste });
    } catch (e) {
        console.error('[oyun siralama]', e.message);
        res.status(500).json({ ok: false });
    }
});

// ---- GET /oyun/:sinif : viewport kabuk ----
router.get('/oyun/:sinif', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.params.sinif);
    if (!ctx.ok) return kapali(res);
    // v4.11.1: Ogrenci YALNIZ kendi sinif seviyesindeki gezegeni gorur. Farkli bir
    //   sinif URL'sine giderse kendi dunyasina yonlendirilir (admin haric).
    if (!ctx.admin && String(req.params.sinif) !== ctx.sinif) return res.redirect('/oyun/' + ctx.sinif);
    const sinif = ctx.sinif, OYUNCU = ctx.kullaniciAdi;
    try {
        const ben = await oyuncuGetir(OYUNCU, sinif);
        const benimler = await OyunHucre.find({ sinif, sahip: OYUNCU }, 'x y').lean();
        let cx = NAZILLI.x, cy = NAZILLI.y;
        if (benimler.length) {
            let sx = 0, sy = 0; benimler.forEach(h => { sx += h.x; sy += h.y; });
            cx = Math.round(sx / benimler.length); cy = Math.round(sy / benimler.length);
        }
        const vx = clamp(cx - Math.floor(VP / 2), 0, DW - VP);
        const vy = clamp(cy - Math.floor(VP / 2), 0, DH - VP);
        res.send(kabukHtml({ sinif, rumuz: ben.rumuz, renk: ben.renk, vx, vy, ilkHucreYok: benimler.length === 0, admin: ctx.admin, benId: OYUNCU }));
    } catch (e) {
        console.error('[oyun kabuk]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

// ---- POST /oyun/baslangic : OTOMATIK + kumeleyici (ucretsiz) ----
router.post('/oyun/baslangic', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.body.sinif);
    if (!ctx.ok) return res.status(403).json({ ok: false });
    const sinif = ctx.sinif, OYUNCU = ctx.kullaniciAdi;
    try {
        await oyuncuGetir(OYUNCU, sinif);
        const varOlan = await OyunHucre.countDocuments({ sinif, sahip: OYUNCU });
        if (varOlan > 0) return res.json({ ok: true });
        // kume merkezi: tum hucrelerin ortasi (oyuncular birbirine yakin dogsun), yoksa Nazilli
        const hepsi = await OyunHucre.find({ sinif }, 'x y').lean();
        let mx = NAZILLI.x, my = NAZILLI.y;
        if (hepsi.length) { let sx = 0, sy = 0; hepsi.forEach(h => { sx += h.x; sy += h.y; }); mx = Math.round(sx / hepsi.length); my = Math.round(sy / hepsi.length); }
        const dolu = new Set(hepsi.map(h => h.x + ',' + h.y));
        const kset = await kilitSeti();
        let sec = null;
        for (let r = 0; r < 120 && !sec; r++) {
            for (let dy = -r; dy <= r && !sec; dy++) for (let dx = -r; dx <= r && !sec; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const x = clamp(mx + dx, 0, DW - 1), y = clamp(my + dy, 0, DH - 1);
                if (!dolu.has(x + ',' + y) && !kset.has(x + ',' + y)) sec = [x, y];
            }
        }
        if (!sec) sec = [clamp(mx, 0, DW - 1), clamp(my, 0, DH - 1)];
        await new OyunHucre({ sinif, x: sec[0], y: sec[1], sahip: OYUNCU }).save();
        res.json({ ok: true, x: sec[0], y: sec[1] });
    } catch (e) {
        console.error('[oyun baslangic]', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/hucre-al : bitisik satin alma (artan fiyat) ----
router.post('/oyun/hucre-al', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.body.sinif);
    if (!ctx.ok) return res.status(403).json({ ok: false, hata: 'Yetki yok.' });
    const sinif = ctx.sinif, OYUNCU = ctx.kullaniciAdi;
    const x = parseInt(req.body.x), y = parseInt(req.body.y);
    if (Number.isNaN(x) || Number.isNaN(y) || x < 0 || y < 0 || x >= DW || y >= DH) return res.json({ ok: false, hata: 'Gecersiz hucre.' });
    try {
        if (await kilitliMi(x, y)) return res.json({ ok: false, hata: 'Bu hucre kilitli, alinamaz.' });
        const ben = await oyuncuGetir(OYUNCU, sinif);
        const say = await OyunHucre.countDocuments({ sinif, sahip: OYUNCU });
        if (say === 0) return res.json({ ok: false, hata: 'Once baslangic yurdunu al.' });
        const komsu = await OyunHucre.findOne({
            sinif, sahip: OYUNCU,
            $or: [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }]
        }, '_id').lean();
        if (!komsu) {
            // v4.13.0: kusatma kacisi — komsu bos+kilitsiz hucre kalmadiysa uzak sicramaya izin
            const kus = await kusatildiMi(sinif, OYUNCU);
            if (!kus) return res.json({ ok: false, hata: 'Yalniz kendi topragina komsu hucre alinabilir.' });
        }
        const dolu = await OyunHucre.findOne({ sinif, x, y }, '_id').lean();
        if (dolu) return res.json({ ok: false, hata: 'Bu hucre zaten alinmis.' });
        const fiyat = 10 * say;
        const bakiye = await altinBakiye(ben);
        if (bakiye < fiyat) return res.json({ ok: false, hata: 'Yetersiz altin (' + fiyat + ' gerekli).' });
        await new OyunHucre({ sinif, x, y, sahip: OYUNCU }).save();
        ben.harcananAltin = (ben.harcananAltin || 0) + fiyat;
        await ben.save();
        // v4.10.0: bu alimla kapanan cep(ler)i kusatma tespiti ile fetih kuyruguna al
        if (!Array.isArray(ben.bekleyenFetih)) ben.bekleyenFetih = [];
        const occ = new Map();
        (await OyunHucre.find({ sinif }, 'x y sahip').lean()).forEach(h => occ.set(h.x + ',' + h.y, h.sahip));
        const locks = await kilitSeti();
        const mevcutKuyruk = new Set(ben.bekleyenFetih.map(q => q.x + ',' + q.y));
        const eklendi = new Set();
        for (const d of KOMSU) {
            const nx = x + d[0], ny = y + d[1], key = nx + ',' + ny;
            if (nx < 0 || ny < 0 || nx >= DW || ny >= DH) continue;
            if (occ.has(key) || locks.has(key)) continue;
            const r = bolgeTara(nx, ny, occ, locks, OYUNCU);
            if (r.kapali) r.hucreler.forEach(c => {
                const k = c[0] + ',' + c[1];
                if (!eklendi.has(k) && !mevcutKuyruk.has(k)) { eklendi.add(k); ben.bekleyenFetih.push({ x: c[0], y: c[1] }); }
            });
        }
        if (eklendi.size) { ben.markModified('bekleyenFetih'); await ben.save(); }
        await bekleyenFetihIsle(ben, sinif);
        const yeniBakiye = await altinBakiye(ben);
        res.json({ ok: true, bakiye: yeniBakiye, fetih: eklendi.size });
    } catch (e) {
        console.error('[oyun hucre-al]', e.message);
        res.json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/test-komsu : bitisik sahte oyuncu ----
router.post('/oyun/test-komsu', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.body.sinif);
    try {
        const benimler = await OyunHucre.find({ sinif, sahip: ADMIN_OYUNCU }, 'x y').lean();
        if (!benimler.length) return res.json({ ok: false, hata: 'Once baslangic yurdunu al.' });
        const tumDolu = new Set((await OyunHucre.find({ sinif }, 'x y').lean()).map(h => h.x + ',' + h.y));
        const kset = await kilitSeti();
        let hedef = null;
        for (const h of benimler) {
            for (const [dx, dy] of KOMSU) {
                const nx = h.x + dx, ny = h.y + dy;
                if (nx >= 0 && ny >= 0 && nx < DW && ny < DH && !tumDolu.has(nx + ',' + ny) && !kset.has(nx + ',' + ny)) { hedef = [nx, ny]; break; }
            }
            if (hedef) break;
        }
        if (!hedef) return res.json({ ok: false, hata: 'Bitisik bos/kilitsiz hucre yok.' });
        const sahteSay = await OyunOyuncu.countDocuments({ sinif, kullaniciAdi: /^__test_komsu_/ });
        const id = '__test_komsu_' + (sahteSay + 1) + '__';
        await oyuncuGetir(id, sinif);
        await new OyunHucre({ sinif, x: hedef[0], y: hedef[1], sahip: id }).save();
        res.json({ ok: true });
    } catch (e) {
        console.error('[oyun test-komsu]', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/kilit-degistir : tek hucre kilit toggle (GLOBAL) ----
router.post('/oyun/kilit-degistir', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const x = parseInt(req.body.x), y = parseInt(req.body.y);
    if (Number.isNaN(x) || Number.isNaN(y) || x < 0 || y < 0 || x >= DW || y >= DH) return res.json({ ok: false });
    try {
        const v = await OyunKilit.findOne({ x, y }, '_id').lean();
        if (v) { await OyunKilit.deleteOne({ x, y }); return res.json({ ok: true, locked: false }); }
        await new OyunKilit({ x, y }).save();
        res.json({ ok: true, locked: true });
    } catch (e) {
        if (e.code === 11000) return res.json({ ok: true, locked: true });
        res.status(500).json({ ok: false });
    }
});

// ---- POST /oyun/kilit-turkiye-taslak : poligon hucrelerini kilitle (opsiyonel seed) ----
router.post('/oyun/kilit-turkiye-taslak', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    try {
        const ops = [];
        for (let y = 50; y <= 63; y++) for (let x = 225; x <= 253; x++) {
            const ll = hucreLonLat(x, y);
            if (noktaPoligonda(ll[0], ll[1], TR_POLY)) ops.push({ updateOne: { filter: { x, y }, update: { $set: { x, y } }, upsert: true } });
        }
        if (ops.length) await OyunKilit.bulkWrite(ops, { ordered: false });
        res.json({ ok: true, adet: ops.length });
    } catch (e) {
        console.error('[oyun kilit-taslak]', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/kilit-temizle : tum kilitleri sil ----
router.post('/oyun/kilit-temizle', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    try { await OyunKilit.deleteMany({}); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ ok: false }); }
});

// ---- POST /oyun/sifirla : sinif dunyasini sifirla (kilitler korunur) ----
router.post('/oyun/sifirla', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.body.sinif);
    try {
        await OyunHucre.deleteMany({ sinif });
        await OyunOyuncu.deleteMany({ sinif });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false }); }
});

// ============ KABUK HTML ============
function kabukHtml(opt) {
    const { sinif, rumuz, renk, vx, vy, ilkHucreYok, admin, benId } = opt;
    const HUC = 28;
    return '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + sinif + '. Sinif Dunyasi</title>'
+ '<style>'
+ '*{box-sizing:border-box;}'
+ 'body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#15324f,#060d1c 55%),#05080f;color:#e8eaf6;font-family:"Segoe UI",system-ui,sans-serif;min-height:100vh;}'
+ '.topbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(8,12,28,.6);}'
+ '.topbar h1{font-size:18px;margin:0;font-weight:600;} .bc{font-size:12px;color:#9fa8da;text-decoration:none;}'
+ '.alt-rozet{margin-left:auto;background:linear-gradient(135deg,#ffd54f,#ff9800);color:#3a2400;font-weight:800;padding:7px 16px;border-radius:20px;font-size:15px;}'
+ '.layout{display:flex;gap:16px;align-items:flex-start;padding:16px 18px 40px;max-width:1180px;margin:0 auto;flex-wrap:wrap;}'
+ '.panel{background:rgba(20,24,52,.72);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:14px;flex:0 0 220px;}'
+ '.panel h2{font-size:11px;letter-spacing:.12em;color:#9fa8da;margin:0 0 10px;font-weight:700;}'
+ '.sen-ad{display:flex;align-items:center;gap:7px;font-size:16px;font-weight:700;margin-bottom:10px;}'
+ '.sat{display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);font-size:13px;} .sat b{color:#fff;} .altin{color:#ffd54f;font-weight:800;}'
+ '.center{flex:1 1 560px;min-width:300px;display:flex;flex-direction:column;align-items:center;}'
+ '.vpwrap{position:relative;width:' + (VP * HUC) + 'px;max-width:100%;aspect-ratio:1/1;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#0c2c49;}'
+ '.worldbg{position:absolute;inset:0;background-image:url(/world.svg);background-repeat:no-repeat;background-size:' + (DW / VP * 100) + '% ' + (DH / VP * 100) + '%;}'
+ '.grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(' + VP + ',1fr);grid-template-rows:repeat(' + VP + ',1fr);}'
+ '.hc{position:relative;}'
+ '.hc.alinabilir{cursor:pointer;}'
+ '.hc.alinabilir:after{content:"+";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#a5d6a7;font-size:15px;background:rgba(129,199,132,.18);border:1px dashed #81c784;border-radius:4px;}'
+ '.hc.alinabilir:hover:after{background:rgba(129,199,132,.4);}'
+ '.hc.dolu{border:3px solid transparent;border-radius:3px;}'
+ '.hc.bloke{background:repeating-linear-gradient(45deg,rgba(229,57,53,.30),rgba(229,57,53,.30) 4px,rgba(229,57,53,.15) 4px,rgba(229,57,53,.15) 8px);border:1px solid rgba(229,57,53,.55);border-radius:3px;}'
+ '.hc.bekle{background:repeating-linear-gradient(45deg,rgba(255,193,79,.40),rgba(255,193,79,.40) 4px,rgba(255,193,79,.16) 4px,rgba(255,193,79,.16) 8px);border:1.5px dashed rgba(133,79,11,.85);border-radius:3px;}'
+ '.hc.duello{cursor:crosshair;} .hc.duello .swd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.65;text-shadow:0 0 3px #000;} .hc.duello:hover .swd{opacity:1;transform:scale(1.25);}'
+ '.hc.sicrama{cursor:pointer;background:rgba(79,143,255,.18);border:1px dashed #4f8fff;border-radius:4px;} .hc.sicrama .jmp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#bbdefb;} .hc.sicrama:hover{background:rgba(79,143,255,.36);}'
+ '.hc.kduzen{cursor:pointer;outline:1px solid rgba(255,255,255,.12);outline-offset:-1px;}'
+ '.hc.kduzen:hover{background:rgba(255,213,79,.25);}'
+ '.lbl{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:4px;background:rgba(8,12,28,.88);border:1.5px solid #777;border-radius:14px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;pointer-events:none;z-index:5;}'
+ '.lbl .nk{width:8px;height:8px;border-radius:50%;display:inline-block;}'
+ '.dpad{display:grid;grid-template-columns:repeat(3,40px);grid-template-rows:repeat(3,40px);gap:4px;margin-top:12px;}'
+ '.dpad button{background:rgba(40,46,86,.9);border:1px solid rgba(255,255,255,.12);color:#e8eaf6;border-radius:8px;font-size:16px;cursor:pointer;}'
+ '.dpad button:hover{background:rgba(60,68,120,.95);}'
+ '.abtn{border-radius:22px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;color:#e8eaf6;background:rgba(40,46,86,.9);border:1px solid rgba(255,255,255,.12);margin:4px 4px 0 0;}'
+ '.abtn-vurgu{background:linear-gradient(135deg,#43a047,#2e7d32);border:none;} .abtn-tehlike{background:linear-gradient(135deg,#c62828,#8e1c1c);border:none;}'
+ '.mini{position:relative;width:200px;height:100px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.15);background:#0c2c49 url(/world.svg) no-repeat;background-size:200px 100px;cursor:crosshair;margin-top:6px;}'
+ '.mini .vprect{position:absolute;border:1.5px solid #ffd54f;box-shadow:0 0 6px rgba(255,213,79,.8);}'
+ '.mini .dot{position:absolute;width:2px;height:2px;border-radius:1px;}'
+ '.ipucu{color:#9fa8da;font-size:12px;line-height:1.5;margin:10px 0 0;max-width:' + (VP * HUC) + 'px;text-align:center;}'
+ '.sira-sat{display:flex;align-items:center;gap:7px;padding:4px 0;border-top:1px solid rgba(255,255,255,.06);font-size:13px;}'
+ '</style></head>'
+ '<body>'
+ '<div class="topbar">' + (admin ? '<a class="bc" href="/admin">&#8592; admin</a><a class="bc" href="/oyun">dunya degistir</a>' : '<a class="bc" href="/panel/' + encodeURIComponent(benId) + '">&#8592; panelim</a>') + '<h1>&#127758; ' + sinif + '. Sinif Dunyasi</h1><button class="bc" onclick="kurallarAc()" style="background:none;border:none;cursor:pointer;font-family:inherit;">&#128220; Kurallar</button><div class="alt-rozet">&#129689; <span id="bakiye">...</span> altin</div></div>'
+ '<div class="layout">'
+ '<aside class="panel"><h2>TOPRAK SAHIBI</h2><div class="sen-ad"><span>&#128081;</span><span style="color:' + esc(renk) + ';">' + esc(rumuz) + '</span></div>'
+ '<div class="sat"><span>Topraklarin</span><b id="hsay">0</b></div>'
+ '<div class="sat"><span>Altin</span><b class="altin" id="bakiye2">...</b></div>'
+ '<div class="sat"><span>Sonraki hucre</span><b class="altin" id="fiyat">0</b></div>'
+ '<div class="sat"><span>Konum</span><b id="konum">-</b></div>'
+ '<div class="sat"><span>Saldiri hakki</span><b id="saldiriHakki">-</b></div>'
+ (ilkHucreYok ? '<button class="abtn abtn-vurgu" style="margin-top:12px;width:100%;" onclick="baslangic()">&#127922; Baslangic yurdu (otomatik)</button>' : '')
+ '<h2 style="margin-top:16px;">MINI HARITA</h2><div class="mini" id="mini" onclick="miniTikla(event)"><div class="vprect" id="vprect"></div></div>'
+ '<div class="ipucu" style="text-align:left;">Mini haritaya tikla = oraya atla. Yon tuslari/oklar = kaydir.</div>'
+ '</aside>'
+ '<main class="center">'
+ '<div class="vpwrap"><div class="worldbg" id="worldbg"></div><div class="grid" id="grid"></div></div>'
+ '<div class="dpad"><span></span><button onclick="kaydir(0,-3)">&#9650;</button><span></span>'
+ '<button onclick="kaydir(-3,0)">&#9664;</button><span></span><button onclick="kaydir(3,0)">&#9654;</button>'
+ '<span></span><button onclick="kaydir(0,3)">&#9660;</button><span></span></div>'
+ '<p class="ipucu">Yesil "+" hucreler kendi topragina komsu; tikla = satin al (her hucre, okyanus dahil). Fiyat = 10 x mevcut hucre. Uzak rakipleri gormek icin kaydir.</p>'
+ (admin ? ('<div><button class="abtn" onclick="testKomsu()">&#128101; Test komsu</button><button class="abtn abtn-tehlike" onclick="sifirla()">&#128465; Sifirla (dunya)</button></div>'
+ '<div style="margin-top:6px;"><button class="abtn" id="kduzenBtn" onclick="kilitDuzenle()">&#128274; Kilit duzenle</button>'
+ '<span id="kilitAraclar" style="display:none;"><button class="abtn" onclick="turkiyeTaslak()">&#127481; Turkiye taslagi</button><button class="abtn abtn-tehlike" onclick="kilitTemizle()">Kilitleri temizle</button></span></div>'
+ '<p class="ipucu" id="kilitIpucu" style="display:none;color:#ffcc80;">KILIT DUZENLEME ACIK: haritada bir hucreye tikla = kilitle / ac. Kilitler tum sinif dunyalarinda gecerli.</p>') : '')
+ '</main>'
+ '<aside class="panel"><h2>GORUNUR BOLGE SAHIPLERI</h2><div id="lejant" style="font-size:13px;color:#9fa8da;">-</div>'
+ '<h2 style="margin-top:18px;">SIRALAMA (' + sinif + '. Sinif)</h2><div id="siralama" style="font-size:13px;color:#9fa8da;">-</div></aside>'
+ '</div>'
+ '<div id="kurallarModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:50;align-items:center;justify-content:center;padding:20px;"><div style="background:#0e1830;border:1px solid rgba(255,255,255,.15);border-radius:16px;max-width:560px;width:100%;max-height:85vh;overflow:auto;padding:22px;"><div style="display:flex;align-items:center;margin-bottom:10px;"><h2 style="margin:0;font-size:18px;">&#128220; Bilgi Gezegenleri - Kurallar</h2><button onclick="kurallarKapat()" style="margin-left:auto;background:none;border:none;color:#9fa8da;font-size:24px;cursor:pointer;">&times;</button></div>' + kurallarMetni() + '</div></div>'
+ '<div id="duelloModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:50;align-items:center;justify-content:center;padding:20px;"><div style="background:#0e1830;border:1px solid rgba(255,255,255,.15);border-radius:16px;max-width:380px;width:100%;padding:24px;text-align:center;"><div id="duelloIkon" style="font-size:40px;margin-bottom:6px;"></div><h2 id="duelloBaslik" style="margin:0 0 10px;font-size:20px;"></h2><p style="color:#b9c2e8;font-size:14px;line-height:1.7;">Rakip: <b id="duelloRakip"></b><br>Ortak bir soruda sure kiyasi:<br>Senin suren: <b id="duelloBenSure"></b> sn<br>Rakibin suresi: <b id="duelloRakipSure"></b> sn</p><p id="duelloNot" style="font-size:13px;color:#9fa8da;"></p><button onclick="duelloKapat()" class="abtn" style="margin-top:6px;">Kapat</button></div></div>'
+ scriptBlok({ sinif, vx, vy, HUC, benId })
+ '</body></html>';
}

function kurallarMetni() {
    return '<div style="font-size:13.5px;line-height:1.7;color:#d6dbf5;">'
+ '<p><b>Amac:</b> Kendi sinif dunyanda topraklarini buyut, siralamada yuksel.</p>'
+ '<p><b>Altin:</b> Altinin = toplam puanin - oyunda harcadigin. Soru cozdukce puan (=altin) kazanirsin. Oyunda harcamak akademik puanini ve siralamani DUSURMEZ.</p>'
+ '<p><b>Baslangic:</b> "Baslangic yurdu" ile ilk hucren otomatik, oyunculara yakin bir noktaya kurulur (ucretsiz).</p>'
+ '<p><b>Hucre alma:</b> Yalniz kendi topragina komsu (yan yana) bos hucreler alinabilir. Her yeni hucre bir oncekinden 10 altin pahalidir (10 x mevcut hucre sayisi). Okyanus dahil her hucre alinabilir.</p>'
+ '<p><b>Kilitli alanlar:</b> Kirmizi tarali hucreler (Turkiye Cumhuriyeti) alinamaz; duvar gibidir.</p>'
+ '<p><b>Kusatma = otomatik fetih:</b> Bir bos alani kendi hucrelerinle (veya kilitli duvarlarla) tamamen cevirirsen, icindeki tum hucreler otomatik senin olur. Fetih fiyati satin almayla aynidir. Altinin yetmezse fetih bekler; yeni altin kazandikca otomatik devam eder.</p>'
+ '<p><b>Gezinme:</b> Dunya buyuktur; ekranda 20x20 alan gorunur. Yon tuslari/oklar ile kaydir, mini haritaya tiklayarak uzaga atla.</p>'
+ '<p><b>Siralama:</b> Sag panelde sinif dunyandaki oyuncular hucre sayisina gore siralanir.</p>'
+ '<p><b>Duello:</b> Kendi topragina komsu bir DUSMAN hucresine tiklayarak duello acabilirsin. Ikinizin de DOGRU cozdugu ortak bir soru rastgele secilir; o soruyu daha KISA surede cozen kazanir. Kazanirsan o hucre senin olur. Gunde 1 saldiri hakkin vardir. Rakibin son hucresi korumalidir. Ortak dogru cozulmus soru yoksa duello yapilamaz.</p>'
+ '<p><b>Kusatma kacisi:</b> Tamamen kusatildiysan (komsu bos hucre kalmadiysa), bitisiklik sarti olmadan uzaktaki bos bir hucreye sicrayabilirsin; fiyat normaldir (10 x mevcut hucre).</p>'
+ '</div>';
}

function scriptBlok(o) {
    const { sinif, vx, vy, HUC, benId } = o;
    return '<script>'
+ 'var SINIF="' + sinif + '",DW=' + DW + ',DH=' + DH + ',VP=' + VP + ',HUC=' + HUC + ',ADMIN=' + JSON.stringify(benId) + ';'
+ 'var vx=' + vx + ',vy=' + vy + ',MINI=[],kilitMod=false;'
+ 'function clamp(v,a,b){return Math.max(a,Math.min(b,v));}'
+ 'function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}'
+ 'var NB=[[1,0],[-1,0],[0,1],[0,-1]];'
+ 'function setBg(){document.getElementById("worldbg").style.backgroundPosition=(vx/(DW-VP)*100)+"% "+(vy/(DH-VP)*100)+"%";document.getElementById("konum").textContent=vx+","+vy;updateRect();}'
+ 'function updateRect(){var r=document.getElementById("vprect");var sx=200/DW,sy=100/DH;r.style.left=(vx*sx)+"px";r.style.top=(vy*sy)+"px";r.style.width=(VP*sx)+"px";r.style.height=(VP*sy)+"px";}'
+ 'async function render(){setBg();var r=await fetch("/oyun/veri/"+SINIF+"?vx="+vx+"&vy="+vy,{credentials:"same-origin"});var d=await r.json();if(!d.ok)return;'
+ 'document.getElementById("bakiye").textContent=d.bakiye;document.getElementById("bakiye2").textContent=d.bakiye;document.getElementById("hsay").textContent=d.hucreSayisi;document.getElementById("fiyat").textContent=d.fiyat;'
+ 'var shEl=document.getElementById("saldiriHakki");if(shEl){shEl.textContent=d.saldiriHakki?"var":"bugun doldu";shEl.style.color=d.saldiriHakki?"#a5d6a7":"#ef9a9a";}'
+ 'var om={},benim={};d.owned.forEach(function(c){om[c.x+","+c.y]=c.sahip;if(c.sahip===ADMIN)benim[c.x+","+c.y]=1;});var bs={};(d.bloke||[]).forEach(function(k){bs[k]=1;});var beks={};(d.bekleyen||[]).forEach(function(k){beks[k]=1;});'
+ 'var html="";for(var row=0;row<VP;row++){for(var col=0;col<VP;col++){var wx=vx+col,wy=vy+row,key=wx+","+wy;var sahip=om[key];'
+ 'if(kilitMod){html+="<div class=\\"hc kduzen"+(bs[key]?" bloke":"")+"\\" onclick=\\"kilitDegistir("+wx+","+wy+")\\"></div>";}'
+ 'else if(sahip){var pl=d.players[sahip]||{renk:"#777"};var col2=pl.renk||"#777";'
+ 'function bd(dx,dy){return om[(wx+dx)+","+(wy+dy)]===sahip?"transparent":col2;}'
+ 'var st="background:"+hexA(col2,0.34)+";border-top-color:"+bd(0,-1)+";border-bottom-color:"+bd(0,1)+";border-left-color:"+bd(-1,0)+";border-right-color:"+bd(1,0)+";";'
+ 'var dusman=(sahip!==ADMIN),kb=false;if(dusman){for(var di=0;di<NB.length;di++){if(benim[(wx+NB[di][0])+","+(wy+NB[di][1])]){kb=true;break;}}}'
+ 'if(dusman&&kb){html+="<div class=\\"hc dolu duello\\" title=\\"Duello: "+esc(pl.rumuz||sahip)+"\\" style=\\""+st+"\\" onclick=\\"duelloBaslat("+wx+","+wy+")\\"><span class=\\"swd\\">&#9876;</span></div>";}'
+ 'else{html+="<div class=\\"hc dolu\\" title=\\""+esc(pl.rumuz||sahip)+"\\" style=\\""+st+"\\"></div>";}'
+ '}else if(bs[key]){html+="<div class=\\"hc bloke\\" title=\\"Kilitli - alinamaz\\"></div>";}else if(beks[key]){html+="<div class=\\"hc bekle\\" title=\\"Altin bekleniyor - otomatik fetih\\"></div>";}else{var al=false;for(var i=0;i<NB.length;i++){if(benim[(wx+NB[i][0])+","+(wy+NB[i][1])]){al=true;break;}}'
+ 'if(al){html+="<div class=\\"hc alinabilir\\" onclick=\\"al("+wx+","+wy+")\\"></div>";}else if(d.kusatildi){html+="<div class=\\"hc sicrama\\" title=\\"Uzak sicrama (kusatma kacisi)\\" onclick=\\"al("+wx+","+wy+")\\"><span class=\\"jmp\\">&#11015;</span></div>";}else{html+="<div class=\\"hc\\"></div>";}}}}'
+ 'document.getElementById("grid").innerHTML=html;'
+ 'cizEtiket(d);cizLejant(d);}'
+ 'function hexA(h,a){var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(h||"");if(!m)return"rgba(120,120,120,"+a+")";return"rgba("+parseInt(m[1],16)+","+parseInt(m[2],16)+","+parseInt(m[3],16)+","+a+")";}'
+ 'function cizEtiket(d){document.querySelectorAll(".lbl").forEach(function(e){e.remove();});if(kilitMod)return;var grp={};d.owned.forEach(function(c){if(c.x<vx||c.x>=vx+VP||c.y<vy||c.y>=vy+VP)return;(grp[c.sahip]=grp[c.sahip]||[]).push(c);});var wrap=document.querySelector(".vpwrap");Object.keys(grp).forEach(function(s){var cs=grp[s];var pl=d.players[s]||{renk:"#777",rumuz:s};var sx=0,sy=0;cs.forEach(function(c){sx+=c.x;sy+=c.y;});var cx=sx/cs.length,cy=sy/cs.length;var benim=s===ADMIN;var el=document.createElement("div");el.className="lbl";el.style.left=((cx-vx+0.5)/VP*100)+"%";el.style.top=((cy-vy+0.5)/VP*100)+"%";el.style.borderColor=pl.renk;el.innerHTML=(benim?"&#128081; ":"<span class=\\"nk\\" style=\\"background:"+pl.renk+"\\"></span>")+esc(pl.rumuz||s);wrap.appendChild(el);});}'
+ 'function cizLejant(d){var grp={};d.owned.forEach(function(c){if(c.x<vx||c.x>=vx+VP||c.y<vy||c.y>=vy+VP)return;grp[c.sahip]=(grp[c.sahip]||0)+1;});var h="";Object.keys(grp).forEach(function(s){var pl=d.players[s]||{renk:"#777",rumuz:s};h+="<div style=\\"display:flex;align-items:center;gap:7px;padding:4px 0;\\"><span style=\\"width:13px;height:13px;border-radius:4px;background:"+pl.renk+"\\"></span><span style=\\"color:#e8eaf6\\">"+(s===ADMIN?"&#128081; ":"")+esc(pl.rumuz||s)+"</span><span style=\\"margin-left:auto\\">"+grp[s]+"</span></div>";});document.getElementById("lejant").innerHTML=h||"Bu bolgede kimse yok.";}'
+ 'async function yukleSiralama(){var r=await fetch("/oyun/siralama/"+SINIF,{credentials:"same-origin"});var d=await r.json();if(!d.ok)return;var h="";d.liste.forEach(function(o,i){h+="<div class=\\"sira-sat\\"><span style=\\"width:18px;color:#9fa8da\\">"+(i+1)+"</span><span style=\\"width:11px;height:11px;border-radius:3px;background:"+o.renk+"\\"></span><span style=\\"color:#e8eaf6;flex:1\\">"+(o.ben?"&#128081; ":"")+esc(o.rumuz)+"</span><b>"+o.sayi+"</b></div>";});document.getElementById("siralama").innerHTML=h||"Henuz kimse yok.";}'
+ 'function kaydir(dx,dy){vx=clamp(vx+dx,0,DW-VP);vy=clamp(vy+dy,0,DH-VP);render();}'
+ 'async function al(x,y){var r=await fetch("/oyun/hucre-al",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF+"&x="+x+"&y="+y});var d=await r.json();if(d.ok){render();yukleMini();yukleSiralama();}else{alert(d.hata||"Alinamadi");}}'
+ 'async function baslangic(){var r=await fetch("/oyun/baslangic",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF});var d=await r.json();if(d.ok){location.reload();}else{alert(d.hata||"Olmadi");}}'
+ 'async function testKomsu(){var r=await fetch("/oyun/test-komsu",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF});var d=await r.json();if(d.ok){render();yukleMini();yukleSiralama();}else{alert(d.hata||"Olmadi");}}'
+ 'async function sifirla(){if(!confirm("Bu dunyadaki tum onizleme verisi silinsin mi? (Kilitler korunur)"))return;await fetch("/oyun/sifirla",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF});location.reload();}'
+ 'function kilitDuzenle(){kilitMod=!kilitMod;document.getElementById("kduzenBtn").innerHTML=kilitMod?"&#9989; Kilit duzenleme: ACIK":"&#128274; Kilit duzenle";document.getElementById("kilitAraclar").style.display=kilitMod?"inline":"none";document.getElementById("kilitIpucu").style.display=kilitMod?"block":"none";render();}'
+ 'async function kilitDegistir(x,y){var r=await fetch("/oyun/kilit-degistir",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"x="+x+"&y="+y});var d=await r.json();if(d.ok){render();}}'
+ 'async function turkiyeTaslak(){if(!confirm("Turkiye taslagi (yaklasik) kilitlere eklensin mi?"))return;var r=await fetch("/oyun/kilit-turkiye-taslak",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:""});var d=await r.json();if(d.ok){render();}else{alert("Olmadi");}}'
+ 'async function kilitTemizle(){if(!confirm("TUM kilitler silinsin mi?"))return;await fetch("/oyun/kilit-temizle",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:""});render();}'
+ 'async function yukleMini(){var r=await fetch("/oyun/minimap/"+SINIF,{credentials:"same-origin"});var d=await r.json();if(!d.ok)return;MINI=d.noktalar;var mini=document.getElementById("mini");mini.querySelectorAll(".dot").forEach(function(e){e.remove();});var sx=200/DW,sy=100/DH;MINI.forEach(function(p){var dot=document.createElement("div");dot.className="dot";dot.style.left=(p.x*sx)+"px";dot.style.top=(p.y*sy)+"px";dot.style.background=p.renk;mini.appendChild(dot);});}'
+ 'function miniTikla(e){var mini=document.getElementById("mini");var rc=mini.getBoundingClientRect();var px=(e.clientX-rc.left)/rc.width*DW,py=(e.clientY-rc.top)/rc.height*DH;vx=clamp(Math.round(px-VP/2),0,DW-VP);vy=clamp(Math.round(py-VP/2),0,DH-VP);render();}'
+ 'document.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"){kaydir(-1,0);e.preventDefault();}else if(e.key==="ArrowRight"){kaydir(1,0);e.preventDefault();}else if(e.key==="ArrowUp"){kaydir(0,-1);e.preventDefault();}else if(e.key==="ArrowDown"){kaydir(0,1);e.preventDefault();}});'
+ 'async function duelloBaslat(x,y){if(!confirm("Bu dusman hucresine duello acmak ister misin? (Gunde 1 saldiri hakkin var)"))return;var r=await fetch("/oyun/duello",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF+"&x="+x+"&y="+y});var d=await r.json();if(!d.ok){alert(d.hata||"Duello yapilamadi");return;}duelloSonuc(d);render();yukleMini();yukleSiralama();}'
+ 'function duelloSonuc(d){document.getElementById("duelloIkon").innerHTML=d.kazandi?"&#9876;":"&#128737;";var b=document.getElementById("duelloBaslik");b.textContent=d.kazandi?"KAZANDIN!":"Kaybettin";b.style.color=d.kazandi?"#a5d6a7":"#ef9a9a";document.getElementById("duelloRakip").textContent=d.rakipRumuz;document.getElementById("duelloBenSure").textContent=d.benSure;document.getElementById("duelloRakipSure").textContent=d.rakipSure;document.getElementById("duelloNot").textContent=d.kazandi?"Bu hucre senin oldu!":"Bugunku saldiri hakkin doldu.";document.getElementById("duelloModal").style.display="flex";}'
+ 'function duelloKapat(){document.getElementById("duelloModal").style.display="none";}'
+ 'function kurallarAc(){document.getElementById("kurallarModal").style.display="flex";}'
+ 'function kurallarKapat(){document.getElementById("kurallarModal").style.display="none";}'
+ 'render();yukleMini();yukleSiralama();'
+ '</script>';
}

// ---- POST /oyun/duello : komsu dusman hucresine duello (ortak dogru soru, sure kiyasi) ----
router.post('/oyun/duello', async (req, res) => {
    const ctx = await oyuncuCoz(req, req.body.sinif);
    if (!ctx.ok) return res.status(403).json({ ok: false, hata: 'Yetki yok.' });
    const sinif = ctx.sinif, BEN = ctx.kullaniciAdi;
    const x = parseInt(req.body.x), y = parseInt(req.body.y);
    if (Number.isNaN(x) || Number.isNaN(y)) return res.json({ ok: false, hata: 'Gecersiz hucre.' });
    try {
        const hedef = await OyunHucre.findOne({ sinif, x, y }, 'sahip').lean();
        if (!hedef) return res.json({ ok: false, hata: 'Bu hucre bos.' });
        const RAKIP = hedef.sahip;
        if (RAKIP === BEN) return res.json({ ok: false, hata: 'Kendi hucrene duello olmaz.' });
        const komsu = await OyunHucre.findOne({ sinif, sahip: BEN, $or: [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }] }, '_id').lean();
        if (!komsu) return res.json({ ok: false, hata: 'Yalniz kendi topragina komsu dusman hucresine duello acabilirsin.' });
        const rakipSayi = await OyunHucre.countDocuments({ sinif, sahip: RAKIP });
        if (rakipSayi <= 1) return res.json({ ok: false, hata: 'Rakibin son hucresi korumali, alinamaz.' });
        const ben = await oyuncuGetir(BEN, sinif);
        if (ben.sonSaldiriTarih && ayniGunMu(ben.sonSaldiriTarih, new Date())) return res.json({ ok: false, hata: 'Bugun saldiri hakkin doldu (gunde 1).' });
        const benDogru = await CevapKaydi.find({ kullaniciAdi: BEN, dogruMu: true }, 'soruId sure').lean();
        const rakipDogru = await CevapKaydi.find({ kullaniciAdi: RAKIP, dogruMu: true }, 'soruId sure').lean();
        const benMap = {}; benDogru.forEach(c => { if (!c.soruId) return; const id = String(c.soruId); const s = (c.sure == null ? 99999 : c.sure); if (benMap[id] == null || s < benMap[id]) benMap[id] = s; });
        const rakipMap = {}; rakipDogru.forEach(c => { if (!c.soruId) return; const id = String(c.soruId); const s = (c.sure == null ? 99999 : c.sure); if (rakipMap[id] == null || s < rakipMap[id]) rakipMap[id] = s; });
        const ortak = Object.keys(benMap).filter(id => rakipMap[id] != null);
        if (!ortak.length) return res.json({ ok: false, sebep: 'ortak-yok', hata: 'Ikinizin de dogru cozdugu ortak soru yok; duello yapilamaz.' });
        const secId = ortak[Math.floor(Math.random() * ortak.length)];
        const benSure = benMap[secId], rakipSure = rakipMap[secId];
        const kazandi = benSure < rakipSure; // esitlikte savunan korur
        ben.sonSaldiriTarih = new Date(); // saldiri hakki sonuc ne olursa olsun tukenir
        await ben.save();
        if (kazandi) await OyunHucre.updateOne({ sinif, x, y }, { $set: { sahip: BEN } });
        const ro = await OyunOyuncu.findOne({ sinif, kullaniciAdi: RAKIP }, 'rumuz').lean();
        res.json({ ok: true, kazandi, benSure, rakipSure, rakipRumuz: (ro && ro.rumuz) || RAKIP });
    } catch (e) {
        console.error('[oyun duello]', e.message);
        res.json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun-duyuru-goruldu : giris duyurusunu kalici kapat ----
router.post('/oyun-duyuru-goruldu', async (req, res) => {
    const su = req.session && req.session.kullaniciAdi;
    if (!su) return res.status(403).json({ ok: false });
    try { await Kullanici.updateOne({ kullaniciAdi: su }, { $set: { oyunDuyuruGoruldu: true } }); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ ok: false }); }
});

module.exports = router;
