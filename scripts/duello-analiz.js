// scripts/duello-analiz.js
// v4.17.37-2: YALNIZ OKUR — gecmis duellolari ve oyuncularin cevap aliskanliklarini listeler. Veritabaninda hicbir sey degismez.
//
//   Amac: "soruyu okumadan hizli isaretleyip sans eseri dogru gelen kisa surelerle duello kazanma" durumunu olcmek
//   ve onerilen iki kuralin gecmiste neyi degistirecegini gormek:
//     KURAL 1 (gecerli sure): duelloda yalniz en az 10 sn VE sorunun dogru cevap medyaninin en az %25'i kadar surede
//                             verilmis dogrular sayilir (daha kisasi sans/okumadan isaretleme kabul edilir).
//     KURAL 2 (isabet sarti): saldiranin duellodan onceki son 50 cevabinda dogru orani en az %40 olmali.
//
//   Kullanim (proje klasorunde):
//     node scripts/duello-analiz.js                    -> tum duellolar, adlar gizli (ogr1, ogr2...)
//     node scripts/duello-analiz.js --adlar            -> kullanici adlarini da yazar
//     node scripts/duello-analiz.js --kullanici=ali    -> yalniz bu kisinin duellolari (onun adi acik yazilir)
//     node scripts/duello-analiz.js --gun=30           -> yalniz son 30 gun
//     node scripts/duello-analiz.js --tumu             -> supheli olmayan duellolari da listeler

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const DuelloKayit = require('../models/DuelloKayit');
const OyunHucre = require('../models/OyunHucre');

const arg = process.argv.slice(2);
const ADLAR = arg.includes('--adlar');
const TUMU = arg.includes('--tumu');
const KULLANICI = ((arg.find(a => a.startsWith('--kullanici=')) || '').split('=')[1] || '').trim();
const _g = Number(((arg.find(a => a.startsWith('--gun=')) || '').split('=')[1]) || 0);
const GUN = Number.isFinite(_g) && _g > 0 ? _g : 0;

const TABAN = 10;      // sn
const ORAN = 0.25;     // sorunun dogru cevap medyaninin orani
const SON = 50;        // isabet icin bakilan son cevap sayisi
const ISABET = 0.40;   // saldiri icin gereken en az dogru orani
const HIZLI = 5;       // "hizli isaretleme" sayilan sure (sn)

