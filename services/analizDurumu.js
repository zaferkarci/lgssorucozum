const Soru = require('../models/Soru');
const KonuIzin = require('../models/KonuIzin');
const CevapKaydi = require('../models/CevapKaydi');

// v4.8.19: Ogrenci su an zorunlu seviye analizinde mi?
//   routes/panel.js GET'teki analiz hesabinin birebir aynasi: acik (KonuIzin)
//   her (ders,unite,konu) icin min(2, yayinda soru) FARKLI cevap esigi.
//   /cevap'ta yeni cevap kaydina 'analiz' etiketi basmak icin kullanilir;
//   cevap kaydedilmeden ONCE cagrildigi icin 'analizi tamamlayan cevap' da
//   dogru sekilde analiz etiketi alir.
async function analizModundaMi(k) {
    try {
        if (!k || k.rol !== 'ogrenci') return false;
        const yayindaSorular = await Soru.find({ durum: 'yayinda', sinif: String(k.sinif) }, 'ders unite konu').lean();
        if (!yayindaSorular.length) return false;
        let kapaliSet = new Set();
        try {
            const kapaliKayitlar = await KonuIzin.find({ sinif: String(k.sinif), acik: false }, 'ders unite konu').lean();
            kapaliSet = new Set(kapaliKayitlar.map(x => (x.ders||'')+'|'+(x.unite||'')+'|'+(x.konu||'')));
        } catch (e) { kapaliSet = new Set(); }
        const konuToplam = {};
        yayindaSorular.forEach(s => {
            const tk = (s.ders||'')+'|'+(s.unite||'')+'|'+(s.konu||'');
            if (kapaliSet.has(tk)) return;
            konuToplam[tk] = (konuToplam[tk] || 0) + 1;
        });
        const cozulenKayitlar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }, 'soruId').lean();
        const cIds = [...new Set(cozulenKayitlar.map(c => String(c.soruId)))];
        const cTopics = cIds.length
            ? await Soru.find({ _id: { $in: cIds } }, 'ders unite konu').lean()
            : [];
        const idTopic = {};
        cTopics.forEach(s => { idTopic[String(s._id)] = (s.ders||'')+'|'+(s.unite||'')+'|'+(s.konu||''); });
        const konuCevap = {};
        cIds.forEach(id => {
            const tk = idTopic[id];
            if (tk && konuToplam[tk] !== undefined) konuCevap[tk] = (konuCevap[tk] || 0) + 1;
        });
        let eksikVar = false;
        Object.keys(konuToplam).forEach(tk => {
            if ((konuCevap[tk] || 0) < Math.min(2, konuToplam[tk])) eksikVar = true;
        });
        return eksikVar;
    } catch (e) {
        return false;
    }
}

module.exports = { analizModundaMi };
