// ─── PDF'den Toplu Soru Yükleme — v3.0.0 ────────────────────────────────────
// Bu route:
//  1. Admin'in PDF yüklemesini kabul eder (multer, memory storage)
//  2. PDF'i base64'e çevirip Claude API'ye gönderir
//  3. Claude, soruları JSON dizisi olarak döndürür
//  4. Admin önizleme ekranında onaylar / düzenler
//  5. /pdf-sorulari-kaydet POST ile veritabanına toplu kaydeder

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const Soru     = require('../models/Soru');

// PDF bellekte tutulur, diske yazılmaz
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Sadece PDF dosyası kabul edilir.'));
    }
});

// ── Yetki kontrolü ────────────────────────────────────────────────────────────
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

// ── Dersler (admin.js ile aynı) ───────────────────────────────────────────────
const DERSLER = [
    'Matematik', 'Türkçe', 'Fen Bilimleri',
    'T.C. İnkılâp Tarihi', 'İngilizce', 'Din Kültürü'
];

// ── Claude API çağrısı ────────────────────────────────────────────────────────
async function pdfdenSorulariCikar(pdfBase64, sinif, ders, konu) {
    const SISTEM_PROMPTU = `Sen bir eğitim içeriği analiz uzmanısın.
Sana verilen PDF'deki çok şıklı soruları analiz et ve her soruyu JSON formatında çıkar.
Her soru için şu alanları doldur:
- soruOnculu: Sorudan önce gelen paragraf/metin/tablo (yoksa boş string)
- soruResmi: Soruda resim/görsel referansı varsa "[GÖRSEL VAR]" yaz, yoksa boş string
- soruMetni: Soru kökü (tam metin, HTML desteklenir: <sup>, <sub>, <b>, <i> kullanabilirsin)
- secenekler: 4 elemanlı dizi, her eleman { "metin": "...", "gorsel": "" }
- dogruCevapIndex: Doğru şık indexi (0=A, 1=B, 2=C, 3=D)

SADECE aşağıdaki formatta JSON array döndür, başka hiçbir şey yazma:
[
  {
    "soruOnculu": "...",
    "soruResmi": "",
    "soruMetni": "...",
    "secenekler": [
      {"metin": "A şıkkı", "gorsel": ""},
      {"metin": "B şıkkı", "gorsel": ""},
      {"metin": "C şıkkı", "gorsel": ""},
      {"metin": "D şıkkı", "gorsel": ""}
    ],
    "dogruCevapIndex": 0
  }
]

Eğer PDF'de cevap anahtarı yoksa dogruCevapIndex'i -1 yap.
Matematiksel ifadeleri HTML sup/sub ile göster (örn: x<sup>2</sup>).`;

    const body = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: SISTEM_PROMPTU,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: pdfBase64
                    }
                },
                {
                    type: 'text',
                    text: `Bu PDF'deki tüm soruları çıkar. Bilgi: Sınıf=${sinif}, Ders=${ders}, Konu=${konu || 'Belirtilmedi'}`
                }
            ]
        }]
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable tanımlı değil.');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const hata = await response.text();
        throw new Error('Claude API hatası: ' + hata);
    }

    const veri = await response.json();
    const metin = (veri.content || []).map(b => b.text || '').join('');

    // JSON array'i parse et
    const temiz = metin.replace(/```json|```/g, '').trim();
    const bas = temiz.indexOf('[');
    const son = temiz.lastIndexOf(']');
    if (bas === -1 || son === -1) throw new Error('Claude geçerli JSON döndürmedi.');
    return JSON.parse(temiz.slice(bas, son + 1));
}

// ── GET: PDF yükleme sayfası (admin.ejs içinden çağrılır, mod=pdfYukle) ──────
// Bu route aslında admin.js GET /admin içinden render edilir.
// Burada sadece POST işlemleri var.

// ── POST: PDF yükle ve analiz et ──────────────────────────────────────────────
router.post('/pdf-analiz', upload.single('pdfDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;

    try {
        if (!req.file) return res.status(400).json({ hata: 'PDF dosyası seçilmedi.' });

        const { sinif, ders, konu } = req.body;
        const pdfBase64 = req.file.buffer.toString('base64');

        const sorular = await pdfdenSorulariCikar(pdfBase64, sinif, ders, konu);

        // Her soruya sinif/ders/konu ekle
        const zenginSorular = sorular.map((s, i) => ({
            ...s,
            sinif: sinif || '8',
            ders: ders || 'Matematik',
            konu: konu || '',
            _gecici_id: i  // frontend için geçici id
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
        if (!Array.isArray(sorular) || sorular.length === 0) {
            return res.status(400).json({ hata: 'Kaydedilecek soru yok.' });
        }

        const kayitlar = sorular.map(s => ({
            sinif:           s.sinif,
            ders:            s.ders,
            konu:            s.konu || '',
            soruOnculu:      s.soruOnculu || '',
            soruResmi:       s.soruResmi || '',
            soruMetni:       s.soruMetni,
            secenekler:      (s.secenekler || []).map(se => ({
                                 metin: se.metin || '',
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
module.exports.DERSLER = DERSLER;
