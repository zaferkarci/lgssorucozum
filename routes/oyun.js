// v4.9.0 — "Bilgi Gezegenleri" oyunu (ALTYAPI + HARITA).
//   ONEMLI: Su an YALNIZCA ADMIN onizlemesi. Ogrencilere KAPALI; panel menusune
//   link eklenmedi. Mevcut modellere ve PUANLAMAYA sifir dokunus — oyun verisi
//   ayri koleksiyonlarda (OyunHucre, OyunOyuncu). Duello v4.9.1'de gelecek.
const express = require('express');
const router = express.Router();

const OyunHucre = require('../models/OyunHucre');
const OyunOyuncu = require('../models/OyunOyuncu');
const Kullanici = require('../models/Kullanici');

// ---- admin kapisi (oyun simdilik yalniz admin onizlemesi) ----
function adminMi(req) {
    return !!(req.session && req.session.adminGirisli === true);
}
function kapali(res) {
    return res.status(403).send('<div style="font-family:sans-serif;padding:40px;text-align:center;">🪐 Oyun yakinda. (Su an yalnizca yonetici onizlemesi.)</div>');
}

// Admin onizleme oyuncusu (sandbox) — gercek ogrencilerden tamamen ayri.
const ADMIN_OYUNCU = '__admin_onizleme__';
const ADMIN_TEST_ALTIN = 1000000;

// ---- yardimcilar ----
function hashStr(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }
const ADJ = ['Mavi', 'Kizil', 'Altin', 'Gumus', 'Parlak', 'Sessiz', 'Hizli', 'Gizemli', 'Yesil', 'Mor', 'Beyaz', 'Turuncu'];
const NOUN = ['Kuyrukluyildiz', 'Yildiz', 'Nebula', 'Komet', 'Meteor', 'Galaksi', 'Pulsar', 'Yorunge', 'Asteroit', 'Ay'];
const RENK = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac', '#f06292', '#9575cd', '#aed581', '#4fc3f7', '#ff8a65', '#a1887f'];
function rumuzUret(id) { const h = hashStr(id); return ADJ[h % ADJ.length] + ' ' + NOUN[(h >> 3) % NOUN.length] + '-' + (h % 90 + 10); }
function renkUret(id) { return RENK[hashStr(id) % RENK.length]; }

// Gezegen 8x8 baslar; sahipli oran %50'yi asinca cepere halka eklenir (10,12,...).
function planetBoyut(toplamSahipli) { let b = 8; while (toplamSahipli > 0.5 * b * b) b += 2; return b; }

function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Oyuncu kaydini garanti et (rumuz/renk sabit uretilir).
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

// Altin bakiyesi = toplam kazanilan puan - harcanan. Admin onizlemede test altini.
async function altinBakiye(oyuncu) {
    if (oyuncu.kullaniciAdi === ADMIN_OYUNCU) return ADMIN_TEST_ALTIN - (oyuncu.harcananAltin || 0);
    const k = await Kullanici.findOne({ kullaniciAdi: oyuncu.kullaniciAdi }, 'puan').lean();
    return Math.round((k && k.puan) || 0) - (oyuncu.harcananAltin || 0);
}

const KOMSU = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---- GET /oyun : gezegen secici ----
router.get('/oyun', (req, res) => {
    if (!adminMi(req)) return kapali(res);
    const kart = (s, ad) => `<a href="/oyun/${s}" style="display:block;padding:22px;margin:10px 0;background:linear-gradient(135deg,#1a237e,#311b92);color:#fff;border-radius:14px;text-decoration:none;font-size:18px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.3);">🪐 ${ad}</a>`;
    res.send(`<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bilgi Gezegenleri — Onizleme</title></head>
<body style="margin:0;background:#0b0e23;color:#e8eaf6;font-family:'Segoe UI',sans-serif;min-height:100vh;">
<div style="max-width:520px;margin:0 auto;padding:30px 20px;">
  <div style="font-size:13px;color:#9fa8da;margin-bottom:4px;">YONETICI ONIZLEMESI</div>
  <h1 style="margin:0 0 6px;font-size:26px;">🪐 Bilgi Gezegenleri</h1>
  <p style="color:#9fa8da;font-size:14px;margin:0 0 20px;">Test etmek istedigin sinif gezegenini sec. Ogrencilere henuz kapali.</p>
  ${kart('5', '5. Sinif Gezegeni')}
  ${kart('6', '6. Sinif Gezegeni')}
  ${kart('7', '7. Sinif Gezegeni')}
  ${kart('8', '8. Sinif Gezegeni')}
  <a href="/admin" style="display:inline-block;margin-top:16px;color:#9fa8da;font-size:13px;">← Admin paneline don</a>
</div></body></html>`);
});

