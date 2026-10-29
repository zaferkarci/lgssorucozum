// scripts/gorsel-duzenle.js
// v4.17.33: TEK SEFERLIK — mevcut soru gorsellerinin Cloudinary adreslerine teslim ayari ekler (dosyalarin kendisi degismez):
//   - Tum soru gorselleri: saydam alanlar BEYAZ doldurulur (b_white,c_pad,w_1.0). Telefonun karanlik modunda saydam
//     PNG'deki siyah cizgiler kayboluyordu.
//   - Yuksek cozunurluklu (hd_) gorseller: ayrica f_auto,q_auto (WebP, otomatik kalite). Piksel sayisi ayni, dosya kucuk.
//   Yeni yuklenen gorseller v4.17.33'ten beri zaten bu ayarla kaydedilir (routes/gorselliPdfYukle.js).
//
//   Kullanim (proje klasorunde):
//     node scripts/gorsel-duzenle.js                  -> YALNIZ LISTELER ve OLCER, hicbir sey degismez
//     node scripts/gorsel-duzenle.js --soru=677,625   -> yalniz bu sorular
//     node scripts/gorsel-duzenle.js --uygula         -> dogrulanan adresleri veritabaninda degistirir
//
//   Her gorsel icin eski ve yeni adres Cloudinary'den istenir (ilk 4 KB) ve karsilastirilir: HTTP durumu, dosya boyutu,
//   bicim, piksel olcusu, saydamlik. Yalniz yeni adres ACILIYORSA, piksel olcusu AYNIYSA ve SAYDAMLIK KALMADIYSA uygulanir.
//   Geri almak gerekirse: adreslerdeki "b_white,c_pad,w_1.0[,f_auto,q_auto]/" parcasini silmek yeterli (dosya ayni dosya).

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const Soru = require('../models/Soru');
const { gorselAdresiDuzenle } = require('../services/cloudinaryYukle');

const arg = process.argv.slice(2);
const UYGULA = arg.includes('--uygula');
const SORULAR = ((arg.find(a => a.startsWith('--soru=')) || '').split('=')[1] || '').split(',').map(Number).filter(Number.isFinite);

