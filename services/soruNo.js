const Soru = require('../models/Soru');

// v4.8.14: En kucuk KULLANILMAYAN pozitif soruNo'lari (adet kadar) dondurur.
//   Boylece silinen numaralar (bosluklar) yeni eklemelerde tekrar kullanilir;
//   sira "deliksiz" devam eder. Bosluk yoksa max+1, max+2, ... gibi davranir
//   (eski "max+1" davranisiyla ayni sonuc). adet>=1.
async function bosSoruNo(adet = 1) {
    const mevcut = await Soru.find({ soruNo: { $exists: true, $ne: null } }, 'soruNo').lean();
    const kullanilan = new Set(mevcut.map(s => s.soruNo));
    const sonuc = [];
    let n = 1;
    while (sonuc.length < adet) {
        if (!kullanilan.has(n)) sonuc.push(n);
        n++;
    }
    return sonuc;
}

module.exports = { bosSoruNo };
