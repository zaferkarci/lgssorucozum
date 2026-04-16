const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');

router.get('/', (req, res) => {
    res.render('giris');
});

router.get('/kayit', (req, res) => {
    res.render('kayit');
});

router.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, sinif, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        await new Kullanici({ kullaniciAdi, sifre, sinif, il, ilce, okul }).save();
        res.send("<script>alert('Başarılı!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
    res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi));
});

module.exports = router;
