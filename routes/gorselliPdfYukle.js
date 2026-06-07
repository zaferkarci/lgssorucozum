// routes/gorselliPdfYukle.js  —  v4.7.1  (ÇEKİRDEK)
// "Görselli PDF Yükle": mevcut PDF yükleme akışını AYNEN bırakır.
// Soru çıkarımı için mevcut  POST /pdf-analiz  (pdfyukle.js),
// kayıt için mevcut          POST /pdf-sorulari-kaydet  kullanılır.
// Bu dosyanın tek yeni sunucu işi: kırpılan görseli Cloudinary'ye yükleyip URL döndürmek.
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { gorselYukle } = require('../services/cloudinaryYukle');

// Kırpılan görseli multipart olarak alır (global express.json 100KB limitini baypas eder)
const gorselUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});

// pdfyukle.js'teki ile birebir aynı session-aware admin kontrolü.
// (Mevcut dosya el değmesin diye kopyalandı; ortak servise almak istersen sonra refactor ederiz.)
function adminKontrol(req, res) {
    if (req.session && req.session.adminGirisli === true) return true;
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        res.status(401).send('Giriş gerekli!');
        return false;
    }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') &&
        pass === (process.env.ADMIN_PASSWORD || '1234')) {
        if (req.session) req.session.adminGirisli = true;
        return true;
    }
    res.status(401).send('Yetkisiz!');
    return false;
}

// Sayfayı aç
router.get('/admin/gorselli-pdf-yukle', (req, res) => {
    if (!adminKontrol(req, res)) return;
    res.render('gorselli-pdf-yukle');
});

// Kırpılan görseli Cloudinary'ye yükle → URL döndür (multipart: alan adı 'gorsel')
router.post('/gorselli-gorsel-yukle', gorselUpload.single('gorsel'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file || !req.file.buffer) return res.status(400).json({ hata: 'Görsel verisi gelmedi.' });
        const dataUri = 'data:' + (req.file.mimetype || 'image/png') + ';base64,' + req.file.buffer.toString('base64');
        const url = await gorselYukle(dataUri);
        res.json({ ok: true, url });
    } catch (err) {
        console.error('[Görselli PDF — Cloudinary yükleme]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
