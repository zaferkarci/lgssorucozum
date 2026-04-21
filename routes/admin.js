const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const Okul = require('../models/Okul');
const Unite = require('../models/Unite');
const CevapKaydi = require('../models/CevapKaydi');
const multer = require('multer');

// ── Multer: Excel yüklemeleri ────────────────────────────────────────────────
const uploadExcel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls)$/i)) cb(null, true);
        else cb(new Error('Sadece Excel dosyası (.xlsx/.xls) kabul edilir.'));
    }
});

const uploadOkulExcel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls)$/i)) cb(null, true);
        else cb(new Error('Sadece Excel dosyası kabul edilir.'));
    }
});

// ── Yetki kontrolü ───────────────────────────────────────────────────────────
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

// ── Admin ana sayfa ──────────────────────────────────────────────────────────
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
    const adminToken = req.headers.authorization
        ? req.headers.authorization.replace('Basic ', '')
        : Buffer.from(`${process.env.ADMIN_USER||'admin'}:${process.env.ADMIN_PASSWORD||'1234'}`).toString('base64');
    res.render('admin', {
        mod, editSoru, tumSorular, dersler,
        tumKullanicilar, filtreliKullanicilar,
        iller, ilceler, okullar,
        filIl, filIlce, filOkul,
        tumOkullar, adminToken,
        tumUniteler: await Unite.find().sort({ ders:1, uniteNo:1 })
    });
});

// ── Soru CRUD ────────────────────────────────────────────────────────────────
function soruDogrula(body) {
    if (!body.soruMetni || !body.soruMetni.trim()) return 'Soru metni boş olamaz.';
    for (var i = 0; i < 4; i++) {
        var m = body['metin' + i];
        if (!m || !m.trim()) return (String.fromCharCode(65+i) + ' şıkkı boş olamaz.');
    }
    if (body.dogruCevap === undefined || body.dogruCevap === '' || isNaN(parseInt(body.dogruCevap))) return 'Doğru cevap belirtilmeli.';
    return null;
}

router.post('/soru-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    var hata = soruDogrula(req.body);
    if (hata) return res.send("<script>alert('" + hata + "'); window.history.back();</script>");
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, unite: req.body.unite||'', soruOnculu1: req.body.soruOnculu1||'', soruOnculu1Resmi: req.body.soruOnculu1Resmi||'', soruOnculu2: req.body.soruOnculu2||'', soruOnculu2Resmi: req.body.soruOnculu2Resmi||'', soruOnculu3: req.body.soruOnculu3||'', soruOnculu3Resmi: req.body.soruOnculu3Resmi||'', soruMetni: req.body.soruMetni, sikDizilimi: req.body.sikDizilimi||'dikey', durum: req.body.durum||'taslak', tabloBaslik: req.body.tabloBaslik ? JSON.parse(req.body.tabloBaslik) : [], secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    var hata = soruDogrula(req.body);
    if (hata) return res.send("<script>alert('" + hata + "'); window.history.back();</script>");
    await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, unite: req.body.unite||'', soruOnculu1: req.body.soruOnculu1||'', soruOnculu1Resmi: req.body.soruOnculu1Resmi||'', soruOnculu2: req.body.soruOnculu2||'', soruOnculu2Resmi: req.body.soruOnculu2Resmi||'', soruOnculu3: req.body.soruOnculu3||'', soruOnculu3Resmi: req.body.soruOnculu3Resmi||'', soruMetni: req.body.soruMetni, sikDizilimi: req.body.sikDizilimi||'dikey', durum: req.body.durum||'taslak', tabloBaslik: req.body.tabloBaslik ? JSON.parse(req.body.tabloBaslik) : [], secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) });
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-istatistik-sifirla', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Soru.updateMany({}, { $set: { cozulmeSayisi: 0, dogruSayisi: 0, ortalamaSure: 0, hamPuan: null, zorlukKatsayisi: 3, cozumSureleriTum: [], dogruCevapSureleri: [] } });
        await Kullanici.updateMany({}, { $set: { soruIndex: 0 } });
        await CevapKaydi.deleteMany({});
        res.send('<script>alert("Soru istatistikleri sıfırlandı!"); window.location.href="/admin?mod=sifirla";</script>');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Kullanıcı ────────────────────────────────────────────────────────────────
