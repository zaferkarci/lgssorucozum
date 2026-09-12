// services/yedekleme.js — v4.16.47
// Tum koleksiyonlari JSON olarak disa aktarma / geri yukleme.
// Dinamik: models/ klasorundeki her model otomatik dahil edilir (yeni model
// eklenince kod degistirmeye gerek yok).

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// models/ altindaki tum modelleri yukle ve mongoose'a kaydettir
function modelleriYukle() {
    const dizin = path.join(__dirname, '..', 'models');
    let dosyalar = [];
    try { dosyalar = fs.readdirSync(dizin).filter(f => f.endsWith('.js')); } catch (e) { return; }
    dosyalar.forEach(f => {
        try { require(path.join(dizin, f)); } catch (e) {
            console.error('[yedekleme] model yuklenemedi:', f, e.message);
        }
    });
}

// { modelAdi: [belgeler...] } seklinde tam yedek uretir
async function yedekAl() {
    modelleriYukle();
    const adlar = mongoose.modelNames();
    const veri = {};
    const ozet = [];
    for (const ad of adlar) {
        try {
            const M = mongoose.model(ad);
            const belgeler = await M.find({}).lean();
            veri[ad] = belgeler;
            ozet.push({ koleksiyon: ad, adet: belgeler.length });
        } catch (e) {
            console.error('[yedekleme] okuma hatasi:', ad, e.message);
            veri[ad] = [];
            ozet.push({ koleksiyon: ad, adet: 0, hata: e.message });
        }
    }
    return {
        surum: 1,
        tarih: new Date().toISOString(),
        ozet,
        veri
    };
}

// Yedek dosyasindan geri yukler.
//   mod 'birlestir' -> mevcut kayitlar korunur, ayni _id varsa uzerine yazilir (upsert)
//   mod 'sifirla'   -> once koleksiyon TAMAMEN silinir, sonra yedek yazilir
async function geriYukle(yedek, mod) {
    modelleriYukle();
    if (!yedek || !yedek.veri || typeof yedek.veri !== 'object') {
        throw new Error('Gecersiz yedek dosyasi (veri alani yok).');
    }
    const sonuc = [];
    const kayitliAdlar = mongoose.modelNames();

    for (const ad of Object.keys(yedek.veri)) {
        if (kayitliAdlar.indexOf(ad) === -1) {
            sonuc.push({ koleksiyon: ad, durum: 'atlandi (model yok)', adet: 0 });
            continue;
        }
        const belgeler = Array.isArray(yedek.veri[ad]) ? yedek.veri[ad] : [];
        try {
            const M = mongoose.model(ad);
            if (mod === 'sifirla') {
                await M.deleteMany({});
            }
            if (belgeler.length) {
                const ops = belgeler.map(b => ({
                    replaceOne: { filter: { _id: b._id }, replacement: b, upsert: true }
                }));
                // 500'luk gruplar halinde yaz (bellek guvenli)
                for (let i = 0; i < ops.length; i += 500) {
                    await M.bulkWrite(ops.slice(i, i + 500), { ordered: false });
                }
            }
            sonuc.push({ koleksiyon: ad, durum: 'tamam', adet: belgeler.length });
        } catch (e) {
            console.error('[yedekleme] geri yukleme hatasi:', ad, e.message);
            sonuc.push({ koleksiyon: ad, durum: 'HATA: ' + e.message, adet: 0 });
        }
    }
    return sonuc;
}

module.exports = { yedekAl, geriYukle };
