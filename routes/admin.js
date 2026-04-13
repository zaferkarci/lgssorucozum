const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const Okul = require('../models/Okul');

function adminKontrol(req, res) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        res.status(401).send('Giriş gerekli!');
        return false;
    }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) return true;
    res.status(401).send('Yetkisiz!');
    return false;
}

router.get('/admin', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    const editSoru = req.query.duzenle ? await Soru.findById(req.query.duzenle) : null;
    const tumSorular = await Soru.find();
    const tumKullanicilar = await Kullanici.find({}, 'kullaniciAdi puan soruIndex sinif il ilce okul');
    const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "T.C. İnkılâp Tarihi", "İngilizce", "Din Kültürü"];
    const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');
    const filIl = req.query.il || '';
    const filIlce = req.query.ilce || '';
    const filOkul = req.query.okul || '';
    const tumOkullar = await Okul.find().sort({ il: 1, ilce: 1, ad: 1 });

    const filtreliKullanicilar = tumKullanicilar.filter(k =>
        (!filIl || k.il === filIl) && (!filIlce || k.ilce === filIlce) && (!filOkul || k.okul === filOkul)
    );
    const iller = [...new Set(tumKullanicilar.map(k => k.il).filter(Boolean))].sort();
    const ilceler = filIl ? [...new Set(tumKullanicilar.filter(k => k.il === filIl).map(k => k.ilce).filter(Boolean))].sort() : [];
    const okullar = filIlce ? [...new Set(tumKullanicilar.filter(k => k.ilce === filIlce).map(k => k.okul).filter(Boolean))].sort() : [];

    res.render('admin', {
        mod, editSoru, tumSorular, dersler,
        tumKullanicilar, filtreliKullanicilar,
        iller, ilceler, okullar,
        filIl, filIlce, filOkul,
        tumOkullar
    });
});

router.post('/soru-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) });
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin?mod=soruListesi');
});

router.post('/kullanici-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Kullanici.findOneAndDelete({ kullaniciAdi: req.body.kullaniciAdi });
        const params = new URLSearchParams({ mod: 'kullanicilar', il: req.body.il || '', ilce: req.body.ilce || '', okul: req.body.okul || '' }).toString();
        res.redirect('/admin?' + params);
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/sifirla', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Kullanici.updateMany({}, { $set: { soruIndex: 0, puan: 0, toplamSure: 0, cozumSureleri: [] } });
        await Soru.updateMany({}, { $set: { cozulmeSayisi: 0, dogruSayisi: 0, ortalamaSure: 0, hamPuan: null, zorlukKatsayisi: 3, cozumSureleriTum: [], dogruCevapSureleri: [] } });
        res.send('<script>alert("Tüm veriler sıfırlandı!"); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.get('/api/okullar', async (req, res) => {
    try {
        const { il, ilce } = req.query;
        const filtre = {};
        if (il) filtre.il = il;
        if (ilce) filtre.ilce = ilce;
        const okullar = await Okul.find(filtre, 'ad').sort({ ad: 1 });
        res.json(okullar.map(o => o.ad));
    } catch (err) { res.status(500).json([]); }
});

router.post('/okul-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const varMi = await Okul.findOne({ il: req.body.il, ilce: req.body.ilce, ad: req.body.ad });
        if (!varMi) await new Okul({ il: req.body.il, ilce: req.body.ilce, ad: req.body.ad }).save();
        res.redirect('/admin?mod=okullar');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/okul-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Okul.findByIdAndDelete(req.body.id);
        res.redirect('/admin?mod=okullar');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// Kullanıcı kayıt sırasında okul listesine otomatik ekle (auth gerektirmez)
router.post('/okul-kaydet', async (req, res) => {
    try {
        const { il, ilce, ad } = req.body;
        if (!il || !ilce || !ad) return res.status(400).json({ ok: false });
        const varMi = await Okul.findOne({ il, ilce, ad });
        if (!varMi) await new Okul({ il, ilce, ad }).save();
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false }); }
});

module.exports = router;
