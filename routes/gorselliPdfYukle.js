// routes/gorselliPdfYukle.js  —  v4.7.1  (ÇEKİRDEK)
// "Görselli PDF Yükle": mevcut PDF yükleme akışını AYNEN bırakır.
// Soru çıkarımı için mevcut  POST /pdf-analiz  (pdfyukle.js),
// kayıt için mevcut          POST /pdf-sorulari-kaydet  kullanılır.
// Bu dosyanın tek yeni sunucu işi: kırpılan görseli Cloudinary'ye yükleyip URL döndürmek.
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { gorselYukle, gorselAdresiDuzenle } = require('../services/cloudinaryYukle');

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
    // v4.17.21: varsayilan sifre yok (services/adminYetki)
    if (require('../services/adminYetki').adminBasicDogruMu(authHeader)) {
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
        // v4.17.28: Kesit yuksek cozunurlukte (ekran olceginin 2 veya 2,5 kati) cizildiyse dosya adi bunu tasir:
        //   hd_<rastgele>_d250 -> public/js/hd-gorsel.js gorseli ekranda eski boyutunda (piksel / 2,5) gosterir, keskin kalir.
        const yog = parseFloat(req.body && req.body.yogunluk);
        const secenek = {};
        if (yog === 2 || yog === 2.5) {
            secenek.publicId = 'hd_' + Date.now().toString(36) + require('crypto').randomBytes(4).toString('hex') + '_d' + Math.round(yog * 100);
        }
        // v4.17.33: kaydedilen adres beyaz zeminli (hd_ ise ayrica WebP/otomatik kalite) teslim edilir
        const url = gorselAdresiDuzenle(await gorselYukle(dataUri, 'lgs-sorular', secenek));
        res.json({ ok: true, url });
    } catch (err) {
        console.error('[Görselli PDF — Cloudinary yükleme]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
