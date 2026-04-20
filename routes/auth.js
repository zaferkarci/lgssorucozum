const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Kullanici = require('../models/Kullanici');

const SALT_ROUNDS = 10;

router.get('/', (req, res) => {
    res.render('giris');
});

router.get('/kayit', (req, res) => {
    res.render('kayit');
});

router.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, sinif, sube, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        const hash = await bcrypt.hash(sifre, SALT_ROUNDS);
        await new Kullanici({ kullaniciAdi, sifre: hash, sinif, sube: sube||'', il, ilce, okul }).save();
        res.send("<script>alert('Başarılı!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/giris', async (req, res) => {
    try {
        const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi });
        if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
        const eslesti = await bcrypt.compare(req.body.sifre, k.sifre);
        if (!eslesti) return res.send("<script>alert('Hata!'); window.history.back();</script>");
        req.session.kullaniciAdi = k.kullaniciAdi;
        res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi));
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.get('/cikis', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