// ---- harita sayfasi olusturucu ----
function haritaHtml(opt) {
    const { sinif, rumuz, renk, bakiye, fiyat, boyut, hucreMap, oyuncuMap, benimSet, hucreSayisi, gezegenSahipli } = opt;

    function hexRgba(hex, a) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '#777777'));
        if (!m) return 'rgba(120,120,120,' + a + ')';
        return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
    }
    function alinabilirMi(x, y) {
        if (hucreMap[x + ',' + y]) return false;
        for (const [dx, dy] of KOMSU) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < boyut && ny < boyut && benimSet.has(nx + ',' + ny)) return true;
        }
        return false;
    }

    const sahipSet = {};
    const sahipHucreler = {};
    Object.keys(hucreMap).forEach(key => {
        const h = hucreMap[key];
        (sahipSet[h.sahip] = sahipSet[h.sahip] || new Set()).add(key);
        (sahipHucreler[h.sahip] = sahipHucreler[h.sahip] || []).push([h.x, h.y]);
    });

    let hucreHtml = '';
    for (let y = 0; y < boyut; y++) {
        for (let x = 0; x < boyut; x++) {
            const key = x + ',' + y;
            const h = hucreMap[key];
            if (h) {
                const o = oyuncuMap[h.sahip] || { rumuz: h.sahip, renk: '#777' };
                const col = o.renk || '#777';
                const own = sahipSet[h.sahip];
                const bt = own.has(x + ',' + (y - 1)) ? 'transparent' : col;
                const bb = own.has(x + ',' + (y + 1)) ? 'transparent' : col;
                const bl = own.has((x - 1) + ',' + y) ? 'transparent' : col;
                const br = own.has((x + 1) + ',' + y) ? 'transparent' : col;
                const benim = benimSet.has(key);
                const ttl = esc(o.rumuz) + (benim ? ' (sen)' : '');
                hucreHtml += '<div class="hc dolu" title="' + ttl + '" style="background:' + hexRgba(col, 0.32)
                    + ';border-top-color:' + bt + ';border-bottom-color:' + bb + ';border-left-color:' + bl + ';border-right-color:' + br + ';"></div>';
            } else if (alinabilirMi(x, y)) {
                hucreHtml += '<div class="hc alinabilir" title="Satin al - ' + fiyat + ' altin" onclick="al(' + x + ',' + y + ')"><span>+</span></div>';
            } else {
                hucreHtml += '<div class="hc bos"></div>';
            }
        }
    }

    let etiketHtml = '';
    Object.keys(sahipHucreler).forEach(sahip => {
        const cells = sahipHucreler[sahip];
        const o = oyuncuMap[sahip] || { rumuz: sahip, renk: '#777' };
        const benimMi = cells.some(c => benimSet.has(c[0] + ',' + c[1]));
        let sx = 0, sy = 0;
        cells.forEach(c => { sx += c[0]; sy += c[1]; });
        const cx = sx / cells.length, cy = sy / cells.length;
        const left = ((cx + 0.5) / boyut * 100).toFixed(2);
        const top = ((cy + 0.5) / boyut * 100).toFixed(2);
        etiketHtml += '<div class="etiket" style="left:' + left + '%;top:' + top + '%;border-color:' + esc(o.renk) + ';">'
            + (benimMi ? '<span class="tac">&#128081;</span>' : '<span class="nokta" style="background:' + esc(o.renk) + ';"></span>')
            + '<span class="etiket-ad">' + esc(o.rumuz) + '</span></div>';
    });

    let lejant = '';
    Object.keys(sahipHucreler).forEach(sahip => {
        const o = oyuncuMap[sahip] || { rumuz: sahip, renk: '#777' };
        const benimMi = sahipHucreler[sahip].some(c => benimSet.has(c[0] + ',' + c[1]));
        lejant += '<div class="lej"><span class="lej-renk" style="background:' + esc(o.renk) + ';"></span>'
            + '<span>' + (benimMi ? '&#128081; ' : '') + esc(o.rumuz) + '</span>'
            + '<span class="lej-say">' + sahipHucreler[sahip].length + '</span></div>';
    });
    lejant += '<div class="lej"><span class="lej-renk" style="background:rgba(255,255,255,.10);"></span><span>Bos Bolge</span></div>';

    const baslangicBtn = (hucreSayisi === 0)
        ? '<form method="POST" action="/oyun/baslangic" style="display:inline;"><input type="hidden" name="sinif" value="' + sinif + '"><button class="abtn abtn-vurgu" type="submit">&#127922; Baslangic yurdu</button></form>'
        : '';

    return '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + sinif + '. Sinif Gezegeni</title>'
