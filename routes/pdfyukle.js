// ─── PDF'den Toplu Soru Yükleme — v3.0.0 ────────────────────────────────────
// OpenRouter API — birden fazla ücretsiz model dener, biri tutarsa geçer.

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const Soru    = require('../models/Soru');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Sadece PDF dosyası kabul edilir.'));
    }
});

// Sırayla denenen ücretsiz modeller
const MODELLER = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-3-27b-it:free',
    'microsoft/phi-3-medium-128k-instruct:free',
    'openchat/openchat-7b:free'
];

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

// PDF'den metin çıkar
function pdfMetniCikar(buffer) {
    const str = buffer.toString('latin1');
    const satirlar = [];
    const regex = /\(([^\)]{2,200})\)/g;
    let m;
    while ((m = regex.exec(str)) !== null) {
        const metin = m[1]
            .replace(/\\n/g, '\n').replace(/\\r/g, '')
            .replace(/\\t/g, ' ').replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')').replace(/\\\\/g, '\\').trim();
        if (metin.length > 2) satirlar.push(metin);
    }
    return satirlar.join('\n');
}

// Tek model ile deneme
async function modelDene(apiKey, model, prompt) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.SITE_URL || 'https://lgs-hazirlik.onrender.com',
            'X-Title': 'LGS Hazirlik'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 8000,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const hata = await response.text();
        throw new Error(`[${model}] ${response.status}: ${hata.slice(0, 200)}`);
    }

    const veri = await response.json();
    const metin = veri?.choices?.[0]?.message?.content || '';
    if (!metin) throw new Error(`[${model}] Boş yanıt`);
    return metin;
}

// Tüm modelleri sırayla dene
async function pdfdenSorulariCikar(pdfBuffer, sinif, ders, konu) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY tanımlı değil.');

    const pdfMetni = pdfMetniCikar(pdfBuffer);
    if (!pdfMetni || pdfMetni.length < 50)
        throw new Error('PDF içeriği okunamadı. Metin tabanlı (taranmamış) PDF yükleyin.');

    const PROMPT = `Sen bir eğitim içeriği analiz uzmanısın.
Aşağıdaki metindeki çok şıklı soruları JSON formatında çıkar.
Her soru: soruOnculu (önceki metin, yoksa ""), soruResmi ("" veya "[GÖRSEL VAR]"), soruMetni (HTML destekli), secenekler (4 eleman: [{metin,gorsel}]), dogruCevapIndex (0-3, yoksa -1).
SADECE JSON array döndür, başka hiçbir şey yazma:
[{"soruOnculu":"","soruResmi":"","soruMetni":"...","secenekler":[{"metin":"...","gorsel":""},{"metin":"...","gorsel":""},{"metin":"...","gorsel":""},{"metin":"...","gorsel":""}],"dogruCevapIndex":0}]
Bilgi: Sınıf=${sinif}, Ders=${ders}, Konu=${konu || 'Belirtilmedi'}
METİN:
${pdfMetni.slice(0, 10000)}`;

    let sonHata = '';
    for (const model of MODELLER) {
        try {
            console.log(`[PDF] Deneniyor: ${model}`);
            const metin = await modelDene(apiKey, model, PROMPT);
            const temiz = metin.replace(/```json|```/g, '').trim();
            const bas = temiz.indexOf('[');
            const son = temiz.lastIndexOf(']');
            if (bas === -1 || son === -1) throw new Error('JSON bulunamadı');
            const sorular = JSON.parse(temiz.slice(bas, son + 1));
            console.log(`[PDF] Başarılı: ${model}, ${sorular.length} soru`);
            return sorular;
        } catch (err) {
            console.warn(`[PDF] Başarısız: ${err.message}`);
            sonHata = err.message;
            // Kısa bekleme sonra sıradakini dene
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error('Tüm modeller başarısız oldu. Son hata: ' + sonHata);
}

// POST: PDF yükle ve analiz et
router.post('/pdf-analiz', upload.single('pdfDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'PDF seçilmedi.' });
        const { sinif, ders, konu } = req.body;
        const sorular = await pdfdenSorulariCikar(req.file.buffer, sinif, ders, konu);
        const zenginSorular = sorular.map((s, i) => ({
            ...s, sinif: sinif||'8', ders: ders||'Matematik', konu: konu||'', _gecici_id: i
        }));
        res.json({ ok: true, sorular: zenginSorular, toplamSoru: zenginSorular.length });
    } catch (err) {
        console.error('[PDF Analiz Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

// POST: Kaydet
router.post('/pdf-sorulari-kaydet', express.json({ limit: '10mb' }), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { sorular } = req.body;
        if (!Array.isArray(sorular) || sorular.length === 0)
            return res.status(400).json({ hata: 'Kaydedilecek soru yok.' });
        const kayitlar = sorular.map(s => ({
            sinif: s.sinif, ders: s.ders, konu: s.konu||'',
            soruOnculu: s.soruOnculu||'', soruResmi: s.soruResmi||'',
            soruMetni: s.soruMetni,
            secenekler: (s.secenekler||[]).map(se => ({ metin: se.metin||'', gorsel: se.gorsel||'' })),
            dogruCevapIndex: parseInt(s.dogruCevapIndex) >= 0 ? parseInt(s.dogruCevapIndex) : 0
        }));
        await Soru.insertMany(kayitlar);
        res.json({ ok: true, kaydedilen: kayitlar.length });
    } catch (err) {
        console.error('[Kayıt Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