function tr(t) { return new Date(new Date(t).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '); }
function medyan(a) { const b = a.filter(x => typeof x === 'number' && x > 0).sort((x, y) => x - y); if (!b.length) return null; const m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
function yuzde(x) { return x == null ? '  -' : String(Math.round(x * 100)).padStart(3) + '%'; }
function sn(x) { return x == null ? '-' : (Math.round(x * 10) / 10) + ''; }

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);

    const filtre = {};
    if (GUN) filtre.tarih = { $gte: new Date(Date.now() - GUN * 86400000) };
    if (KULLANICI) filtre.$or = [{ saldiranAd: KULLANICI }, { rakipAd: KULLANICI }];
    const duellolar = await DuelloKayit.find(filtre).sort({ tarih: 1 }).lean();
    console.log('DUELLO ANALIZI (yalniz okur, hicbir sey degismez) — ' + duellolar.length + ' duello' + (GUN ? ', son ' + GUN + ' gun' : ', tum zamanlar') + (KULLANICI ? ', kullanici: ' + KULLANICI : ''));
    if (!duellolar.length) { await mongoose.disconnect(); return; }

    // Soru referans suresi: dogru cevap surelerinin medyani (yoksa ortalamaSure)
    const soruIdler = [...new Set(duellolar.map(d => String(d.soruId)).filter(x => x && x !== 'null'))];
    const sorular = await Soru.find({ _id: { $in: soruIdler } }, 'soruNo ortalamaSure dogruCevapSureleri').lean();
    const soruBilgi = {};
    sorular.forEach(s => {
        const m = medyan(s.dogruCevapSureleri || []);
        const ref = (m != null && (s.dogruCevapSureleri || []).length >= 3) ? m : (s.ortalamaSure || null);
        soruBilgi[String(s._id)] = { no: s.soruNo, ref };
    });
    const esik = id => { const r = (soruBilgi[String(id)] || {}).ref; return Math.max(TABAN, r ? r * ORAN : 0); };
    const gecerli = (sure, id) => typeof sure === 'number' && sure >= esik(id);

    // Oyuncularin cevaplari (isabet ve aliskanlik)
    const oyuncular = [...new Set(duellolar.flatMap(d => [d.saldiranAd, d.rakipAd]).filter(Boolean))];
    const cevaplar = await CevapKaydi.find({ kullaniciAdi: { $in: oyuncular } }, 'kullaniciAdi dogruMu sure tarih').sort({ tarih: 1 }).lean();
    const cevapMap = {};
    cevaplar.forEach(c => { (cevapMap[c.kullaniciAdi] = cevapMap[c.kullaniciAdi] || []).push(c); });
    function isabetOnce(ad, t) { // t aninda son SON cevabin dogru orani
        const l = cevapMap[ad] || []; const tt = new Date(t).getTime();
        let lo = 0, hi = l.length; while (lo < hi) { const m = (lo + hi) >> 1; if (new Date(l[m].tarih).getTime() < tt) lo = m + 1; else hi = m; }
        const dilim = l.slice(Math.max(0, lo - SON), lo);
        return dilim.length ? { oran: dilim.filter(c => c.dogruMu).length / dilim.length, n: dilim.length } : { oran: null, n: 0 };
    }

    const adMap = {}; let adSay = 0;
    const ad = a => (ADLAR || (KULLANICI && a === KULLANICI)) ? a : (adMap[a] || (adMap[a] = 'ogr' + (++adSay)));

    // ---- Duello bazli degerlendirme ----
    const st = {}; // oyuncu istatistigi
    const o = a => (st[a] = st[a] || { sald: 0, saldK: 0, sav: 0, savK: 0, supheliK: 0, k2engel: 0, kazanSure: [] });
    let supheliSay = 0, k1Degisir = 0, k2Engel = 0, ikisi = 0;
    const satirlar = [];
    for (const d of duellolar) {
        const sKazandi = d.kazananAd === d.saldiranAd;
        const sG = gecerli(d.saldiranSure, d.soruId), rG = gecerli(d.rakipSure, d.soruId);
        const kazananSure = sKazandi ? d.saldiranSure : d.rakipSure;
        const kazananGecerli = sKazandi ? sG : rG;
        const isb = isabetOnce(d.saldiranAd, d.tarih);
        const k2 = isb.n >= 10 && isb.oran < ISABET; // en az 10 cevap varsa degerlendir
        // Kural 1 ile sonuc degisir mi: kazanan suresi gecersizse bu soru o kisi icin "ortak" sayilmazdi
        const k1 = !kazananGecerli;
        if (!kazananGecerli) supheliSay++;
        if (k1) k1Degisir++;
        if (k2) k2Engel++;
        if (k1 || k2) ikisi++;
        const S = o(d.saldiranAd), R = o(d.rakipAd);
        S.sald++; if (sKazandi) { S.saldK++; S.kazanSure.push(d.saldiranSure); } else { R.savK++; R.kazanSure.push(d.rakipSure); }
        R.sav++;
        if (!kazananGecerli) o(d.kazananAd).supheliK++;
        if (k2) S.k2engel++;
        if (TUMU || k1 || k2) satirlar.push({ d, sKazandi, sG, rG, isb, k1, k2 });
    }

    console.log('\nESIKLER: gecerli sure >= max(' + TABAN + ' sn, sorunun dogru cevap medyani x %' + Math.round(ORAN * 100) + ') | isabet: son ' + SON + ' cevapta >= %' + Math.round(ISABET * 100));
    console.log('\n1) ' + (TUMU ? 'TUM' : 'SUPHELI / KURALLARDAN ETKILENEN') + ' DUELLOLAR (' + satirlar.length + ')');
    console.log('   ! = gecersiz (sans/okumadan) sure | ref = sorunun dogru cevap medyani | isabet = saldiranin o anki son ' + SON + ' cevap dogru orani');
    console.log('   TARIH(TR)         SINIF  SALDIRAN     sure    RAKIP        sure    SORU   ref  KAZANAN      isabet  K1 K2');
    for (const x of satirlar) {
        const d = x.d, sb = soruBilgi[String(d.soruId)] || {};
        console.log('   ' + tr(d.tarih) + '  ' + String(d.sinif || '').padEnd(5) + '  ' +
            ad(d.saldiranAd).padEnd(12) + ' ' + (sn(d.saldiranSure) + (x.sG ? ' ' : '!')).padStart(5) + '   ' +
            ad(d.rakipAd).padEnd(12) + ' ' + (sn(d.rakipSure) + (x.rG ? ' ' : '!')).padStart(5) + '   ' +
            String(sb.no || '?').padStart(5) + ' ' + String(sb.ref != null ? Math.round(sb.ref) : '?').padStart(4) + '  ' +
            (x.sKazandi ? 'SALDIRAN' : 'savunan ').padEnd(12) + ' ' + yuzde(x.isb.oran) + '   ' + (x.k1 ? 'X' : '.') + '  ' + (x.k2 ? 'X' : '.'));
    }
    console.log('   K1 X: kazananin suresi gecersiz -> Kural 1 ile bu soru duelloya hic secilmezdi');
    console.log('   K2 X: saldiranin isabeti %' + Math.round(ISABET * 100) + ' altinda -> Kural 2 ile saldiri acilamazdi');

    // ---- Oyuncu ozeti ----
    const hucreler = await OyunHucre.aggregate([{ $match: { sahip: { $in: oyuncular } } }, { $group: { _id: '$sahip', n: { $sum: 1 } } }]);
    const hucreMap = {}; hucreler.forEach(h => { hucreMap[h._id] = h.n; });
    console.log('\n2) OYUNCU OZETI (' + Object.keys(st).length + ' oyuncu) — en cok supheli kazanandan baslayarak');
    console.log('   OYUNCU       HUCRE  SALDIRI(kazandi)  SAVUNMA(korudu)  SUPHELI   KAZANDIGI     | SON ' + SON + ' CEVAP: dogru  medyan  <' + HIZLI + 'sn  | TUM CEVAP: sayi dogru');
    console.log('                                                          KAZANIM   medyan sure   |');
    const sirali = Object.keys(st).sort((a, b) => (st[b].supheliK - st[a].supheliK) || (st[b].saldK - st[a].saldK));
    for (const a of sirali) {
        const s = st[a], l = cevapMap[a] || [], son = l.slice(-SON);
        const dO = son.length ? son.filter(c => c.dogruMu).length / son.length : null;
        const hO = son.length ? son.filter(c => (c.sure || 0) < HIZLI).length / son.length : null;
        const tO = l.length ? l.filter(c => c.dogruMu).length / l.length : null;
        const isaret = (dO != null && dO < ISABET && hO != null && hO >= 0.5) ? '  <- HIZLI ISARETLEME' : '';
        console.log('   ' + ad(a).padEnd(12) + ' ' + String(hucreMap[a] || 0).padStart(5) + '  ' +
            (s.sald + '(' + s.saldK + ')').padStart(10) + '        ' + (s.sav + '(' + s.savK + ')').padStart(9) + '       ' +
            String(s.supheliK).padStart(5) + '     ' + (sn(medyan(s.kazanSure)) + ' sn').padStart(9) + '     |        ' +
            yuzde(dO) + '  ' + (sn(medyan(son.map(c => c.sure))) + ' sn').padStart(7) + '  ' + yuzde(hO) + '  |      ' +
            String(l.length).padStart(5) + ' ' + yuzde(tO) + isaret);
    }

    console.log('\nOZET:');
    console.log('   Toplam duello: ' + duellolar.length);
    console.log('   Kazananin suresi gecersiz (sans/okumadan): ' + supheliSay + ' (%' + Math.round(100 * supheliSay / duellolar.length) + ')');
    console.log('   Kural 1 ile bu soruyla olmazdi: ' + k1Degisir + ' | Kural 2 ile saldiri acilamazdi: ' + k2Engel + ' | ikisinden en az biri: ' + ikisi);
    console.log('   (Not: kayitlarda hucre konumu tutulmadigi icin hangi hucrenin hangi duelloyla alindigi bilinmez; hucre sayilari bugunku durumdur.)');
    console.log('\n(Yalniz okundu; veritabaninda hicbir sey degismedi.)');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
