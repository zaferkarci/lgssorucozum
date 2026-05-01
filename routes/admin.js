const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const Okul = require('../models/Okul');
const Unite = require('../models/Unite');
const CevapKaydi = require('../models/CevapKaydi');
const ReferansKodu = require('../models/ReferansKodu');
const Haber = require('../models/Haber');
let YasakliKelime = null;
try {
    YasakliKelime = require('../models/YasakliKelime');
} catch (e) {
    console.warn('[admin] models/YasakliKelime.js bulunamadı; yasaklı kelime özelliği devre dışı.');
}
const { referansKoduUret } = require('./auth');
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
    try {
    const editSoru = req.query.duzenle ? await Soru.findById(req.query.duzenle) : null;
    // Soru filtreleri
    const filSinif  = req.query.filSinif  || '';
    const filDers   = req.query.filDers   || '';
    const filUnite  = req.query.filUnite  || '';
    const filKonu   = req.query.filKonu   || '';
    const soruFiltre = {};
    if (filSinif)  soruFiltre.sinif  = filSinif;
    if (filDers)   soruFiltre.ders   = filDers;
    if (filUnite)  soruFiltre.unite  = filUnite;
    if (filKonu)   soruFiltre.konu   = filKonu;
    const tumSorular = await Soru.collection.find(soruFiltre).sort({ soruNo: 1 }).toArray();
    const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "T.C. İnkılâp Tarihi", "İngilizce", "Din Kültürü"];
    const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');
    // Kullanıcı filtreleri
    const filIl = req.query.il || '';
    const filIlce = req.query.ilce || '';
    const filOkul = req.query.okul || '';
    const tumKullanicilar = await Kullanici.find({}, 'kullaniciAdi puan soruIndex sinif il ilce okul rol');
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
    const tumReferanslar = mod === 'referans' ? await ReferansKodu.find().sort({ olusturmaTarih: -1 }).lean() : [];
    const yasakliKelimeler = (mod === 'kullanicilar' && YasakliKelime) ? await YasakliKelime.find().sort({ _id: -1 }).lean() : [];
    const tumHaberler = (mod === 'haberler') ? await Haber.find().sort({ yayinTarih: -1 }).lean() : [];
    // Filtre seçenekleri için mevcut değerler
    const tumSoruSiniflar = [...new Set((await Soru.find({}, 'sinif').lean()).map(s => s.sinif).filter(Boolean))].sort();
    const tumSoruDersler  = [...new Set((await Soru.find(filSinif ? {sinif:filSinif} : {}, 'ders').lean()).map(s => s.ders).filter(Boolean))].sort();
    const tumSoruUniteler = [...new Set((await Soru.find({...(filSinif&&{sinif:filSinif}), ...(filDers&&{ders:filDers})}, 'unite').lean()).map(s => s.unite).filter(Boolean))].sort();
    const tumSoruKonular  = [...new Set((await Soru.find({...(filSinif&&{sinif:filSinif}), ...(filDers&&{ders:filDers}), ...(filUnite&&{unite:filUnite})}, 'konu').lean()).map(s => s.konu).filter(Boolean))].sort();
    res.render('admin', {
        mod, editSoru, tumSorular, dersler,
        tumKullanicilar, filtreliKullanicilar,
        iller, ilceler, okullar,
        filIl, filIlce, filOkul,
        filSinif, filDers, filUnite, filKonu,
        tumSoruSiniflar, tumSoruDersler, tumSoruUniteler, tumSoruKonular,
        tumOkullar, adminToken,
        tumUniteler: await Unite.find().sort({ ders:1, uniteNo:1 }),
        tumReferanslar, yasakliKelimeler, tumHaberler
    });
    } catch (err) {
        console.error('[/admin] HATA:', err);
        res.status(500).send('<pre style="font-family:monospace; padding:20px; background:#fee; border:1px solid #f99;">'
            + '<b>Admin Sayfası Hatası</b>\n\n'
            + 'Mod: ' + (req.query.mod || '(yok)') + '\n\n'
            + 'Mesaj: ' + (err.message || err) + '\n\n'
            + 'Stack:\n' + (err.stack || '') + '</pre>');
    }
});