const RESIM_ALANLARI = ['soruOnculu1Resmi', 'soruOnculu2Resmi', 'soruOnculu3Resmi', 'soruResmi'];
const HTML_ALANLARI = ['soruOnculu1', 'soruOnculu2', 'soruOnculu3', 'soruMetni'];
const IMG_RX = /<img[^>]+src=["']?(https:\/\/res\.cloudinary\.com\/[^"' >]+)/gi;

function kb(n) { return n == null ? '?' : (n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.round(n / 1024) + ' KB'); }

// Ilk baytlardan bicim, olcu ve saydamlik
function coz(b) {
    const s = { bicim: '?', w: null, h: null, saydam: null };
    if (b.length > 24 && b.slice(1, 4).toString() === 'PNG') {
        s.bicim = 'png'; s.w = b.readUInt32BE(16); s.h = b.readUInt32BE(20);
        const ct = b[25];
        s.saydam = (ct === 4 || ct === 6) ? true : (ct === 3 ? b.includes(Buffer.from('tRNS')) : false);
    } else if (b.length > 30 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
        s.bicim = 'webp';
        const parca = b.slice(12, 16).toString();
        if (parca === 'VP8X') { s.saydam = !!(b[20] & 0x10); s.w = 1 + b.readUIntLE(24, 3); s.h = 1 + b.readUIntLE(27, 3); }
        else if (parca === 'VP8L') { const v = b.readUInt32LE(21); s.w = 1 + (v & 0x3fff); s.h = 1 + ((v >> 14) & 0x3fff); s.saydam = !!((v >> 28) & 1); }
        else if (parca === 'VP8 ') { s.saydam = false; s.w = b.readUInt16LE(26) & 0x3fff; s.h = b.readUInt16LE(28) & 0x3fff; }
    } else if (b.length > 2 && b[0] === 0xff && b[1] === 0xd8) {
        s.bicim = 'jpg'; s.saydam = false;
    }
    return s;
}
async function olc(url) {
    try {
        const r = await fetch(url, { headers: { Range: 'bytes=0-4095', Accept: 'image/webp,image/png,image/*;q=0.8' } });
        const b = Buffer.from(await r.arrayBuffer());
        const cr = r.headers.get('content-range');
        const boyut = cr ? Number(cr.split('/')[1]) : Number(r.headers.get('content-length')) || null;
        return Object.assign({ durum: r.status, boyut }, coz(b));
    } catch (e) {
        return { durum: 'HATA ' + e.message, boyut: null, bicim: '?', w: null, h: null, saydam: null };
    }
}

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);

    const filtre = SORULAR.length ? { soruNo: { $in: SORULAR } } : {};
    const sorular = await Soru.find(filtre, 'soruNo ' + RESIM_ALANLARI.join(' ') + ' ' + HTML_ALANLARI.join(' ') + ' secenekler').sort({ soruNo: 1 }).lean();

    // Duzenlenecek adresleri topla: { soruId, soruNo, yol, eski, yeni, html }
    const isler = [];
    for (const s of sorular) {
        const ekle = (yol, eski, html) => { const yeni = gorselAdresiDuzenle(eski); if (yeni !== eski) isler.push({ soruId: s._id, soruNo: s.soruNo, yol, eski, yeni, html }); };
        RESIM_ALANLARI.forEach(a => { if (s[a]) ekle(a, s[a], false); });
        (s.secenekler || []).forEach((x, i) => { if (x && x.gorsel) ekle('secenekler.' + i + '.gorsel', x.gorsel, false); });
        HTML_ALANLARI.forEach(a => { let k; IMG_RX.lastIndex = 0; while ((k = IMG_RX.exec(s[a] || ''))) ekle(a, k[1], true); });
        (s.secenekler || []).forEach((x, i) => { let k; IMG_RX.lastIndex = 0; while ((k = IMG_RX.exec((x && x.metin) || ''))) ekle('secenekler.' + i + '.metin', k[1], true); });
    }
    console.log('GORSEL DUZENLEME ' + (UYGULA ? '(UYGULA)' : '(yalniz listeler, hicbir sey degismez)') + ' — ' + sorular.length + ' soru, duzenlenecek ' + isler.length + ' gorsel adresi');
    if (!isler.length) { console.log('Duzenlenecek adres yok.'); await mongoose.disconnect(); return; }

    let topEski = 0, topYeni = 0, uygun = 0, hd = 0, saydam = 0;
    const sorunlu = [];
    for (let i = 0; i < isler.length; i++) {
        const is = isler[i];
        const [e, y] = [await olc(is.eski), await olc(is.yeni)];
        is.ok = (y.durum === 200 || y.durum === 206) && y.saydam === false && (!e.w || !y.w || (e.w === y.w && e.h === y.h));
        if (/\/hd_/.test(is.eski)) hd++;
        if (e.saydam) saydam++;
        if (is.ok) { uygun++; if (e.boyut && y.boyut) { topEski += e.boyut; topYeni += y.boyut; } } else sorunlu.push(is);
        console.log('\n' + (i + 1) + '. SORU ' + is.soruNo + ' | ' + is.yol + (is.html ? ' (metin icindeki gorsel)' : '') + (/\/hd_/.test(is.eski) ? ' | hd' : ''));
        console.log('   eski: ' + e.durum + ' | ' + e.bicim + ' | ' + kb(e.boyut) + ' | ' + (e.w ? e.w + 'x' + e.h : '?') + ' px | ' + (e.saydam ? 'SAYDAM' : e.saydam === false ? 'opak' : '?'));
        console.log('   yeni: ' + y.durum + ' | ' + y.bicim + ' | ' + kb(y.boyut) + ' | ' + (y.w ? y.w + 'x' + y.h : '?') + ' px | ' + (y.saydam ? 'SAYDAM' : y.saydam === false ? 'opak' : '?') + '   -> ' + (is.ok ? 'UYGUN' : 'ATLANACAK'));
    }
    console.log('\nOZET: ' + isler.length + ' adres (' + hd + ' hd, ' + saydam + ' saydam) | uygun ' + uygun + ' | atlanacak ' + sorunlu.length);
    if (topEski) console.log('      Uygun olanlarin toplam boyutu: ' + kb(topEski) + ' -> ' + kb(topYeni) + ' (%' + Math.round(100 * (1 - topYeni / topEski)) + ' kucuk)');
    if (sorunlu.length) console.log('      Atlananlar: ' + sorunlu.map(x => 'soru ' + x.soruNo + ' ' + x.yol).join(', '));

    if (!UYGULA) {
        console.log('\n(Yalniz listelendi; veritabaninda hicbir sey degismedi. Uygulamak icin ayni komutu --uygula ile calistirin.)');
        await mongoose.disconnect();
        return;
    }
    // Soru bazinda topla ve yaz (yalniz UYGUN olanlar)
    const soruBazli = new Map();
    for (const is of isler.filter(x => x.ok)) {
        if (!soruBazli.has(String(is.soruId))) soruBazli.set(String(is.soruId), []);
        soruBazli.get(String(is.soruId)).push(is);
    }
    let n = 0;
    for (const [id, liste] of soruBazli) {
        const s = await Soru.findById(id).lean();
        if (!s) continue;
        const set = {};
        for (const is of liste) {
            const yol = is.yol.split('.');
            const mevcut = yol.length === 3 ? (((s.secenekler || [])[Number(yol[1])] || {})[yol[2]] || '') : (s[is.yol] || '');
            const temel = set[is.yol] != null ? set[is.yol] : mevcut;
            if (is.html) set[is.yol] = temel.split(is.eski).join(is.yeni);
            else if (temel === is.eski) set[is.yol] = is.yeni;
        }
        if (Object.keys(set).length) { await Soru.updateOne({ _id: id }, { $set: set }); n += Object.keys(set).length; }
    }
    console.log('\nUYGULANDI: ' + soruBazli.size + ' soruda ' + n + ' alan guncellendi.');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
