// ─── PDF'den Toplu Soru Yükleme — v3.0.0 ────────────────────────────────────
// Gemini 2.0 Flash API kullanır — günde 1500 istek ücretsiz, kart gerekmez.

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const Soru    = require('../models/Soru');

// PDF bellekte tutulur, diske yazılmaz
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Sadece PDF dosyası kabul edilir.'));
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
    if (user === (process.env.ADMIN_USER || 'admin') &&
        pass === (process.env.ADMIN_PASSWORD || '1234')) return true;
    res.status(401).send('Yetkisiz!');
    return false;
}

// ── Gemini API çağrısı ───────────────────────────────────────────────────────
async function pdfdenSorulariCikar(pdfBase64, sinif, ders, konu) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable tanımlı değil.');

    const PROMPT = `Sen bir eğitim içeriği analiz uzmanısın.
Sana verilen PDF'deki çok şıklı soruları analiz et ve her soruyu JSON formatında çıkar.
Her soru için şu alanları doldur:
- soruOnculu: Sorudan önce gelen paragraf/metin/tablo (yoksa boş string)
- soruResmi: Soruda resim/görsel referansı varsa "[GÖRSEL VAR]" yaz, yoksa boş string
- soruMetni: Soru kökü (tam metin, HTML desteklenir: sup, sub, b, i tagları kullanabilirsin)
- secenekler: 4 elemanlı dizi, her eleman { "metin": "...", "gorsel": "" }
- dogruCevapIndex: Doğru şık indexi (0=A, 1=B, 2=C, 3=D). Cevap anahtarı yoksa -1 yaz.

Matematiksel ifadeleri HTML ile göster (örn: x üzeri 2 için x<sup>2</sup>).

SADECE JSON array döndür, başka hiçbir şey yazma, markdown kullanma.

Bilgi: Sinif=${sinif}, Ders=${ders}, Konu=${konu || 'Belirtilmedi'}`;

    const body = {
        contents: [{
            parts: [
                { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
                { text: PROMPT }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
        }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const hata = await response.text();
        throw new Error('Gemini API hatasi: ' + hata);
    }

    const veri = await response.json();
    const metin = veri?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!metin) throw new Error('Gemini bos yanit dondurdu.');

    const temiz = metin.replace(/```json|```/g, '').trim();
    const bas = temiz.indexOf('[');
    const son = temiz.lastIndexOf(']');
    if (bas === -1 || son === -1) throw new Error('Gemini gecerli JSON dondürmedi: ' + temiz.slice(0, 300));
    return JSON.parse(temiz.slice(bas, son + 1));
}

// ── POST: PDF yukle ve analiz et ─────────────────────────────────────────────
router.post('/pdf-analiz', upload.single('pdfDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'PDF dosyasi secilmedi.' });
        const { sinif, ders, konu } = req.body;
        const pdfBase64 = req.file.buffer.toString('base64');
        const sorular = await pdfdenSorulariCikar(pdfBase64, sinif, ders, konu);
        const zenginSorular = sorular.map((s, i) => ({
            ...s,
            sinif: sinif || '8',
            ders:  ders  || 'Matematik',
            konu:  konu  || '',
            _gecici_id: i
        }));
        res.json({ ok: true, sorular: zenginSorular, toplamSoru: zenginSorular.length });
    } catch (err) {
        console.error('[PDF Analiz Hatasi]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

// ── POST: Onaylanan sorulari veritabanina kaydet ──────────────────────────────
router.post('/pdf-sorulari-kaydet', express.json({ limit: '10mb' }), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { sorular } = req.body;
        if (!Array.isArray(sorular) || sorular.length === 0)
            return res.status(400).json({ hata: 'Kaydedilecek soru yok.' });

        const kayitlar = sorular.map(s => ({
            sinif:           s.sinif,
            ders:            s.ders,
            konu:            s.konu        || '',
            soruOnculu:      s.soruOnculu  || '',
            soruResmi:       s.soruResmi   || '',
            soruMetni:       s.soruMetni,
            secenekler:      (s.secenekler || []).map(se => ({
                                 metin:  se.metin  || '',
                                 gorsel: se.gorsel || ''
                             })),
            dogruCevapIndex: parseInt(s.dogruCevapIndex) >= 0 ? parseInt(s.dogruCevapIndex) : 0
        }));

        await Soru.insertMany(kayitlar);
        res.json({ ok: true, kaydedilen: kayitlar.length });
    } catch (err) {
        console.error('[Kayit Hatasi]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
