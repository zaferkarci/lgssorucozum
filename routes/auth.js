const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Kullanici = require('../models/Kullanici');
const PasswordReset = require('../models/PasswordReset');
const { sifreSifirlamaMailiGonder } = require('../mailGonder');

const SALT_ROUNDS = 10;

router.get('/', (req, res) => {
    res.render('giris');
});

router.get('/kayit', (req, res) => {
    res.render('kayit');
});

router.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, email, sifre, sifreTekrar, sinif, sube, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        const hash = await bcrypt.hash(sifre, SALT_ROUNDS);
        await new Kullanici({ kullaniciAdi, email: email||'', sifre: hash, sinif, sube: sube||'', il, ilce, okul }).save();
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

// Şifremi unuttum — mail adresi formu
router.get('/sifremi-unuttum', (req, res) => {
    res.render('sifremi-unuttum');
});

// Şifremi unuttum — mail gönder
router.post('/sifremi-unuttum', async (req, res) => {
    const { email } = req.body;
    try {
        const k = await Kullanici.findOne({ email: email });
        // Güvenlik: kullanıcı bulunmasa da aynı mesajı göster (mail sızıntısı önleme)
        if (k) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
            await new PasswordReset({
                kullaniciAdi: k.kullaniciAdi,
                email: k.email,
                token: token,
                expires: expires
            }).save();
            const baseUrl = process.env.SITE_URL || ('https://' + req.get('host'));
            const link = baseUrl.replace(/\/$/, '') + '/sifre-yenile/' + token;
            try {
                await sifreSifirlamaMailiGonder(k.email, k.kullaniciAdi, link);
            } catch (mailErr) {
                console.error('Mail gönderim hatası:', mailErr.message);
            }
        }
        res.send("<script>alert('Eğer bu e-posta sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Lütfen mail kutunuzu kontrol edin.'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Şifre yenileme — token ile form göster
router.get('/sifre-yenile/:token', async (req, res) => {
    try {
        const kayit = await PasswordReset.findOne({ token: req.params.token });
        if (!kayit) return res.send("<script>alert('Geçersiz veya süresi dolmuş bağlantı.'); window.location.href='/';</script>");
        if (kayit.expires < new Date()) {
            await PasswordReset.deleteOne({ _id: kayit._id });
            return res.send("<script>alert('Bağlantının süresi dolmuş. Lütfen tekrar deneyin.'); window.location.href='/sifremi-unuttum';</script>");
        }
        res.render('sifre-yenile', { token: kayit.token, kullaniciAdi: kayit.kullaniciAdi });
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Şifre yenileme — yeni şifreyi kaydet
router.post('/sifre-yenile', async (req, res) => {
    const { token, yeniSifre, yeniSifreTekrar } = req.body;
    if (yeniSifre !== yeniSifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    if (!yeniSifre || yeniSifre.length < 4) return res.send("<script>alert('Şifre en az 4 karakter olmalı.'); window.history.back();</script>");
    try {
        const kayit = await PasswordReset.findOne({ token: token });
        if (!kayit) return res.send("<script>alert('Geçersiz bağlantı.'); window.location.href='/';</script>");
        if (kayit.expires < new Date()) {
            await PasswordReset.deleteOne({ _id: kayit._id });
            return res.send("<script>alert('Bağlantının süresi dolmuş.'); window.location.href='/sifremi-unuttum';</script>");
        }
        const hash = await bcrypt.hash(yeniSifre, SALT_ROUNDS);
        await Kullanici.updateOne({ kullaniciAdi: kayit.kullaniciAdi }, { sifre: hash });
        await PasswordReset.deleteOne({ _id: kayit._id });
        res.send("<script>alert('Şifreniz güncellendi! Giriş yapabilirsiniz.'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

module.exports = router;
