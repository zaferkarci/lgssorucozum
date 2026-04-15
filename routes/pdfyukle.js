// ─── PDF'den Toplu Soru Yükleme — v3.0.0 ────────────────────────────────────
// OpenRouter API kullanır — ücretsiz modeller mevcut, kart gerekmez.

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

// ── PDF'i metne çevir (base64 → metin) ───────────────────────────────────────
// OpenRouter görsel/PDF desteklemediği için PDF'i önce metne çeviriyoruz
async function pdfBase64tenMetinCikar(pdfBase64) {
    // Node.js built-in ile basit metin çıkarma
    const buffer = Buffer.from(pdfBase64, 'base64');
    const str = buffer.toString('latin1');
    
    // PDF içindeki okunabilir metin bloklarını çıkar
    const satirlar = [];
    const regex = /\(([^\)]{2,200})\)/g;
    let eslesen;
    while ((eslesen = regex.exec(str)) !== null) {
        const metin = eslesen[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .trim();
        if (metin.length > 2) satirlar.push(metin);
    }
    return satirlar.join('\n');
}

// ── OpenRouter API çağrısı ───────────────────────────────────────────────────
async function pdfdenSorulariCikar(pdfBase64, sinif, ders, konu) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable tanımlı değil.');

    // PDF metnini çıkar
    const pdfMetni = await pdfBase64tenMetinCikar(pdfBase64);
    if (!pdfMetni || pdfMetni.length < 50) {
        throw new Error('PDF içeriği okunamadı. Lütfen metin tabanlı (taranmış olmayan) bir PDF yükleyin.');
    }

    const PROMPT = `Sen bir eğitim içeriği analiz uzmanısın.
Aşağıdaki PDF metnindeki çok şıklı soruları analiz et ve her soruyu JSON formatında çıkar.

Her soru için şu alanları doldur:
- soruOnculu: Sorudan önce gelen paragraf/metin/tablo (yoksa boş string "")
- soruResmi: Soruda resim/görsel referansı varsa "[GÖRSEL VAR]" yaz, yoksa ""
- soruMetni: Soru kökü tam metin (HTML desteklenir: <sup>, <sub>, <b>, <i>)
- secenekler: 4 elemanlı dizi [{"metin":"...","gorsel":""},...]
- dogruCevapIndex: Doğru şık indexi (0=A,1=B,2=C,3=D). Yoksa -1.

SADECE JSON array döndür, başka hiçbir şey yazma:
[{"soruOnculu":"","soruResmi":"","soruMetni":"...","secenekler":[{"metin":"...","gorsel":""},{"metin":"...","gorsel":""},{"metin":"...","gorsel":""},{"metin":"...","gorsel":""}],"dogruCevapIndex":0}]

Bilgi: Sınıf=${sinif}, Ders=${ders}, Konu=${konu || 'Belirtilmedi'}

PDF METNİ:
${pdfMetni.slice(0, 12000)}`;

    const body = {
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: PROMPT }],
        max_tokens: 8000,
        temperature: 0.1
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.SITE_URL || 'https://lgs-hazirlik.onrender.com',
            'X-Title': 'LGS Hazirlik'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const hata = await response.text();
        throw new Error('OpenRouter API hatası: ' + hata);
    }

    const veri = await response.json();
    const metin = veri?.choices?.[0]?.message?.content || '';
    if (!metin) throw new Error('API boş yanıt döndürdü.');

    // JSON parse
    const temiz = metin.replace(/```json|```/g, '').trim();
    const bas = temiz.indexOf('[');
    const son = temiz.lastIndexOf(']');
    if (bas === -1 || son === -1) throw new Error('API geçerli JSON döndürmedi: ' + temiz.slice(0, 300));
    return JSON.parse(temiz.slice(bas, son + 1));
}

// ── POST: PDF yükle ve analiz et ─────────────────────────────────────────────
router.post('/pdf-analiz', upload.single('pdfDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'PDF dosyası seçilmedi.' });
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
        console.error('[PDF Analiz Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

// ── POST: Onaylanan soruları veritabanına kaydet ──────────────────────────────
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
        console.error('[Kayıt Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