+ '<style>'
+ '*{box-sizing:border-box;}'
+ 'body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#3a2350,#0a0a1f 55%),#070a1c;color:#e8eaf6;font-family:"Segoe UI",system-ui,sans-serif;min-height:100vh;}'
+ '.topbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(10,12,30,.6);}'
+ '.topbar h1{font-size:19px;margin:0;font-weight:600;}'
+ '.bc{font-size:12px;color:#9fa8da;text-decoration:none;}'
+ '.alt-rozet{margin-left:auto;background:linear-gradient(135deg,#ffd54f,#ff9800);color:#3a2400;font-weight:800;padding:7px 16px;border-radius:20px;font-size:15px;box-shadow:0 2px 10px rgba(255,170,0,.35);}'
+ '.layout{display:flex;gap:16px;align-items:flex-start;padding:18px 20px 90px;max-width:1280px;margin:0 auto;flex-wrap:wrap;}'
+ '.panel{background:rgba(20,24,52,.72);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:16px;min-width:210px;flex:0 0 230px;}'
+ '.panel h2{font-size:12px;letter-spacing:.12em;color:#9fa8da;margin:0 0 12px;font-weight:700;}'
+ '.sen-ad{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;margin-bottom:12px;}'
+ '.sat{display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid rgba(255,255,255,.07);font-size:14px;}'
+ '.sat b{color:#fff;} .altin{color:#ffd54f;font-weight:800;}'
+ '.mapwrap{flex:1 1 420px;min-width:300px;display:flex;flex-direction:column;align-items:center;}'
+ '.grid{position:relative;display:grid;grid-template-columns:repeat(' + boyut + ',1fr);gap:2px;background:rgba(255,255,255,.03);padding:10px;border-radius:16px;width:100%;max-width:' + (boyut * 48) + 'px;border:1px solid rgba(255,255,255,.07);}'
+ '.hc{aspect-ratio:1/1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;}'
+ '.hc.bos{background:rgba(255,255,255,.045);}'
+ '.hc.alinabilir{background:rgba(129,199,132,.16);border:1px dashed #81c784;color:#a5d6a7;cursor:pointer;transition:.15s;}'
+ '.hc.alinabilir:hover{background:rgba(129,199,132,.42);transform:scale(1.1);box-shadow:0 0 10px rgba(129,199,132,.5);}'
+ '.hc.dolu{border:3px solid transparent;border-radius:3px;}'
+ '.etiket{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;background:rgba(10,12,30,.86);border:1.5px solid #777;border-radius:20px;padding:3px 10px 3px 7px;font-size:12px;font-weight:700;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.5);}'
+ '.etiket .tac{font-size:13px;} .etiket .nokta{width:9px;height:9px;border-radius:50%;display:inline-block;} .etiket-ad{max-width:120px;overflow:hidden;text-overflow:ellipsis;}'
+ '.lej{display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;}'
+ '.lej-renk{width:14px;height:14px;border-radius:4px;flex:0 0 auto;} .lej-say{margin-left:auto;color:#9fa8da;font-size:12px;}'
+ '.actionbar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:16px;}'
+ '.abtn{border-radius:24px;padding:11px 20px;font-size:13px;font-weight:700;cursor:pointer;color:#e8eaf6;background:rgba(40,46,86,.9);border:1px solid rgba(255,255,255,.12);text-decoration:none;display:inline-block;}'
+ '.abtn:hover{background:rgba(60,68,120,.95);} .abtn-vurgu{background:linear-gradient(135deg,#43a047,#2e7d32);border:none;} .abtn-tehlike{background:linear-gradient(135deg,#c62828,#8e1c1c);border:none;}'
+ '.ipucu{color:#9fa8da;font-size:12px;line-height:1.6;margin:12px 0 0;text-align:center;max-width:' + (boyut * 48) + 'px;}'
+ '.gezegen-rozet{position:fixed;left:18px;bottom:16px;display:flex;align-items:center;gap:10px;background:rgba(10,12,30,.8);border:1px solid rgba(255,255,255,.12);border-radius:40px;padding:8px 16px 8px 8px;}'
+ '.gez-kup{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a65,#7b1fa2);box-shadow:0 0 14px rgba(186,104,200,.6);}'
+ '.gez-ad{font-size:12px;} .gez-ad b{display:block;font-size:14px;}'
+ '@media(max-width:820px){.panel{flex:1 1 100%;} .gezegen-rozet{display:none;}}'
+ '</style></head>'
+ '<body>'
+ '<div class="topbar"><a class="bc" href="/admin">&#8592; admin</a><a class="bc" href="/oyun">gezegen degistir</a><h1>&#129680; ' + sinif + '. Sinif Gezegeni</h1><div class="alt-rozet">&#129689; ' + bakiye + ' altin</div></div>'
+ '<div class="layout">'
+ '<aside class="panel"><h2>TOPRAK SAHIBI</h2><div class="sen-ad"><span>&#128081;</span><span style="color:' + esc(renk) + ';">' + esc(rumuz) + '</span></div>'
+ '<div class="sat"><span>Topraklarin</span><b>' + hucreSayisi + ' hucre</b></div>'
+ '<div class="sat"><span>Altin</span><b class="altin">' + bakiye + '</b></div>'
+ '<div class="sat"><span>Sonraki hucre</span><b class="altin">' + fiyat + '</b></div>'
+ '<div class="sat"><span>Gezegen</span><b>' + boyut + '&#215;' + boyut + '</b></div>'
+ '<div class="sat"><span>Toplam sahipli</span><b>' + gezegenSahipli + '</b></div>'
+ (baslangicBtn ? '<div style="margin-top:14px;">' + baslangicBtn + '</div>' : '')
+ '</aside>'
+ '<main class="mapwrap"><div class="grid">' + hucreHtml + etiketHtml + '</div>'
+ '<p class="ipucu">Yesil kesikli hucreler kendi topragina komsu bos hucrelerdir; tiklayip satin al. Fiyat = 10 &#215; mevcut hucre sayisi. Sahipli oran %50 gecince gezegen bir halka buyur.</p>'
+ '<div class="actionbar">'
+ '<form method="POST" action="/oyun/test-komsu" style="display:inline;"><input type="hidden" name="sinif" value="' + sinif + '"><button class="abtn" type="submit">&#128101; Test komsu</button></form>'
+ '<form method="POST" action="/oyun/sifirla" style="display:inline;" onsubmit="return confirm(\'Bu gezegendeki tum onizleme verisi silinsin mi?\');"><input type="hidden" name="sinif" value="' + sinif + '"><button class="abtn abtn-tehlike" type="submit">&#128465; Sifirla</button></form>'
+ '</div></main>'
+ '<aside class="panel"><h2>BOLGE SAHIPLERI</h2>' + lejant + '</aside>'
+ '</div>'
+ '<div class="gezegen-rozet"><div class="gez-kup"></div><div class="gez-ad">GEZEGEN<b>' + sinif + '. Sinif</b></div></div>'
+ '<script>function al(x,y){fetch("/oyun/hucre-al",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"sinif=' + sinif + '&x="+x+"&y="+y}).then(function(r){return r.json();}).then(function(d){if(d&&d.ok){location.reload();}else{alert((d&&d.hata)||"Satin alinamadi.");}}).catch(function(){alert("Baglanti hatasi.");});}</script>'
+ '</body></html>';
}
// ---- GET /oyun/:sinif : harita ----
router.get('/oyun/:sinif', async (req, res) => {
    if (!adminMi(req)) return kapali(res);
    const sinif = String(req.params.sinif);
    if (!['5', '6', '7', '8'].includes(sinif)) return res.redirect('/oyun');
    try {
        const ben = await oyuncuGetir(ADMIN_OYUNCU, sinif);
        const hucreler = await OyunHucre.find({ sinif }).lean();
        const oyuncular = await OyunOyuncu.find({ sinif }).lean();
        const oyuncuMap = {};
        oyuncular.forEach(o => { oyuncuMap[o.kullaniciAdi] = o; });
        const hucreMap = {};
        const benimSet = new Set();
        let maxKoord = 0;
        hucreler.forEach(h => {
            hucreMap[h.x + ',' + h.y] = h;
            if (h.sahip === ADMIN_OYUNCU) benimSet.add(h.x + ',' + h.y);
            maxKoord = Math.max(maxKoord, h.x, h.y);
        });
        const hucreSayisi = benimSet.size;
        let boyut = planetBoyut(hucreler.length);
        if (maxKoord + 1 > boyut) boyut = maxKoord + 1;
        const fiyat = 10 * hucreSayisi;
        const bakiye = await altinBakiye(ben);
        res.send(haritaHtml({
            sinif, rumuz: ben.rumuz, renk: ben.renk, bakiye, fiyat, boyut,
            hucreMap, oyuncuMap, benimSet, hucreSayisi, gezegenSahipli: hucreler.length
        }));
    } catch (e) {
        console.error('[oyun harita]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

// ---- POST /oyun/baslangic : ilk hucre (ucretsiz, rastgele) ----
router.post('/oyun/baslangic', async (req, res) => {
    if (!adminMi(req)) return kapali(res);
    const sinif = String(req.body.sinif);
    try {
        await oyuncuGetir(ADMIN_OYUNCU, sinif);
        const varOlan = await OyunHucre.countDocuments({ sinif, sahip: ADMIN_OYUNCU });
        if (varOlan > 0) return res.redirect('/oyun/' + sinif);
        const hepsi = await OyunHucre.find({ sinif }, 'x y').lean();
        const dolu = new Set(hepsi.map(h => h.x + ',' + h.y));
        const boyut = planetBoyut(hepsi.length);
        // merkeze yakin rastgele bos hucre
        const adaylar = [];
        for (let y = 0; y < boyut; y++) for (let x = 0; x < boyut; x++) if (!dolu.has(x + ',' + y)) adaylar.push([x, y]);
        if (!adaylar.length) return res.redirect('/oyun/' + sinif);
        const merkez = boyut / 2;
        adaylar.sort((a, b) => (Math.abs(a[0] - merkez) + Math.abs(a[1] - merkez)) - (Math.abs(b[0] - merkez) + Math.abs(b[1] - merkez)));
        const yakin = adaylar.slice(0, Math.min(8, adaylar.length));
        const sec = yakin[Math.floor(Math.random() * yakin.length)];
        await new OyunHucre({ sinif, x: sec[0], y: sec[1], sahip: ADMIN_OYUNCU }).save();
        res.redirect('/oyun/' + sinif);
    } catch (e) {
        console.error('[oyun baslangic]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

// ---- POST /oyun/hucre-al : bitisik satin alma (artan fiyat) ----
router.post('/oyun/hucre-al', async (req, res) => {
    if (!adminMi(req)) return res.status(403).json({ ok: false, hata: 'Yetki yok.' });
    const sinif = String(req.body.sinif);
    const x = parseInt(req.body.x), y = parseInt(req.body.y);
    if (Number.isNaN(x) || Number.isNaN(y)) return res.json({ ok: false, hata: 'Gecersiz hucre.' });
    try {
        const ben = await oyuncuGetir(ADMIN_OYUNCU, sinif);
        const benimler = await OyunHucre.find({ sinif, sahip: ADMIN_OYUNCU }, 'x y').lean();
        const benimSet = new Set(benimler.map(h => h.x + ',' + h.y));
        if (benimSet.size === 0) return res.json({ ok: false, hata: 'Once baslangic yurdunu al.' });
        // bitisiklik
        let bitisik = false;
        for (const [dx, dy] of KOMSU) if (benimSet.has((x + dx) + ',' + (y + dy))) { bitisik = true; break; }
        if (!bitisik) return res.json({ ok: false, hata: 'Yalniz kendi topragina komsu hucre alinabilir.' });
        // bos mu
        const dolu = await OyunHucre.findOne({ sinif, x, y });
        if (dolu) return res.json({ ok: false, hata: 'Bu hucre zaten alinmis.' });
        // fiyat + altin
        const fiyat = 10 * benimSet.size;
        const bakiye = await altinBakiye(ben);
        if (bakiye < fiyat) return res.json({ ok: false, hata: 'Yetersiz altin (' + fiyat + ' gerekli).' });
        await new OyunHucre({ sinif, x, y, sahip: ADMIN_OYUNCU }).save();
        ben.harcananAltin = (ben.harcananAltin || 0) + fiyat;
        await ben.save();
        res.json({ ok: true });
    } catch (e) {
        console.error('[oyun hucre-al]', e.message);
        res.json({ ok: false, hata: e.message });
    }
});

// ---- POST /oyun/test-komsu : bitisik sahte oyuncu (gorsel test) ----
router.post('/oyun/test-komsu', async (req, res) => {
    if (!adminMi(req)) return kapali(res);
    const sinif = String(req.body.sinif);
    try {
        const hepsi = await OyunHucre.find({ sinif }, 'x y sahip').lean();
        const dolu = new Set(hepsi.map(h => h.x + ',' + h.y));
        const boyut = Math.max(planetBoyut(hepsi.length), 8);
        const benimler = hepsi.filter(h => h.sahip === ADMIN_OYUNCU);
        // topragima bitisik bos bir hucre bul
        let hedef = null;
        for (const h of benimler) {
            for (const [dx, dy] of KOMSU) {
                const nx = h.x + dx, ny = h.y + dy;
                if (nx >= 0 && ny >= 0 && nx < boyut && ny < boyut && !dolu.has(nx + ',' + ny)) { hedef = [nx, ny]; break; }
            }
            if (hedef) break;
        }
        // yedek: herhangi bos hucre
        if (!hedef) {
            for (let y = 0; y < boyut && !hedef; y++) for (let x = 0; x < boyut && !hedef; x++) if (!dolu.has(x + ',' + y)) hedef = [x, y];
        }
        if (!hedef) return res.redirect('/oyun/' + sinif);
        // sahte oyuncu kimligi
        const mevcutSahte = await OyunOyuncu.countDocuments({ sinif, kullaniciAdi: /^__test_komsu_/ });
        const id = '__test_komsu_' + (mevcutSahte + 1) + '__';
        await oyuncuGetir(id, sinif);
        await new OyunHucre({ sinif, x: hedef[0], y: hedef[1], sahip: id }).save();
        res.redirect('/oyun/' + sinif);
    } catch (e) {
        console.error('[oyun test-komsu]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

// ---- POST /oyun/sifirla : gezegeni temizle (onizleme) ----
router.post('/oyun/sifirla', async (req, res) => {
    if (!adminMi(req)) return kapali(res);
    const sinif = String(req.body.sinif);
    try {
        await OyunHucre.deleteMany({ sinif });
        await OyunOyuncu.deleteMany({ sinif });
        res.redirect('/oyun/' + sinif);
    } catch (e) {
        console.error('[oyun sifirla]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

module.exports = router;
