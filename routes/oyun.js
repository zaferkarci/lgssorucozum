// v4.9.5 — "Bilgi Gezegenleri": dunya haritasi zemini + viewport mimarisi.
//   YALNIZCA ADMIN onizlemesi. Ogrencilere kapali; panel menusune link yok.
//   Mevcut modeller/PUANLAMA degismez; oyun verisi ayri koleksiyonlarda.
//   - Mantiksal dunya: DW x DH hucre (her sinif kendi dunyasi).
//   - Gorunur pencere (viewport): VP x VP hucre; tarayici yalniz bunu cizer.
//   - Zemin: /world.svg (kita-only). Baslangic merkezi: Nazilli (NAZILLI hucre).
//   Duello v4.9.6'da gelecek.
const express = require('express');
const router = express.Router();

const OyunHucre = require('../models/OyunHucre');
const OyunOyuncu = require('../models/OyunOyuncu');
const Kullanici = require('../models/Kullanici');

// ---- sabitler ----
const DW = 400, DH = 200;          // dunya hucre boyutu (400x200 = 80.000)
const VP = 20;                     // viewport (20x20 = 400 gorunur hucre)
const NAZILLI = { x: 231, y: 58 }; // Turkiye/Aydin/Nazilli ~ equirect. hucre
const ADMIN_OYUNCU = '__admin_onizleme__';
const ADMIN_TEST_ALTIN = 1000000;
const KOMSU = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function adminMi(req) { return !!(req.session && req.session.adminGirisli === true); }
function kapali(res) { return res.status(403).send('<div style="font-family:sans-serif;padding:40px;text-align:center;">Oyun yakinda. (Su an yalnizca yonetici onizlemesi.)</div>'); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

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

// ---- GET /oyun : gezegen secici ----
router.get('/oyun', (req, res) => {
    if (!adminMi(req)) return kapali(res);
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
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.params.sinif);
    let vx = clamp(parseInt(req.query.vx) || 0, 0, DW - VP);
    let vy = clamp(parseInt(req.query.vy) || 0, 0, DH - VP);
    try {
        const ben = await oyuncuGetir(ADMIN_OYUNCU, sinif);
        // padli bolge (kenar komsulugu icin 1 hucre tasma)
        const owned = await OyunHucre.find({
            sinif,
            x: { $gte: vx - 1, $lte: vx + VP },
            y: { $gte: vy - 1, $lte: vy + VP }
        }, 'x y sahip').lean();
        const oyuncular = await OyunOyuncu.find({ sinif }, 'kullaniciAdi rumuz renk').lean();
        const players = {};
        oyuncular.forEach(o => { players[o.kullaniciAdi] = { rumuz: o.rumuz, renk: o.renk }; });
        const hucreSayisi = await OyunHucre.countDocuments({ sinif, sahip: ADMIN_OYUNCU });
        const bakiye = await altinBakiye(ben);
        res.json({ ok: true, vx, vy, owned, players, bakiye, hucreSayisi, fiyat: 10 * hucreSayisi, admin: ADMIN_OYUNCU });
    } catch (e) {
        console.error('[oyun veri]', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// ---- GET /oyun/minimap/:sinif : tum sahipli hucreler (mini-harita) ----
router.get('/oyun/minimap/:sinif', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.params.sinif);
    try {
        const hucreler = await OyunHucre.find({ sinif }, 'x y sahip').lean();
        const oyuncular = await OyunOyuncu.find({ sinif }, 'kullaniciAdi renk').lean();
        const renkMap = {};
        oyuncular.forEach(o => { renkMap[o.kullaniciAdi] = o.renk; });
        const noktalar = hucreler.map(h => ({ x: h.x, y: h.y, renk: renkMap[h.sahip] || '#888' }));
        res.json({ ok: true, noktalar });
    } catch (e) { res.status(500).json({ ok: false }); }
});

// ---- GET /oyun/:sinif : viewport kabuk sayfasi ----
router.get('/oyun/:sinif', async (req, res) => {
    if (!adminMi(req)) return kapali(res);
    const sinif = String(req.params.sinif);
    if (!['5', '6', '7', '8'].includes(sinif)) return res.redirect('/oyun');
    try {
        const ben = await oyuncuGetir(ADMIN_OYUNCU, sinif);
        // baslangic viewport: kendi topragimin ortasi, yoksa Nazilli
        const benimler = await OyunHucre.find({ sinif, sahip: ADMIN_OYUNCU }, 'x y').lean();
        let cx = NAZILLI.x, cy = NAZILLI.y;
        if (benimler.length) {
            let sx = 0, sy = 0; benimler.forEach(h => { sx += h.x; sy += h.y; });
            cx = Math.round(sx / benimler.length); cy = Math.round(sy / benimler.length);
        }
        const vx = clamp(cx - Math.floor(VP / 2), 0, DW - VP);
        const vy = clamp(cy - Math.floor(VP / 2), 0, DH - VP);
        const ilkHucreYok = benimler.length === 0;
        res.send(kabukHtml({ sinif, rumuz: ben.rumuz, renk: ben.renk, vx, vy, ilkHucreYok }));
    } catch (e) {
        console.error('[oyun kabuk]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

// ---- POST /oyun/baslangic : ilk hucre (Nazilli/kume yakini, ucretsiz) ----
router.post('/oyun/baslangic', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.body.sinif);
    try {
        await oyuncuGetir(ADMIN_OYUNCU, sinif);
        const varOlan = await OyunHucre.countDocuments({ sinif, sahip: ADMIN_OYUNCU });
        if (varOlan > 0) return res.json({ ok: true });
        // kume merkezi: tum hucrelerin ortasi, yoksa Nazilli
        const hepsi = await OyunHucre.find({ sinif }, 'x y').lean();
        let mx = NAZILLI.x, my = NAZILLI.y;
        if (hepsi.length) { let sx = 0, sy = 0; hepsi.forEach(h => { sx += h.x; sy += h.y; }); mx = Math.round(sx / hepsi.length); my = Math.round(sy / hepsi.length); }
        const dolu = new Set(hepsi.map(h => h.x + ',' + h.y));
        // merkezden disa spiral ile en yakin bos hucre
        let sec = null;
        for (let r = 0; r < 60 && !sec; r++) {
            for (let dy = -r; dy <= r && !sec; dy++) for (let dx = -r; dx <= r && !sec; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const x = clamp(mx + dx, 0, DW - 1), y = clamp(my + dy, 0, DH - 1);
                if (!dolu.has(x + ',' + y)) sec = [x, y];
            }
        }
        if (!sec) sec = [NAZILLI.x, NAZILLI.y];
        await new OyunHucre({ sinif, x: sec[0], y: sec[1], sahip: ADMIN_OYUNCU }).save();
        res.json({ ok: true, x: sec[0], y: sec[1] });
    } catch (e) {
        console.error('[oyun baslangic]', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/hucre-al : bitisik satin alma (artan fiyat, her hucre) ----
router.post('/oyun/hucre-al', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false, hata: 'Yetki yok.' });
    const sinif = String(req.body.sinif);
    const x = parseInt(req.body.x), y = parseInt(req.body.y);
    if (Number.isNaN(x) || Number.isNaN(y) || x < 0 || y < 0 || x >= DW || y >= DH) return res.json({ ok: false, hata: 'Gecersiz hucre.' });
    try {
        const ben = await oyuncuGetir(ADMIN_OYUNCU, sinif);
        const say = await OyunHucre.countDocuments({ sinif, sahip: ADMIN_OYUNCU });
        if (say === 0) return res.json({ ok: false, hata: 'Once baslangic yurdunu al.' });
        // bitisiklik
        const komsu = await OyunHucre.findOne({
            sinif, sahip: ADMIN_OYUNCU,
            $or: [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }]
        }, '_id').lean();
        if (!komsu) return res.json({ ok: false, hata: 'Yalniz kendi topragina komsu hucre alinabilir.' });
        const dolu = await OyunHucre.findOne({ sinif, x, y }, '_id').lean();
        if (dolu) return res.json({ ok: false, hata: 'Bu hucre zaten alinmis.' });
        const fiyat = 10 * say;
        const bakiye = await altinBakiye(ben);
        if (bakiye < fiyat) return res.json({ ok: false, hata: 'Yetersiz altin (' + fiyat + ' gerekli).' });
        await new OyunHucre({ sinif, x, y, sahip: ADMIN_OYUNCU }).save();
        ben.harcananAltin = (ben.harcananAltin || 0) + fiyat;
        await ben.save();
        res.json({ ok: true, bakiye: bakiye - fiyat });
    } catch (e) {
        console.error('[oyun hucre-al]', e.message);
        res.json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/test-komsu : bitisik sahte oyuncu (gorsel test) ----
router.post('/oyun/test-komsu', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.body.sinif);
    try {
        const benimler = await OyunHucre.find({ sinif, sahip: ADMIN_OYUNCU }, 'x y').lean();
        if (!benimler.length) return res.json({ ok: false, hata: 'Once baslangic yurdunu al.' });
        const tumDolu = new Set((await OyunHucre.find({ sinif }, 'x y').lean()).map(h => h.x + ',' + h.y));
        let hedef = null;
        for (const h of benimler) {
            for (const [dx, dy] of KOMSU) {
                const nx = h.x + dx, ny = h.y + dy;
                if (nx >= 0 && ny >= 0 && nx < DW && ny < DH && !tumDolu.has(nx + ',' + ny)) { hedef = [nx, ny]; break; }
            }
            if (hedef) break;
        }
        if (!hedef) return res.json({ ok: false, hata: 'Bitisik bos hucre yok.' });
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

// ---- POST /oyun/sifirla ----
router.post('/oyun/sifirla', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false });
    const sinif = String(req.body.sinif);
    try {
        await OyunHucre.deleteMany({ sinif });
        await OyunOyuncu.deleteMany({ sinif });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false }); }
});

// ============ KABUK HTML (viewport istemci uygulamasi) ============
function kabukHtml(opt) {
    const { sinif, rumuz, renk, vx, vy, ilkHucreYok } = opt;
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
+ '</style></head>'
+ '<body>'
+ '<div class="topbar"><a class="bc" href="/admin">&#8592; admin</a><a class="bc" href="/oyun">dunya degistir</a><h1>&#127758; ' + sinif + '. Sinif Dunyasi</h1><div class="alt-rozet">&#129689; <span id="bakiye">...</span> altin</div></div>'
+ '<div class="layout">'
+ '<aside class="panel"><h2>TOPRAK SAHIBI</h2><div class="sen-ad"><span>&#128081;</span><span style="color:' + esc(renk) + ';">' + esc(rumuz) + '</span></div>'
+ '<div class="sat"><span>Topraklarin</span><b id="hsay">0</b></div>'
+ '<div class="sat"><span>Altin</span><b class="altin" id="bakiye2">...</b></div>'
+ '<div class="sat"><span>Sonraki hucre</span><b class="altin" id="fiyat">0</b></div>'
+ '<div class="sat"><span>Konum</span><b id="konum">-</b></div>'
+ (ilkHucreYok ? '<button class="abtn abtn-vurgu" style="margin-top:12px;width:100%;" onclick="baslangic()">&#127922; Baslangic yurdu (Nazilli)</button>' : '')
+ '<h2 style="margin-top:16px;">MINI HARITA</h2><div class="mini" id="mini" onclick="miniTikla(event)"><div class="vprect" id="vprect"></div></div>'
+ '<div class="ipucu" style="text-align:left;">Mini haritaya tikla = oraya atla. Yon tuslari/oklar = kaydir.</div>'
+ '</aside>'
+ '<main class="center">'
+ '<div class="vpwrap"><div class="worldbg" id="worldbg"></div><div class="grid" id="grid"></div></div>'
+ '<div class="dpad"><span></span><button onclick="kaydir(0,-3)">&#9650;</button><span></span>'
+ '<button onclick="kaydir(-3,0)">&#9664;</button><span></span><button onclick="kaydir(3,0)">&#9654;</button>'
+ '<span></span><button onclick="kaydir(0,3)">&#9660;</button><span></span></div>'
+ '<p class="ipucu">Yesil "+" hucreler kendi topragina komsu; tikla = satin al (her hucre, okyanus dahil). Fiyat = 10 x mevcut hucre. Uzak rakipleri gormek icin kaydir.</p>'
+ '<div><form style="display:inline" onsubmit="return false"><button class="abtn" onclick="testKomsu()">&#128101; Test komsu</button><button class="abtn abtn-tehlike" onclick="sifirla()">&#128465; Sifirla</button></form></div>'
+ '</main>'
+ '<aside class="panel"><h2>GORUNUR BOLGE SAHIPLERI</h2><div id="lejant" style="font-size:13px;color:#9fa8da;">-</div></aside>'
+ '</div>'
+ scriptBlok({ sinif, vx, vy, HUC })
+ '</body></html>';
}

function scriptBlok(o) {
    const { sinif, vx, vy, HUC } = o;
    return '<script>'
+ 'var SINIF="' + sinif + '",DW=' + DW + ',DH=' + DH + ',VP=' + VP + ',HUC=' + HUC + ',ADMIN="' + ADMIN_OYUNCU + '";'
+ 'var vx=' + vx + ',vy=' + vy + ',MINI=[];'
+ 'function clamp(v,a,b){return Math.max(a,Math.min(b,v));}'
+ 'function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}'
+ 'var NB=[[1,0],[-1,0],[0,1],[0,-1]];'
+ 'function setBg(){document.getElementById("worldbg").style.backgroundPosition=(vx/(DW-VP)*100)+"% "+(vy/(DH-VP)*100)+"%";document.getElementById("konum").textContent=vx+","+vy;updateRect();}'
+ 'function updateRect(){var r=document.getElementById("vprect");var sx=200/DW,sy=100/DH;r.style.left=(vx*sx)+"px";r.style.top=(vy*sy)+"px";r.style.width=(VP*sx)+"px";r.style.height=(VP*sy)+"px";}'
+ 'async function render(){setBg();var r=await fetch("/oyun/veri/"+SINIF+"?vx="+vx+"&vy="+vy,{credentials:"same-origin"});var d=await r.json();if(!d.ok)return;'
+ 'document.getElementById("bakiye").textContent=d.bakiye;document.getElementById("bakiye2").textContent=d.bakiye;document.getElementById("hsay").textContent=d.hucreSayisi;document.getElementById("fiyat").textContent=d.fiyat;'
+ 'var om={},benim={};d.owned.forEach(function(c){om[c.x+","+c.y]=c.sahip;if(c.sahip===ADMIN)benim[c.x+","+c.y]=1;});'
+ 'var html="";for(var row=0;row<VP;row++){for(var col=0;col<VP;col++){var wx=vx+col,wy=vy+row,key=wx+","+wy;var sahip=om[key];'
+ 'if(sahip){var pl=d.players[sahip]||{renk:"#777"};var col2=pl.renk||"#777";'
+ 'function bd(dx,dy){return om[(wx+dx)+","+(wy+dy)]===sahip?"transparent":col2;}'
+ 'var st="background:"+hexA(col2,0.34)+";border-top-color:"+bd(0,-1)+";border-bottom-color:"+bd(0,1)+";border-left-color:"+bd(-1,0)+";border-right-color:"+bd(1,0)+";";'
+ 'html+="<div class=\\"hc dolu\\" title=\\""+esc(pl.rumuz||sahip)+"\\" style=\\""+st+"\\"></div>";'
+ '}else{var al=false;for(var i=0;i<NB.length;i++){if(benim[(wx+NB[i][0])+","+(wy+NB[i][1])]){al=true;break;}}'
+ 'if(al){html+="<div class=\\"hc alinabilir\\" onclick=\\"al("+wx+","+wy+")\\"></div>";}else{html+="<div class=\\"hc\\"></div>";}}}}'
+ 'document.getElementById("grid").innerHTML=html;'
+ 'cizEtiket(d);cizLejant(d);}'
+ 'function hexA(h,a){var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(h||"");if(!m)return"rgba(120,120,120,"+a+")";return"rgba("+parseInt(m[1],16)+","+parseInt(m[2],16)+","+parseInt(m[3],16)+","+a+")";}'
+ 'function cizEtiket(d){document.querySelectorAll(".lbl").forEach(function(e){e.remove();});var grp={};d.owned.forEach(function(c){if(c.x<vx||c.x>=vx+VP||c.y<vy||c.y>=vy+VP)return;(grp[c.sahip]=grp[c.sahip]||[]).push(c);});var wrap=document.querySelector(".vpwrap");Object.keys(grp).forEach(function(s){var cs=grp[s];var pl=d.players[s]||{renk:"#777",rumuz:s};var sx=0,sy=0;cs.forEach(function(c){sx+=c.x;sy+=c.y;});var cx=sx/cs.length,cy=sy/cs.length;var benim=s===ADMIN;var el=document.createElement("div");el.className="lbl";el.style.left=((cx-vx+0.5)/VP*100)+"%";el.style.top=((cy-vy+0.5)/VP*100)+"%";el.style.borderColor=pl.renk;el.innerHTML=(benim?"&#128081; ":"<span class=\\"nk\\" style=\\"background:"+pl.renk+"\\"></span>")+esc(pl.rumuz||s);wrap.appendChild(el);});}'
+ 'function cizLejant(d){var grp={};d.owned.forEach(function(c){if(c.x<vx||c.x>=vx+VP||c.y<vy||c.y>=vy+VP)return;grp[c.sahip]=(grp[c.sahip]||0)+1;});var h="";Object.keys(grp).forEach(function(s){var pl=d.players[s]||{renk:"#777",rumuz:s};h+="<div style=\\"display:flex;align-items:center;gap:7px;padding:4px 0;\\"><span style=\\"width:13px;height:13px;border-radius:4px;background:"+pl.renk+"\\"></span><span style=\\"color:#e8eaf6\\">"+(s===ADMIN?"&#128081; ":"")+esc(pl.rumuz||s)+"</span><span style=\\"margin-left:auto\\">"+grp[s]+"</span></div>";});document.getElementById("lejant").innerHTML=h||"Bu bolgede kimse yok.";}'
+ 'function kaydir(dx,dy){vx=clamp(vx+dx,0,DW-VP);vy=clamp(vy+dy,0,DH-VP);render();}'
+ 'async function al(x,y){var r=await fetch("/oyun/hucre-al",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF+"&x="+x+"&y="+y});var d=await r.json();if(d.ok){render();yukleMini();}else{alert(d.hata||"Alinamadi");}}'
+ 'async function baslangic(){var r=await fetch("/oyun/baslangic",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF});var d=await r.json();if(d.ok){if(d.x!=null){vx=clamp(d.x-VP/2,0,DW-VP);vy=clamp(d.y-VP/2,0,DH-VP);}location.reload();}else{alert(d.hata||"Olmadi");}}'
+ 'async function testKomsu(){var r=await fetch("/oyun/test-komsu",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF});var d=await r.json();if(d.ok){render();yukleMini();}else{alert(d.hata||"Olmadi");}}'
+ 'async function sifirla(){if(!confirm("Bu dunyadaki tum onizleme verisi silinsin mi?"))return;await fetch("/oyun/sifirla",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif="+SINIF});location.reload();}'
+ 'async function yukleMini(){var r=await fetch("/oyun/minimap/"+SINIF,{credentials:"same-origin"});var d=await r.json();if(!d.ok)return;MINI=d.noktalar;var mini=document.getElementById("mini");mini.querySelectorAll(".dot").forEach(function(e){e.remove();});var sx=200/DW,sy=100/DH;MINI.forEach(function(p){var dot=document.createElement("div");dot.className="dot";dot.style.left=(p.x*sx)+"px";dot.style.top=(p.y*sy)+"px";dot.style.background=p.renk;mini.appendChild(dot);});}'
+ 'function miniTikla(e){var mini=document.getElementById("mini");var rc=mini.getBoundingClientRect();var px=(e.clientX-rc.left)/rc.width*DW,py=(e.clientY-rc.top)/rc.height*DH;vx=clamp(Math.round(px-VP/2),0,DW-VP);vy=clamp(Math.round(py-VP/2),0,DH-VP);render();}'
+ 'document.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"){kaydir(-1,0);e.preventDefault();}else if(e.key==="ArrowRight"){kaydir(1,0);e.preventDefault();}else if(e.key==="ArrowUp"){kaydir(0,-1);e.preventDefault();}else if(e.key==="ArrowDown"){kaydir(0,1);e.preventDefault();}});'
+ 'render();yukleMini();'
+ '</script>';
}

module.exports = router;
