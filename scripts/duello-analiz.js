// scripts/duello-analiz.js
// v4.17.37-2: YALNIZ OKUR — gecmis duellolari ve oyuncularin cevap aliskanliklarini listeler. Veritabaninda hicbir sey degismez.
//   Ayni analiz admin panelinde de var: Icerik > "Duello Analizi". Esikler oyundaki kurallarla ayni (services/duelloKural.js):
//     GECERLI SURE   : sure >= max(5 sn, sorunun dogru cevap medyani x %25); daha kisasi sans eseri sayilir.
//     HIZLI ISARETLEME: son 50 cevapta dogru < %40 VE cevaplarin >= %25'i 5 sn'den kisa -> saldiri kapali.
//
//   Kullanim (proje klasorunde):
//     node scripts/duello-analiz.js                    -> tum duellolar, adlar gizli (ogr1, ogr2...)
//     node scripts/duello-analiz.js --adlar            -> kullanici adlarini da yazar
//     node scripts/duello-analiz.js --kullanici=ali    -> yalniz bu kisinin duellolari (onun adi acik yazilir)
//     node scripts/duello-analiz.js --gun=30           -> yalniz son 30 gun
//     node scripts/duello-analiz.js --tumu             -> supheli olmayan duellolari da listeler

try { require('dotenv').config(); } catch (e) { /* dotenv yoksa env'den okunur */ }
const mongoose = require('mongoose');
const { duelloAnaliz } = require('../services/duelloKural');

const arg = process.argv.slice(2);
const ADLAR = arg.includes('--adlar');
const TUMU = arg.includes('--tumu');
const KULLANICI = ((arg.find(a => a.startsWith('--kullanici=')) || '').split('=')[1] || '').trim();
const _g = Number(((arg.find(a => a.startsWith('--gun=')) || '').split('=')[1]) || 0);
const GUN = Number.isFinite(_g) && _g > 0 ? _g : 0;

function tr(t) { return new Date(new Date(t).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '); }
function yuzde(x) { return x == null ? '  -' : String(Math.round(x * 100)).padStart(3) + '%'; }
function sn(x) { return (x == null || x >= 99999) ? '-' : (Math.round(x * 10) / 10) + ''; }

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('HATA: MONGO_URI tanimli degil (.env veya ortam degiskeni).'); process.exit(1); }
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri);
    const r = await duelloAnaliz({ gun: GUN, kullanici: KULLANICI });
    const E = r.esik, oz = r.ozet;
    console.log('DUELLO ANALIZI (yalniz okur, hicbir sey degismez) — ' + oz.toplam + ' duello' + (GUN ? ', son ' + GUN + ' gun' : ', tum zamanlar') + (KULLANICI ? ', kullanici: ' + KULLANICI : ''));
    if (!oz.toplam) { await mongoose.disconnect(); return; }
    console.log('ESIKLER: gecerli sure >= max(' + E.TABAN_SN + ' sn, sorunun dogru cevap medyani x %' + Math.round(E.ORAN * 100) + ') | hizli isaretleme: son ' + E.SON_CEVAP + ' cevapta dogru < %' + Math.round(E.ISABET * 100) + ' ve <' + E.HIZLI_SN + ' sn >= %' + Math.round(E.HIZLI_ORAN * 100));

    const adMap = {}; let adSay = 0;
    const ad = a => (ADLAR || (KULLANICI && a === KULLANICI)) ? a : (adMap[a] || (adMap[a] = 'ogr' + (++adSay)));

    const liste = r.duellolar.filter(d => TUMU || d.k1 || d.k2);
    console.log('\n1) ' + (TUMU ? 'TUM' : 'SUPHELI') + ' DUELLOLAR (' + liste.length + ')   ! = gecersiz (sans eseri) sure');
    console.log('   TARIH(TR)         SINIF  SALDIRAN     sure    RAKIP        sure    SORU  esik  KAZANAN   isabet/<5sn  K1 K2');
    for (const d of liste) {
        console.log('   ' + tr(d.tarih) + '  ' + String(d.sinif || '').padEnd(5) + '  ' +
            ad(d.saldiranAd).padEnd(12) + ' ' + (sn(d.saldiranSure) + (d.sG ? ' ' : '!')).padStart(5) + '   ' +
            ad(d.rakipAd).padEnd(12) + ' ' + (sn(d.rakipSure) + (d.rG ? ' ' : '!')).padStart(5) + '   ' +
            String(d.soruNo || '?').padStart(5) + ' ' + String(Math.round(d.esik)).padStart(4) + '  ' +
            (d.sKazandi ? 'SALDIRAN' : 'savunan ') + '  ' + yuzde(d.isabet.dogruOran) + '/' + yuzde(d.isabet.hizliOran) + '   ' + (d.k1 ? 'X' : '.') + '  ' + (d.k2 ? 'X' : '.'));
    }
    console.log('   K1: kazananin suresi sans eseri -> yeni kuralla bu sonuc olmazdi | K2: saldiran hizli isaretliyordu -> saldiramazdi');

    console.log('\n2) OYUNCU OZETI (' + r.oyuncular.length + ' oyuncu)');
    console.log('   OYUNCU       HUCRE  SALDIRI(kazandi)  SAVUNMA(korudu)  SANS ESERI  KAZANDIGI   | SON ' + E.SON_CEVAP + ': dogru  medyan  <' + E.HIZLI_SN + 'sn | TUM CEVAP  SALDIRI');
    for (const o of r.oyuncular) {
        console.log('   ' + ad(o.ad).padEnd(12) + ' ' + String(o.hucre).padStart(5) + '  ' +
            (o.sald + '(' + o.saldK + ')').padStart(10) + '        ' + (o.sav + '(' + o.savK + ')').padStart(9) + '       ' +
            String(o.supheliK).padStart(5) + '     ' + (sn(o.kazanSureMedyan) + ' sn').padStart(8) + '    |     ' +
            yuzde(o.sonDogru) + '  ' + (sn(o.sonMedyanSure) + ' sn').padStart(7) + '  ' + yuzde(o.sonHizli) + ' |  ' +
            String(o.toplamCevap).padStart(5) + '     ' + (o.engelSimdi ? 'KAPALI (hizli isaretleme)' : 'acik'));
    }
    console.log('\nOZET: ' + oz.toplam + ' duello | sans eseri sureyle kazanilan (K1): ' + oz.k1 + ' (%' + Math.round(100 * oz.k1 / oz.toplam) + ') | hizli isaretlerken acilan (K2): ' + oz.k2 + ' | yeni kurallarla degisecek: ' + oz.biri);
    console.log('(Yalniz okundu; veritabaninda hicbir sey degismedi.)');
    await mongoose.disconnect();
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
