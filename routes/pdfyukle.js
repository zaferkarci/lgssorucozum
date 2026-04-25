// ─── PDF'den Toplu Soru Yükleme — v3.0.0 ────────────────────────────────────
// Gemini 2.5 Flash — PDF'i direkt okur, OCR dahil, taranmış belgeler desteklenir.

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

async function pdfdenSorulariCikar(pdfBase64, sinif, ders, konu) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable tanımlı değil.');

    const PROMPT = `Sen bir Türk eğitim sistemi soru analiz uzmanısın.
Bu PDF bir MEB sınavından alınmış Türkçe sorular içeriyor. Taranmış görüntü olabilir, OCR ve görsel analiz ile oku.

Tüm çok şıklı soruları tespit et ve her biri için şu JSON alanlarını doldur:

- soruOnculu1: Sorudan önce gelen BİRİNCİ metin bloğu (paragraf, şiir, tablo vb.). Yoksa "".
- soruOnculu1Resmi: Birinci öncülün hemen yanındaki veya altındaki görsel/şekil/grafik varsa "[GÖRSEL VAR]" yaz, yoksa "".
- soruOnculu2: İKİNCİ metin bloğu (varsa). Yoksa "".
- soruOnculu2Resmi: İkinci öncülün görseli varsa "[GÖRSEL VAR]", yoksa "".
- soruOnculu3: ÜÇÜNCÜ metin bloğu (varsa). Yoksa "".
- soruOnculu3Resmi: Üçüncü öncülün görseli varsa "[GÖRSEL VAR]", yoksa "".
- soruResmi: Soru kökünün hemen yanındaki özel görsel/şekil varsa "[GÖRSEL VAR]", yoksa "".
- soruMetni: Soru kökü tam metin. HTML desteklenir: <sup>, <sub>, <b>, <u>, <i>.
- secenekler: Tam olarak 4 eleman: [{"metin":"A şıkkı tam metni","gorsel":""},...]
- dogruCevapIndex: Doğru cevap indexi (0=A,1=B,2=C,3=D). Cevap anahtarı yoksa -1.

ÖNCÜL AYIRMA KURALLARI:
- Bir soruda birden fazla metin/tablo/paragraf bloğu varsa bunları ayrı öncüllere koy (soruOnculu1, soruOnculu2, soruOnculu3)
- Her metnin hemen yanındaki veya altındaki görsel o öncülün görseli sayılır
- Tablolar varsa HTML formatında yaz: <table style="border-collapse:collapse"><tr><td style="border:1px solid #999;padding:4px">...</td></tr></table>
- Matematiksel ifadeler: x² → x<sup>2</sup>, x₂ → x<sub>2</sub>
- Şıklarda sadece sayısal değer varsa olduğu gibi yaz
- Her soruyu eksiksiz çıkar, hiçbirini atlama
- Sadece JSON array döndür, açıklama veya markdown ekleme

FORMAT:
[{"soruOnculu1":"","soruOnculu1Resmi":"","soruOnculu2":"","soruOnculu2Resmi":"","soruOnculu3":"","soruOnculu3Resmi":"","soruResmi":"","soruMetni":"soru metni","secenekler":[{"metin":"A şıkkı","gorsel":""},{"metin":"B şıkkı","gorsel":""},{"metin":"C şıkkı","gorsel":""},{"metin":"D şıkkı","gorsel":""}],"dogruCevapIndex":0}]

Bilgi: Sınıf=${sinif}, Ders=${ders}, Konu=${konu || 'Belirtilmedi'}`;

    const body = {
        contents: [{
            parts: [
                {
                    inline_data: {
                        mime_type: 'application/pdf',
                        data: pdfBase64
                    }
                },
                { text: PROMPT }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
        }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const hata = await response.text();
        throw new Error('Gemini API hatası: ' + hata);
    }

    const veri = await response.json();
    const metin = veri?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!metin) throw new Error('Gemini boş yanıt döndürdü.');

    const temiz = metin.replace(/```json|```/g, '').trim();
    const bas = temiz.indexOf('[');
    const son = temiz.lastIndexOf(']');
    if (bas === -1 || son === -1) throw new Error('Gemini geçerli JSON döndürmedi: ' + temiz.slice(0, 300));
    return JSON.parse(temiz.slice(bas, son + 1));
}

// POST: PDF yükle ve analiz et
router.post('/pdf-analiz', upload.single('pdfDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'PDF seçilmedi.' });
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

// POST: Kaydet
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
            unite:           s.unite       || '',
            soruOnculu1:     s.soruOnculu  || s.soruOnculu1 || '',
            soruOnculu1Resmi: s.soruOnculu1Resmi || '',
            soruOnculu2:     s.soruOnculu2 || '',
            soruOnculu2Resmi: s.soruOnculu2Resmi || '',
            soruOnculu3:     s.soruOnculu3 || '',
            soruOnculu3Resmi: s.soruOnculu3Resmi || '',
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
