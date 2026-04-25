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
Bu PDF bir MEB sınavından alınmış Türkçe sorular içeriyor. Taranmış görüntü olabilir — tüm metin ve görselleri OCR ile oku.

Her soru genellikle şu yapıdadır:
1. Soru öncesinde bir veya birkaç metin/tablo/paragraf bloğu (BUNLAR ÖNCÜL)
2. Soru kökü — "Buna göre...", "Hangisi...", "Kaçtır?" gibi cümleler (BU SORU METNİ)
3. A, B, C, D şıkları

ÖNCÜLLER ÇOK ÖNEMLİ — soru metnine dahil etme, ayrı alanlara yaz:
- soruOnculu1: Soru öncesindeki BİRİNCİ metin/tablo/paragraf bloğu
- soruOnculu2: Varsa İKİNCİ blok
- soruOnculu3: Varsa ÜÇÜNCÜ blok
- soruMetni: SADECE soru kökü cümlesi (öncüller buraya gelmesin!)

ÖRNEK:
Soru sayfasında şu var:
"Ahmet'in 3 kalemi ve 5 silgisi vardır. Kalemi silgisinden 4 fazla olan kaç tanedir?
A) 1  B) 2  C) 3  D) 4"

Doğru çıktı:
soruOnculu1: "Ahmet'in 3 kalemi ve 5 silgisi vardır."
soruMetni: "Kalemi silgisinden 4 fazla olan kaç tanedir?"

YANLIŞ çıktı (yapma!):
soruOnculu1: ""
soruMetni: "Ahmet'in 3 kalemi ve 5 silgisi vardır. Kalemi silgisinden 4 fazla olan kaç tanedir?"

MATEMATİKSEL SEMBOLLER:
- Karekök: √9 → <span style="text-decoration:overline">9</span> değil, √9 olarak yaz ya da &#8730;9
- Üs: x² → x<sup>2</sup>
- Alt simge: x₂ → x<sub>2</sub>
- Kesir: 3/4 → <sup>3</sup>/<sub>4</sub>
- Pi: π olarak bırak
- Mutlak değer: |x| olarak bırak

GÖRSEL KURALLARI:
- Tablo görseli → HTML tabloya çevir: <table style="border-collapse:collapse"><tr><td style="border:1px solid #999;padding:4px">...</td></tr></table>
- Koordinat düzlemi, geometrik çizim → soruOnculu1Resmi veya soruResmi alanına "[GÖRSEL VAR]" yaz
- Sayı/metin içeren şekil → içeriğini metin olarak yaz

JSON ALANLARI:
- soruOnculu1: string (soru öncesi 1. içerik, zorunlu varsa doldur)
- soruOnculu1Resmi: "[GÖRSEL VAR]" veya ""
- soruOnculu2: string (varsa 2. içerik)
- soruOnculu2Resmi: "[GÖRSEL VAR]" veya ""
- soruOnculu3: string (varsa 3. içerik)
- soruOnculu3Resmi: "[GÖRSEL VAR]" veya ""
- soruResmi: "[GÖRSEL VAR]" veya ""
- soruMetni: string (SADECE soru kökü)
- secenekler: [{"metin":"...","gorsel":""},{"metin":"...","gorsel":""},{"metin":"...","gorsel":""},{"metin":"...","gorsel":""}]
- dogruCevapIndex: 0,1,2 veya 3 (cevap anahtarı yoksa -1)

GENEL:
- Her soruyu eksiksiz çıkar
- Sadece JSON array döndür, başına/sonuna açıklama ekleme, markdown kullanma

FORMAT:
[{"soruOnculu1":"","soruOnculu1Resmi":"","soruOnculu2":"","soruOnculu2Resmi":"","soruOnculu3":"","soruOnculu3Resmi":"","soruResmi":"","soruMetni":"","secenekler":[{"metin":"","gorsel":""},{"metin":"","gorsel":""},{"metin":"","gorsel":""},{"metin":"","gorsel":""}],"dogruCevapIndex":-1}]

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
            maxOutputTokens: 65536
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

    // Markdown kod bloklarını temizle
    let temiz = metin.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // [ ile son ] arasını al
    const bas = temiz.indexOf('[');
    const son = temiz.lastIndexOf(']');
    if (bas === -1) throw new Error('Gemini JSON array döndürmedi: ' + temiz.slice(0, 300));

    // son ] yoksa (yanıt kesilmiş) → son tam objeye kadar kırp
    if (son === -1 || son < bas) {
        temiz = temizlenmisBul(temiz.slice(bas));
    } else {
        temiz = temiz.slice(bas, son + 1);
    }

    // JSON string içindeki gerçek satır/tab karakterlerini escape et
    temiz = jsonStringIciniOnar(temiz);

    try {
        return JSON.parse(temiz);
    } catch (e1) {
        // Son çare: tüm kontrolsüz satır sonlarını kaldır
        try {
            return JSON.parse(temiz.replace(/[\r\n\t]/g, ' '));
        } catch (e2) {
            // Yarım kalan array'i onar — son tam objeyi bul
            try {
                const onarilmis = sonTamObjeyeKadar(temiz);
                return JSON.parse(onarilmis);
            } catch (e3) {
                throw new Error('JSON parse hatası: ' + e1.message + '\nİlk 500 karakter: ' + temiz.slice(0, 500));
            }
        }
    }
}

// JSON string değerleri içindeki literal newline/tab'ları escape et
function jsonStringIciniOnar(str) {
    let sonuc = '';
    let string = false;
    let kacis  = false;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (kacis) {
            sonuc += c;
            kacis = false;
            continue;
        }
        if (c === '\\') { kacis = true; sonuc += c; continue; }
        if (c === '"')  { string = !string; sonuc += c; continue; }
        if (string) {
            if      (c === '\n') { sonuc += '\\n'; continue; }
            else if (c === '\r') { sonuc += '\\r'; continue; }
            else if (c === '\t') { sonuc += '\\t'; continue; }
        }
        sonuc += c;
    }
    return sonuc;
}

// Yanıt kesilmişse son tam } olan yere kadar al, array kapat
function sonTamObjeyeKadar(str) {
    const son = str.lastIndexOf('}');
    if (son === -1) return '[]';
    return str.slice(0, son + 1) + ']';
}

// Temiz array başlangıcını bul
function temizlenmisBul(str) {
    const son = str.lastIndexOf('}');
    if (son === -1) return '[]';
    return str.slice(0, son + 1) + ']';
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