// ── Soru CRUD ────────────────────────────────────────────────────────────────
function soruDogrula(body) {
    if (!body.soruMetni || !body.soruMetni.trim()) return 'Soru metni boş olamaz.';
    for (var i = 0; i < 4; i++) {
        var m = (body['metin' + i] || '').trim();
        var g = (body['gorsel' + i] || '').trim();
        if (!m && !g) return (String.fromCharCode(65+i) + ' şıkkı boş olamaz. Metin veya görsel girin.');
    }
    if (body.dogruCevap === undefined || body.dogruCevap === '' || isNaN(parseInt(body.dogruCevap))) return 'Doğru cevap belirtilmeli.';
    return null;
}

router.post('/soru-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    var hata = soruDogrula(req.body);
    if (hata) return res.send("<script>alert('" + hata + "'); window.history.back();</script>");
    // soruNo: max + 1
    const maxSoru = await Soru.findOne().sort({ soruNo: -1 }).select('soruNo').lean();
    const yeniNo = (maxSoru && maxSoru.soruNo) ? maxSoru.soruNo + 1 : 1;
    await new Soru({ soruNo: yeniNo, sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, unite: req.body.unite||'', soruOnculu1: req.body.soruOnculu1||'', soruOnculu1Resmi: req.body.soruOnculu1Resmi||'', soruOnculu2: req.body.soruOnculu2||'', soruOnculu2Resmi: req.body.soruOnculu2Resmi||'', soruOnculu3: req.body.soruOnculu3||'', soruOnculu3Resmi: req.body.soruOnculu3Resmi||'', soruMetni: req.body.soruMetni, sikDizilimi: req.body.sikDizilimi||'dikey', durum: req.body.durum||'taslak', tabloBaslik: req.body.tabloBaslik ? JSON.parse(req.body.tabloBaslik) : [], secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    var hata = soruDogrula(req.body);
    if (hata) return res.send("<script>alert('" + hata + "'); window.history.back();</script>");
    var ekGuncelleme = {};
    if (req.body.durum === 'yayinda') ekGuncelleme.yayinTarih = new Date();
    // Numarasız soruya numara ata (özellikle PDF'den gelen taslakta soruNo yoksa)
    const mevcut = await Soru.findById(req.body.id).select('soruNo').lean();
    if (!mevcut || !mevcut.soruNo) {
        const maxSoru = await Soru.findOne({ soruNo: { $exists: true, $ne: null } }).sort({ soruNo: -1 }).select('soruNo').lean();
        ekGuncelleme.soruNo = (maxSoru && maxSoru.soruNo) ? maxSoru.soruNo + 1 : 1;
    }
    await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, unite: req.body.unite||'', soruOnculu1: req.body.soruOnculu1||'', soruOnculu1Resmi: req.body.soruOnculu1Resmi||'', soruOnculu2: req.body.soruOnculu2||'', soruOnculu2Resmi: req.body.soruOnculu2Resmi||'', soruOnculu3: req.body.soruOnculu3||'', soruOnculu3Resmi: req.body.soruOnculu3Resmi||'', soruMetni: req.body.soruMetni, sikDizilimi: req.body.sikDizilimi||'dikey', durum: req.body.durum||'taslak', tabloBaslik: req.body.tabloBaslik ? JSON.parse(req.body.tabloBaslik) : [], secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap), ...ekGuncelleme });
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