router.post('/kullanici-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Kullanici.findOneAndDelete({ kullaniciAdi: req.body.kullaniciAdi });
        await CevapKaydi.deleteMany({ kullaniciAdi: req.body.kullaniciAdi });
        const params = new URLSearchParams({ mod: 'kullanicilar', il: req.body.il || '', ilce: req.body.ilce || '', okul: req.body.okul || '' }).toString();
        res.redirect('/admin?' + params);
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Veri sıfırla ─────────────────────────────────────────────────────────────
router.post('/sifirla', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Kullanici.updateMany({}, { $set: { soruIndex: 0, puan: 0, toplamSure: 0, dersPuanlari: [] } });
        await Soru.updateMany({}, { $set: { cozulmeSayisi: 0, dogruSayisi: 0, ortalamaSure: 0, hamPuan: null, zorlukKatsayisi: 3, cozumSureleriTum: [], dogruCevapSureleri: [] } });
        await CevapKaydi.deleteMany({});
        res.send('<script>alert("Tüm veriler sıfırlandı!"); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Okul CRUD ────────────────────────────────────────────────────────────────
router.get('/api/okullar', async (req, res) => {
    try {
        const { il, ilce } = req.query;
        const filtre = {};
        if (il) filtre.il = { $regex: new RegExp('^' + il.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
        if (ilce) filtre.ilce = { $regex: new RegExp('^' + ilce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
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

router.post('/okul-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Okul.findByIdAndUpdate(req.body.id, { il: req.body.il, ilce: req.body.ilce, ad: req.body.ad });
        res.redirect('/admin?mod=okullar');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/okul-kaydet', async (req, res) => {
    try {
        const { il, ilce, ad } = req.body;
        if (!il || !ilce || !ad) return res.status(400).json({ ok: false });
        const varMi = await Okul.findOne({ il, ilce, ad });
        if (!varMi) await new Okul({ il, ilce, ad }).save();
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false }); }
});

// ── Excel'den Okul Yükleme ───────────────────────────────────────────────────
router.post('/okul-excel-yukle', uploadOkulExcel.single('okulExcelDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'Excel dosyası seçilmedi.' });
        const XLSX = require('xlsx');
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const satirlar = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        const okullar = [];
        for (let i = 1; i < satirlar.length; i++) {
            const s = satirlar[i];
            if (!s || s.every(h => !h)) continue;
            const il  = s[0] ? String(s[0]).trim() : '';
            const ilce = s[1] ? String(s[1]).trim() : '';
            const ad  = s[2] ? String(s[2]).trim() : '';
            if (il && ilce && ad) okullar.push({ il, ilce, ad });
        }
        res.json({ ok: true, onizleme: okullar, toplam: okullar.length });
    } catch (err) {
        console.error('[Okul Excel Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

router.post('/okul-excel-kaydet', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { okullar, mod } = req.body;
        if (!Array.isArray(okullar) || okullar.length === 0)
            return res.status(400).json({ hata: 'Kaydedilecek okul yok.' });
        if (mod === 'sifirla') {
            await Okul.deleteMany({});
            await Okul.insertMany(okullar.map(o => ({ il: o.il, ilce: o.ilce, ad: o.ad })));
            res.json({ ok: true, eklenen: okullar.length, atlanan: 0 });
        } else {
            // Mevcut okulları çek, set olarak karşılaştır
            const mevcutlar = await Okul.find({}, 'il ilce ad');
            const mevcutSet = new Set(mevcutlar.map(o => o.il+'||'+o.ilce+'||'+o.ad));
            const yeniler = okullar.filter(o => !mevcutSet.has(o.il+'||'+o.ilce+'||'+o.ad));
            if (yeniler.length > 0) await Okul.insertMany(yeniler.map(o => ({ il: o.il, ilce: o.ilce, ad: o.ad })));
            res.json({ ok: true, eklenen: yeniler.length, atlanan: okullar.length - yeniler.length });
        }
    } catch (err) {
        console.error('[Okul Kayıt Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

// ── Excel'den Ünite/Konu Yükleme ─────────────────────────────────────────────
router.post('/unite-excel-yukle', uploadExcel.single('excelDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'Excel dosyası seçilmedi.' });
        const XLSX = require('xlsx');
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const satirlar = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        let sonSinif = '', sonDers = '', sonUnite = '', sonUniteAdi = '';
        const uniteMap = {};
        for (let i = 1; i < satirlar.length; i++) {
            const s = satirlar[i];
            if (!s || s.every(h => !h)) continue;
            const sinif    = s[0] != null ? String(s[0]).trim() : sonSinif;
            const ders     = s[1] != null ? String(s[1]).trim() : sonDers;
            const uniteStr = s[2] != null ? String(s[2]).trim() : sonUnite;
            const uniteAdi = s[3] != null ? String(s[3]).trim() : sonUniteAdi;
            const konu     = s[4] != null ? String(s[4]).trim() : '';
            if (!ders && !uniteStr && !uniteAdi) continue;
            const uniteNoEslesen = uniteStr.match(/^(\d+)/);
            const uniteNo = uniteNoEslesen ? parseInt(uniteNoEslesen[1]) : 0;
            const anahtar = `${sinif}||${ders}||${uniteNo}||${uniteAdi || uniteStr}`;
            if (!uniteMap[anahtar]) {
                uniteMap[anahtar] = { sinif, ders, uniteNo, uniteAdi: uniteAdi || uniteStr, konular: [] };
            }
            if (konu) uniteMap[anahtar].konular.push(konu);
            sonSinif = sinif; sonDers = ders; sonUnite = uniteStr; sonUniteAdi = uniteAdi;
        }
        const onizleme = Object.values(uniteMap);
        res.json({ ok: true, onizleme, toplamUnite: onizleme.length, toplamKonu: onizleme.reduce((t, u) => t + u.konular.length, 0) });
    } catch (err) {
        console.error('[Excel Yükleme Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

router.post('/unite-kaydet', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { uniteler, mod } = req.body;
        if (!Array.isArray(uniteler) || uniteler.length === 0)
            return res.status(400).json({ hata: 'Kaydedilecek ünite yok.' });
        if (mod === 'sifirla') await Unite.deleteMany({});
        const kayitlar = uniteler.map(u => ({
            ders: u.ders || 'Belirtilmedi',
            uniteNo: parseInt(u.uniteNo) || 0,
            uniteAdi: u.uniteAdi,
            konular: u.konular || []
        }));
        await Unite.insertMany(kayitlar);
        res.json({ ok: true, kaydedilen: kayitlar.length });
    } catch (err) {
        console.error('[Ünite Kayıt Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

router.post('/unite-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Unite.findByIdAndDelete(req.body.id);
        res.redirect('/admin?mod=uniteler');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Sınıfa göre ünite/konu verisi ────────────────────────────────────────────
router.get('/api/unite-bilgi', async (req, res) => {
    try {
        const { sinif } = req.query;
        let uniteler;
        if (sinif) {
            uniteler = await Unite.find({
                $or: [{ sinif: String(sinif) }, { sinif: Number(sinif) }, { sinif: '' }, { sinif: null }]
            }).sort({ ders:1, uniteNo:1 });
        } else {
            uniteler = await Unite.find().sort({ ders:1, uniteNo:1 });
        }
        const dersler = [...new Set(uniteler.map(u => u.ders).filter(Boolean))];
        res.json({ ok: true, dersler, uniteler });
    } catch (err) {
        res.status(500).json({ ok: false, hata: err.message });
    }
});

router.get('/api/soru/:id', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const s = await Soru.findById(req.params.id);
        if (!s) return res.status(404).json({ hata: 'Soru bulunamadı' });
        res.json(s);
    } catch (err) { res.status(500).json({ hata: err.message }); }
});

module.exports = router;