// TEK SEFERLİK MIGRATION v4 — çalıştır sonra sil
router.post('/referans-uret', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const adet = Math.min(parseInt(req.body.adet) || 1, 500);
        const tip = (req.body.tip === 'ogretmen') ? 'ogretmen' : 'ogrenci';
        await referansKoduUret('admin', adet, tip);
        res.redirect('/admin?mod=referans');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// ── Haberler & Duyurular CRUD ──
router.post('/haber-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const baslik = (req.body.baslik || '').trim();
        const icerik = (req.body.icerik || '').trim();
        if (!baslik || !icerik) {
            return res.send("<script>alert('Başlık ve içerik boş olamaz.'); window.history.back();</script>");
        }
        await new Haber({ baslik, icerik, olusturan: 'admin' }).save();
        res.redirect('/admin?mod=haberler');
    } catch (err) {
        console.error('[haber-ekle] hata:', err.message);
        res.status(500).send("Hata: " + err.message);
    }
});

router.post('/haber-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Haber.deleteOne({ _id: req.body.id });
        res.redirect('/admin?mod=haberler');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/haber-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const baslik = (req.body.baslik || '').trim();
        const icerik = (req.body.icerik || '').trim();
        if (!baslik || !icerik) {
            return res.send("<script>alert('Başlık ve içerik boş olamaz.'); window.history.back();</script>");
        }
        await Haber.updateOne({ _id: req.body.id }, { baslik, icerik });
        res.redirect('/admin?mod=haberler');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Genel kullanıcılar için haberleri JSON döner (panel sekmesinde gösterilir)
router.get('/api/haberler', async (req, res) => {
    try {
        const liste = await Haber.find().sort({ yayinTarih: -1 }).limit(50).lean();
        res.json({ ok: true, haberler: liste });
    } catch (err) {
        res.json({ ok: false, hata: err.message });
    }
});

router.post('/referans-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await ReferansKodu.deleteOne({ _id: req.body.id, kullanildi: false });
        res.redirect('/admin?mod=referans');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/referans-toplu-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await ReferansKodu.deleteMany({ kullanildi: false });
        res.redirect('/admin?mod=referans');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Admin: referans linki kopyalandı bildirimi (kalıcı işaretle)
router.post('/admin-referans-kopyalandi', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    console.log('[admin-referans-kopyalandi] istek:', { kod: req.body && req.body.kod });
    try {
        const kod = (req.body.kod || '').trim();
        if (!kod) return res.status(400).json({ ok: false, hata: 'kod_bos' });
        const ref = await ReferansKodu.findOne({ kod });
        if (!ref) {
            console.warn('[admin-referans-kopyalandi] kod bulunamadı:', kod);
            return res.status(404).json({ ok: false, hata: 'kod_bulunamadi' });
        }
        if (!ref.kopyalandi) {
            ref.kopyalandi = true;
            ref.kopyalanmaTarih = new Date();
            await ref.save();
            console.log('[admin-referans-kopyalandi] kalıcı işaretlendi:', kod);
        } else {
            // Zaten işaretliyse de tarihi güncelle (admin'in son kopyalama zamanı)
            ref.kopyalanmaTarih = new Date();
            await ref.save();
            console.log('[admin-referans-kopyalandi] tarih güncellendi:', kod);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('[admin-referans-kopyalandi] hata:', err && err.stack || err);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Numarasız soruları onar — _id sırasıyla soruNo atar
router.post('/soru-no-onar', async (req, res) => {    if (!adminKontrol(req, res)) return;
    try {
        const numarasiz = await Soru.find({ $or: [{ soruNo: { $exists: false } }, { soruNo: null }] }).sort({ _id: 1 }).select('_id soruNo durum sinif ders');
        console.log('[soru-no-onar] numarasız bulunan:', numarasiz.length);
        if (numarasiz.length === 0) {
            return res.send('<script>alert("Numarasız soru yok, hepsi düzgün."); window.location.href="/admin?mod=soruListesi";</script>');
        }
        const maxSoru = await Soru.findOne({ soruNo: { $exists: true, $ne: null } }).sort({ soruNo: -1 }).select('soruNo').lean();
        let baslangic = (maxSoru && maxSoru.soruNo) ? maxSoru.soruNo + 1 : 1;
        console.log('[soru-no-onar] başlangıç numarası:', baslangic, '| mevcut max:', maxSoru ? maxSoru.soruNo : 'yok');
        let basariliSayi = 0, hataliSayi = 0;
        for (const s of numarasiz) {
            try {
                const sonuc = await Soru.collection.updateOne({ _id: s._id }, { $set: { soruNo: baslangic } });
                console.log('  →', s._id.toString(), '| #'+baslangic, '| matched:', sonuc.matchedCount, '| modified:', sonuc.modifiedCount, '|', s.sinif, s.ders, s.durum);
                if (sonuc.modifiedCount > 0) basariliSayi++;
                else hataliSayi++;
                baslangic++;
            } catch (e) {
                console.error('  ❌', s._id.toString(), '| hata:', e.message);
                hataliSayi++;
            }
        }
        console.log('[soru-no-onar] tamamlandı | başarılı:', basariliSayi, '| başarısız:', hataliSayi);
        const mesaj = basariliSayi + ' soruya numara atandı.' + (hataliSayi > 0 ? ' (' + hataliSayi + ' başarısız - log\\u0027a bak)' : '');
        res.send('<script>alert("' + mesaj + '"); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) {
        console.error('[soru-no-onar] hata:', err && err.stack || err);
        res.status(500).send("Hata: " + err.message);
    }
});

// LaTeX backslash onarımı: $rac{ → $\frac{, $qrt{ → $\sqrt{ vb.
// PDF yükleme sırasında JSON parse'ın yutmuş olduğu \f \b \v karakterlerini geri getirir
router.post('/soru-latex-onar', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const sorular = await Soru.find({});
        const onarKomut = function(metin) {
            if (!metin || typeof metin !== 'string') return { metin: metin, degisti: false };
            let yeni = metin;
            // $ ... $ blokları içinde kayıp backslash'ları geri ekle
            // \frac yutulmuş: rac{...}{...}  →  \frac{...}{...}
            yeni = yeni.replace(/\$([^$]*)\$/g, function(blok, ic) {
                let d = ic
                    .replace(/(^|[^a-zA-Z\\])rac\{/g, '$1\\frac{')
                    .replace(/(^|[^a-zA-Z\\])qrt\{/g, '$1\\sqrt{')
                    .replace(/(^|[^a-zA-Z\\])qrt\[/g, '$1\\sqrt[')
                    .replace(/(^|[^a-zA-Z\\])inom\{/g, '$1\\binom{')
                    .replace(/(^|[^a-zA-Z\\])oxed\{/g, '$1\\boxed{')
                    .replace(/(^|[^a-zA-Z\\])eta\b/g, '$1\\beta')
                    .replace(/(^|[^a-zA-Z\\])orall\b/g, '$1\\forall');
                return '$' + d + '$';
            });
            return { metin: yeni, degisti: yeni !== metin };
        };
        let degisen = 0, taranan = 0;
        for (const s of sorular) {
            taranan++;
            let degistiBu = false;
            ['soruMetni','soruOnculu1','soruOnculu2','soruOnculu3'].forEach(function(alan) {
                const r = onarKomut(s[alan]);
                if (r.degisti) { s[alan] = r.metin; degistiBu = true; }
            });
            if (Array.isArray(s.secenekler)) {
                s.secenekler.forEach(function(sik) {
                    const r = onarKomut(sik.metin);
                    if (r.degisti) { sik.metin = r.metin; degistiBu = true; }
                });
                if (degistiBu) s.markModified('secenekler');
            }
            if (degistiBu) { await s.save(); degisen++; }
        }
        console.log('[soru-latex-onar] taranan: %d | onarılan: %d', taranan, degisen);
        res.send('<script>alert("' + degisen + ' soruda LaTeX onarıldı (toplam ' + taranan + ' tarandı)."); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) {
        console.error('[soru-latex-onar] hata:', err && err.stack || err);
        res.status(500).send("Hata: " + err.message);
    }
});

router.post('/kullanici-rol', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { kullaniciAdi, il, ilce, okul, yeniRol: yeniRolForm } = req.body;
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send('Kullanıcı bulunamadı');
        // Form'dan gelen geçerli bir rol varsa onu kullan; yoksa eski toggle davranışı
        const gecerliRoller = ['ogrenci', 'ogretmen', 'moderator'];
        let yeniRol;
        if (gecerliRoller.indexOf(yeniRolForm) !== -1) {
            yeniRol = yeniRolForm;
        } else {
            // Geriye dönük: form'da yeniRol yoksa moderator toggle (eski Mod Al/Ver davranışı)
            yeniRol = (k.rol === 'moderator') ? 'ogrenci' : 'moderator';
        }
        await Kullanici.updateOne({ kullaniciAdi }, { rol: yeniRol });
        const params = new URLSearchParams({ mod: 'kullanicilar' });
        if (il) params.set('il', il);
        if (ilce) params.set('ilce', ilce);
        if (okul) params.set('okul', okul);
        res.redirect('/admin?' + params.toString());
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.get('/kullanici-detay', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const k = await Kullanici.findOne({ kullaniciAdi: req.query.kullaniciAdi });
        if (!k) return res.status(404).send('Kullanıcı bulunamadı');
        const CevapKaydi = require('../models/CevapKaydi');
        const Soru = require('../models/Soru');
        const tumCevaplar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }).sort({ tarih: -1 }).lean();
        const soruIdleri = [...new Set(tumCevaplar.map(c => String(c.soruId)))];
        const sorular = soruIdleri.length > 0 ? await Soru.find({ _id: { $in: soruIdleri } }, 'ders unite konu soruMetni _id').lean() : [];
        const soruMap = {};
        sorular.forEach(s => { soruMap[String(s._id)] = s; });
        const tumOkullar = await Okul.find().sort({ il: 1, ilce: 1, ad: 1 });
        const iller = [...new Set(tumOkullar.map(o => o.il).filter(Boolean))].sort();
        res.render('admin-kullanici-detay', { k, tumCevaplar, soruMap, tumOkullar, iller, adminToken: req.headers.authorization ? req.headers.authorization.replace('Basic ', '') : '' });
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/kullanici-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { kullaniciAdi, il, ilce, okul, sinif, sube } = req.body;
        await Kullanici.updateOne({ kullaniciAdi }, { il, ilce, okul, sinif: parseInt(sinif)||8, sube: sube||'' });
        res.redirect('/kullanici-detay?kullaniciAdi=' + encodeURIComponent(kullaniciAdi));
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Kullanıcının rolünü değiştir (ogrenci ↔ ogretmen)
router.post('/kullanici-rol-degistir', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { kullaniciAdi, yeniRol } = req.body;
        const gecerliRoller = ['ogrenci', 'ogretmen', 'moderator'];
        if (!gecerliRoller.includes(yeniRol)) return res.status(400).send('Geçersiz rol.');
        const sonuc = await Kullanici.updateOne({ kullaniciAdi }, { rol: yeniRol });
        if (sonuc.matchedCount === 0) return res.status(404).send('Kullanıcı bulunamadı.');
        const geri = req.body.geri || '/admin?mod=kullanicilar';
        res.redirect(geri);
    } catch (err) {
        console.error('[kullanici-rol-degistir] hata:', err.message);
        res.status(500).send("Hata: " + err.message);
    }
});

router.post('/yasakli-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    if (!YasakliKelime) return res.redirect('/admin?mod=kullanicilar');
    try {
        const kelime = (req.body.kelime || '').trim().toLowerCase();
        if (kelime) await YasakliKelime.updateOne({ kelime }, { kelime }, { upsert: true });
        res.redirect('/admin?mod=kullanicilar');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/yasakli-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    if (!YasakliKelime) return res.redirect('/admin?mod=kullanicilar');
    try {
        await YasakliKelime.deleteOne({ _id: req.body.id });
        res.redirect('/admin?mod=kullanicilar');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

module.exports = router;
