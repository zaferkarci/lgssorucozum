const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const Okul = require('../models/Okul');
const Unite = require('../models/Unite');
const KonuIzin = require('../models/KonuIzin');
const { bosSoruNo } = require('../services/soruNo');
const CevapKaydi = require('../models/CevapKaydi');
const ReferansKodu = require('../models/ReferansKodu');
const Haber = require('../models/Haber');
const Mesaj = require('../models/Mesaj');
let YasakliKelime = null;
try {
    YasakliKelime = require('../models/YasakliKelime');
} catch (e) {
    console.warn('[admin] models/YasakliKelime.js bulunamadı; yasaklı kelime özelliği devre dışı.');
}
const { referansKoduUret } = require('./auth');
const multer = require('multer');

// ── Multer: Excel yüklemeleri ────────────────────────────────────────────────
const uploadExcel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls)$/i)) cb(null, true);
        else cb(new Error('Sadece Excel dosyası (.xlsx/.xls) kabul edilir.'));
    }
});

const uploadOkulExcel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls)$/i)) cb(null, true);
        else cb(new Error('Sadece Excel dosyası kabul edilir.'));
    }
});

// ── Yetki kontrolü ───────────────────────────────────────────────────────────
// v4.1.24: Bir kez başarılı Basic Auth girilince session'a "adminGirisli" işareti
// koyuluyor. Sonraki admin isteklerinde browser şifre sormuyor (session 7 gün geçerli).
// Mevcut AJAX'ler Authorization header'ını yine gönderdiği için geriye uyumlu.
function adminKontrol(req, res) {
    // 1) Session'da daha önce admin doğrulandıysa direkt geç
    if (req.session && req.session.adminGirisli === true) return true;

    // 2) Basic Auth header kontrolü
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        res.status(401).send('Giriş gerekli!');
        return false;
    }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        // İlk başarılı girişte session'a kaydet — bir daha şifre sorulmasın
        if (req.session) req.session.adminGirisli = true;
        return true;
    }
    res.status(401).send('Yetkisiz!');
    return false;
}

// ── Admin ana sayfa ──────────────────────────────────────────────────────────
router.get('/admin', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
    const editSoru = req.query.duzenle ? await Soru.findById(req.query.duzenle) : null;
    // Soru filtreleri
    const filSinif  = req.query.filSinif  || '';
    const filDers   = req.query.filDers   || '';
    const filUnite  = req.query.filUnite  || '';
    const filKonu   = req.query.filKonu   || '';
    const soruFiltre = {};
    if (filSinif)  soruFiltre.sinif  = filSinif;
    if (filDers)   soruFiltre.ders   = filDers;
    if (filUnite)  soruFiltre.unite  = filUnite;
    if (filKonu)   soruFiltre.konu   = filKonu;
    const tumSorular = await Soru.collection.find(soruFiltre).sort({ soruNo: 1 }).toArray();
    const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "T.C. İnkılâp Tarihi", "İngilizce", "Din Kültürü"];
    const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');
    // Kullanıcı filtreleri
    const filIl = req.query.il || '';
    const filIlce = req.query.ilce || '';
    const filOkul = req.query.okul || '';
    // v4.3.60: Kullanıcı listesi için sınıf seviyesi filtresi (6/7/8)
    // (NOT: filSinif zaten soru filtresi için kullanılıyor — bu yüzden ayrı bir
    // parametre adı: filKullaniciSinif)
    const filKullaniciSinif = req.query.kullaniciSinif || '';
    const tumKullanicilar = await Kullanici.find({}, 'kullaniciAdi puan soruIndex sinif sube il ilce okul rol rolListesi siralamaCache sonGiris');
    const tumOkullar = await Okul.find().sort({ il: 1, ilce: 1, ad: 1 });
    const filtreliKullanicilar = tumKullanicilar.filter(k =>
        (!filIl || k.il === filIl) && (!filIlce || k.ilce === filIlce) && (!filOkul || k.okul === filOkul)
        && (!filKullaniciSinif || (k.rol === 'ogrenci' && String(k.sinif) === String(filKullaniciSinif)))
    );
    const iller = [...new Set(tumKullanicilar.map(k => k.il).filter(Boolean))].sort();
    const ilceler = filIl ? [...new Set(tumKullanicilar.filter(k => k.il === filIl).map(k => k.ilce).filter(Boolean))].sort() : [];
    const okullar = filIlce ? [...new Set(tumKullanicilar.filter(k => k.ilce === filIlce).map(k => k.okul).filter(Boolean))].sort() : [];
    const adminToken = req.headers.authorization
        ? req.headers.authorization.replace('Basic ', '')
        : Buffer.from(`${process.env.ADMIN_USER||'admin'}:${process.env.ADMIN_PASSWORD||'1234'}`).toString('base64');
    let tumReferanslar = mod === 'referans' ? await ReferansKodu.find().sort({ olusturmaTarih: -1 }).lean() : [];
    // v4.3.30: tip='veli' kodu çift amaçlı. Bir veli kullanıcının ürettiği
    // 'veli' kodu aslında ÖĞRENCİ kaydı yaptırır. Listede doğru etiket için
    // her referansa gercekTip eklenir.
    if (tumReferanslar.length > 0) {
        const veliKodOlusturanlar = [...new Set(
            tumReferanslar.filter(r => r.tip === 'veli' && r.olusturan && r.olusturan !== 'admin')
                          .map(r => r.olusturan)
        )];
        let veliSet = new Set();
        if (veliKodOlusturanlar.length > 0) {
            const veliKullanicilar = await Kullanici.find(
                { kullaniciAdi: { $in: veliKodOlusturanlar }, rol: 'veli' }, 'kullaniciAdi'
            ).lean();
            veliSet = new Set(veliKullanicilar.map(v => v.kullaniciAdi));
        }
        tumReferanslar = tumReferanslar.map(r => {
            let gercekTip = r.tip;
            // Veli'nin ürettiği 'veli' kodu → öğrenci daveti
            if (r.tip === 'veli' && r.olusturan && veliSet.has(r.olusturan)) {
                gercekTip = 'ogrenci';
            }
            return Object.assign({}, r, { gercekTip });
        });
    }
    const yasakliKelimeler = (mod === 'kullanicilar' && YasakliKelime) ? await YasakliKelime.find().sort({ _id: -1 }).lean() : [];
    const tumHaberler = (mod === 'haberler') ? await Haber.find().sort({ yayinTarih: -1 }).lean() : [];
    const tumMesajlar = (mod === 'mesajlar') ? await Mesaj.find().sort({ yazilmaTarih: -1 }).lean() : [];
    // Tüm sekmelerde nav rozeti için okunmamış sayısı
    const okunmamisMesajSayisi = await Mesaj.countDocuments({ okundu: false });
    // v4.3.29: Filtre seçenekleri (sınıf/ders/ünite/konu) artık Unite
    // koleksiyonundan üretilir — soru filtreleme, zorluk raporu, soru ekle
    // ve pdf yükle hep aynı ünite kayıtlarından beslenir. Kademeli: sınıf
    // seçilince o sınıfın dersleri, ders seçilince üniteleri, vb.
    const tumUniteKayitlari = await Unite.find().lean();
    const uniteSinifEsle = (u, s) => String(u.sinif || '') === String(s) || !u.sinif;
    const tumSoruSiniflar = [...new Set(tumUniteKayitlari.map(u => u.sinif).filter(Boolean).map(String))].sort();
    const tumSoruDersler  = [...new Set(
        tumUniteKayitlari
            .filter(u => !filSinif || uniteSinifEsle(u, filSinif))
            .map(u => u.ders).filter(Boolean)
    )].sort();
    const tumSoruUniteler = [...new Set(
        tumUniteKayitlari
            .filter(u => (!filSinif || uniteSinifEsle(u, filSinif)) && (!filDers || u.ders === filDers))
            .map(u => u.uniteAdi).filter(Boolean)
    )].sort();
    const tumSoruKonular  = [...new Set(
        tumUniteKayitlari
            .filter(u => (!filSinif || uniteSinifEsle(u, filSinif)) && (!filDers || u.ders === filDers) && (!filUnite || u.uniteAdi === filUnite))
            .flatMap(u => u.konular || []).filter(Boolean)
    )].sort();
    // v4.3.69: Bugünün aktivite özeti (yalnızca kullanicilar mod'unda hesapla)
    let aktiviteOzetiData = null;
    if (mod === 'kullanicilar') {
        try {
            const { aktiviteOzeti, bugunBaslangic } = require('../services/aktivite');
            aktiviteOzetiData = await aktiviteOzeti(tumKullanicilar, bugunBaslangic());
        } catch (e) {
            console.warn('[admin] aktivite ozeti hesaplanamadi:', e.message);
        }
    }
    res.render('admin', {
        mod, editSoru, tumSorular, dersler,
        tumKullanicilar, filtreliKullanicilar,
        iller, ilceler, okullar,
        filIl, filIlce, filOkul,
        filSinif, filDers, filUnite, filKonu,
        filKullaniciSinif,
        tumSoruSiniflar, tumSoruDersler, tumSoruUniteler, tumSoruKonular,
        tumOkullar, adminToken,
        tumUniteler: await Unite.find().sort({ ders:1, uniteNo:1 }),
        tumReferanslar, yasakliKelimeler, tumHaberler, tumMesajlar, okunmamisMesajSayisi,
        aktiviteOzetiData
    });
    } catch (err) {
        console.error('[/admin] HATA:', err);
        res.status(500).send('<pre style="font-family:monospace; padding:20px; background:#fee; border:1px solid #f99;">'
            + '<b>Admin Sayfası Hatası</b>\n\n'
            + 'Mod: ' + (req.query.mod || '(yok)') + '\n\n'
            + 'Mesaj: ' + (err.message || err) + '\n\n'
            + 'Stack:\n' + (err.stack || '') + '</pre>');
    }
});

// ── Soru CRUD ────────────────────────────────────────────────────────────────
function soruDogrula(body) {
    if (!body.soruMetni || !body.soruMetni.trim()) return 'Soru metni boş olamaz.';
    for (var i = 0; i < 4; i++) {
        var m = (body['metin' + i] || '').trim();
        var g = (body['gorsel' + i] || '').trim();
        if (!m && !g) return (String.fromCharCode(65+i) + ' şıkkı boş olamaz. Metin veya görsel girin.');
    }
    if (body.dogruCevap === undefined || body.dogruCevap === '' || isNaN(parseInt(body.dogruCevap))) return 'Doğru cevap belirtilmeli.';
    return null;
}

router.post('/soru-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    var hata = soruDogrula(req.body);
    if (hata) return res.send("<script>alert('" + hata + "'); window.history.back();</script>");
    // v4.8.14: soruNo — en kucuk bos numarayi doldur (silinen numara tekrar kullanilir)
    const [yeniNo] = await bosSoruNo(1);
    await new Soru({ soruNo: yeniNo, sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, unite: req.body.unite||'', soruOnculu1: req.body.soruOnculu1||'', soruOnculu1Resmi: req.body.soruOnculu1Resmi||'', soruOnculu2: req.body.soruOnculu2||'', soruOnculu2Resmi: req.body.soruOnculu2Resmi||'', soruOnculu3: req.body.soruOnculu3||'', soruOnculu3Resmi: req.body.soruOnculu3Resmi||'', soruMetni: req.body.soruMetni, sikDizilimi: req.body.sikDizilimi||'dikey', durum: req.body.durum||'taslak', tabloBaslik: req.body.tabloBaslik ? JSON.parse(req.body.tabloBaslik) : [], secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    var hata = soruDogrula(req.body);
    if (hata) return res.send("<script>alert('" + hata + "'); window.history.back();</script>");
    var ekGuncelleme = {};
    if (req.body.durum === 'yayinda') ekGuncelleme.yayinTarih = new Date();
    // Numarasız soruya numara ata (özellikle PDF'den gelen taslakta soruNo yoksa)
    const mevcut = await Soru.findById(req.body.id).select('soruNo').lean();
    if (!mevcut || !mevcut.soruNo) {
        const [bosNo] = await bosSoruNo(1);
        ekGuncelleme.soruNo = bosNo;
    }
    await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, unite: req.body.unite||'', soruOnculu1: req.body.soruOnculu1||'', soruOnculu1Resmi: req.body.soruOnculu1Resmi||'', soruOnculu2: req.body.soruOnculu2||'', soruOnculu2Resmi: req.body.soruOnculu2Resmi||'', soruOnculu3: req.body.soruOnculu3||'', soruOnculu3Resmi: req.body.soruOnculu3Resmi||'', soruMetni: req.body.soruMetni, sikDizilimi: req.body.sikDizilimi||'dikey', durum: req.body.durum||'taslak', tabloBaslik: req.body.tabloBaslik ? JSON.parse(req.body.tabloBaslik) : [], secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap), ...ekGuncelleme });
    res.redirect('/admin?mod=soruListesi');
});

router.post('/soru-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin?mod=soruListesi');
});

// v4.14.0: Sorular listesinden HIZLI durum degistirme (yayinda / taslak / duraklat).
//   soru-guncelle ile ayni yan etkiler: yayina alirken yayinTarih ve numarasiz
//   soruya numara atanir. Diger alanlar korunur.
router.post('/soru-durum-degistir', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    const id = req.body.id;
    const durum = req.body.durum;
    // v4.14.1: islem sonrasi AYNI filtreye (sinif/ders/unite/konu) geri don
    const qs = new URLSearchParams({ mod: 'soruListesi' });
    ['filSinif', 'filDers', 'filUnite', 'filKonu'].forEach(f => { if (req.query[f]) qs.set(f, req.query[f]); });
    const geri = '/admin?' + qs.toString();
    if (['taslak', 'yayinda', 'duraklat'].indexOf(durum) === -1) return res.redirect(geri);
    const ek = { durum };
    if (durum === 'yayinda') {
        ek.yayinTarih = new Date();
        const mevcut = await Soru.findById(id).select('soruNo').lean();
        if (!mevcut || !mevcut.soruNo) { const [bosNo] = await bosSoruNo(1); ek.soruNo = bosNo; }
    }
    await Soru.findByIdAndUpdate(id, ek);
    res.redirect(geri);
});

router.post('/soru-istatistik-sifirla', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Soru.updateMany({}, { $set: { cozulmeSayisi: 0, dogruSayisi: 0, ortalamaSure: 0, hamPuan: null, zorlukKatsayisi: 3, cozumSureleriTum: [], dogruCevapSureleri: [] } });
        await Kullanici.updateMany({}, { $set: { soruIndex: 0 } });
        await CevapKaydi.deleteMany({});
        res.send('<script>alert("Soru istatistikleri sıfırlandı!"); window.location.href="/admin?mod=sifirla";</script>');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Kullanıcı ────────────────────────────────────────────────────────────────
// v4.9.1: Analiz etiketi onarimi. v4.8.19 ONCESI cevap vermis kullanicilarin
//   analiz sorulari etiketsiz oldugundan gunluk hedefe yansiyordu. Bu arac,
//   kullanicinin TUM cevaplarini kronolojik replay edip analiz donemindekileri
//   (canli etiketleme ile ayni mantik) geriye donuk 'analiz:true' yapar.
//   Kuru calisma: /admin/analiz-etiket-onar?kullanici=ADI
//   Uygula:       /admin/analiz-etiket-onar?kullanici=ADI&uygula=1
// v4.16.8: Mukerrer (cift-POST) CevapKaydi temizleme — ADMIN SAYFASI.
//   /admin/mukerrer-temizle          -> KURU CALISMA (kac mukerrer var, SILMEZ)
//   /admin/mukerrer-temizle?uygula=1 -> gercekten siler
//   Kural: her (kullaniciAdi,soruId) icin ilk kayit tutulur; son tutulandan
//   <= 5 sn sonrasi mukerrer sayilip silinir. Gercek tekrar cozum (dk/saat sonra) korunur.
router.get('/admin/mukerrer-temizle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    const uygula = req.query.uygula === '1';
    const PENCERE_MS = 5000;
    try {
        const tum = await CevapKaydi.find({}, '_id kullaniciAdi soruId tarih dogruMu sure')
            .sort({ kullaniciAdi: 1, soruId: 1, tarih: 1 }).lean();
        const silinecek = [];
        const ciftler = []; // { tutulan, silinen }
        let prevKey = null, sonTutulan = null;
        for (const r of tum) {
            const key = r.kullaniciAdi + '|' + String(r.soruId);
            const ts = r.tarih ? new Date(r.tarih).getTime() : 0;
            const sonTs = (sonTutulan && sonTutulan.tarih) ? new Date(sonTutulan.tarih).getTime() : null;
            if (key === prevKey && sonTs != null && (ts - sonTs) <= PENCERE_MS) {
                silinecek.push(r._id);
                ciftler.push({ tutulan: sonTutulan, silinen: r });
            } else {
                prevKey = key; sonTutulan = r;
            }
        }
        let silindi = 0;
        if (uygula && silinecek.length) {
            const sonuc = await CevapKaydi.deleteMany({ _id: { $in: silinecek } });
            silindi = sonuc.deletedCount || 0;
        }

        const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const fmtT = (x) => { try { return new Date(x).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', hour12: false }) + '.' + String(new Date(x).getMilliseconds()).padStart(3, '0'); } catch (e) { return esc(x); } };
        const dg = (b) => b ? '<span style="color:#137333;">dogru</span>' : '<span style="color:#c62828;">yanlis</span>';

        const LIMIT = 3000;
        const gosterilen = ciftler.slice(0, LIMIT);
        let satirlar = '';
        for (let i = 0; i < gosterilen.length; i++) {
            const c = gosterilen[i];
            const tut = c.tutulan, sil = c.silinen;
            const farkMs = (new Date(sil.tarih).getTime() - new Date(tut.tarih).getTime());
            const fark = (farkMs / 1000).toFixed(1) + ' sn';
            // Tutulan satiri
            satirlar += '<tr style="border-top:2px solid #999;">'
                + '<td style="text-align:right; color:#888;">' + (i + 1) + '</td>'
                + '<td style="color:#137333; font-weight:600;">TUTULAN</td>'
                + '<td>' + esc(tut.kullaniciAdi) + '</td>'
                + '<td style="font-family:monospace; font-size:12px;">' + esc(String(tut.soruId)) + '</td>'
                + '<td>' + fmtT(tut.tarih) + '</td>'
                + '<td>' + dg(tut.dogruMu) + '</td>'
                + '<td style="text-align:right;">' + esc(tut.sure) + '</td>'
                + '<td style="font-family:monospace; font-size:11px; color:#888;">' + esc(String(tut._id)) + '</td>'
                + '<td></td>'
                + '</tr>';
            // Silinen satiri
            satirlar += '<tr style="background:#fff5f5;">'
                + '<td></td>'
                + '<td style="color:#c62828; font-weight:600;">' + (uygula ? 'SILINDI' : 'SILINECEK') + '</td>'
                + '<td>' + esc(sil.kullaniciAdi) + '</td>'
                + '<td style="font-family:monospace; font-size:12px;">' + esc(String(sil.soruId)) + '</td>'
                + '<td>' + fmtT(sil.tarih) + '</td>'
                + '<td>' + dg(sil.dogruMu) + '</td>'
                + '<td style="text-align:right;">' + esc(sil.sure) + '</td>'
                + '<td style="font-family:monospace; font-size:11px; color:#888;">' + esc(String(sil._id)) + '</td>'
                + '<td style="text-align:right; color:#c62828;">' + fark + '</td>'
                + '</tr>';
        }
        const tabloNot = ciftler.length > LIMIT
            ? ('<p style="color:#c62828;">Not: ' + ciftler.length + ' mukerrerin ilk ' + LIMIT + ' tanesi listelendi.</p>')
            : '';

        const ozet = '<h2 style="margin:0 0 8px;">Mukerrer (cift-POST) cevap temizleme</h2>'
            + '<p style="line-height:1.6;"><b>Mod:</b> ' + (uygula ? 'UYGULA (silindi)' : 'KURU CALISMA (rapor, silme YOK)') + '<br>'
            + '<b>Toplam kayit:</b> ' + tum.length + '<br>'
            + '<b>Mukerrer (silinecek) cift:</b> ' + silinecek.length
            + (uygula ? ('<br><b>SILINEN:</b> ' + silindi) : '') + '</p>'
            + (uygula
                ? '<p style="color:#137333;">Tamamlandi. puan/dersPuanlari gece cron\'unda CevapKaydi\'ndan yeniden kurulur.</p>'
                : (silinecek.length
                    ? '<p><a href="/admin/mukerrer-temizle?uygula=1" style="background:#c62828; color:#fff; padding:8px 16px; border-radius:6px; text-decoration:none; font-weight:600;">Bu kayitlari SIL (?uygula=1)</a></p>'
                    : '<p style="color:#137333;">Mukerrer kayit yok.</p>'));

        const tablo = ciftler.length
            ? ('<table cellspacing="0" cellpadding="6" style="border-collapse:collapse; font:13px sans-serif; border:1px solid #ccc;">'
                + '<thead><tr style="background:#f0f0f0;">'
                + '<th>#</th><th>Tip</th><th>Kullanici</th><th>SoruId</th><th>Tarih</th><th>Sonuc</th><th>Sure</th><th>_id</th><th>Fark</th>'
                + '</tr></thead><tbody>' + satirlar + '</tbody></table>')
            : '';

        res.send('<div style="padding:16px; font:14px sans-serif;">' + ozet + tabloNot + tablo + '</div>');
    } catch (e) {
        res.status(500).send('Hata: ' + e.message);
    }
});

router.get('/admin/analiz-etiket-onar', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    const kullaniciAdi = (req.query.kullanici || '').trim();
    const uygula = req.query.uygula === '1';
    if (!kullaniciAdi) return res.status(400).send('kullanici parametresi gerekli. Ornek: /admin/analiz-etiket-onar?kullanici=zaynephafsa');
    try {
        const k = await Kullanici.findOne({ kullaniciAdi }).lean();
        if (!k) return res.status(404).send('Kullanici bulunamadi: ' + kullaniciAdi);

        const yayindaSorular = await Soru.find({ durum: 'yayinda', sinif: String(k.sinif) }, 'ders unite konu').lean();
        let kapaliSet = new Set();
        try {
            const kapali = await KonuIzin.find({ sinif: String(k.sinif), acik: false }, 'ders unite konu').lean();
            kapaliSet = new Set(kapali.map(x => (x.ders||'')+'|'+(x.unite||'')+'|'+(x.konu||'')));
        } catch (e) {}
        const konuToplam = {};
        yayindaSorular.forEach(s => {
            const tk = (s.ders||'')+'|'+(s.unite||'')+'|'+(s.konu||'');
            if (kapaliSet.has(tk)) return;
            konuToplam[tk] = (konuToplam[tk] || 0) + 1;
        });

        const cevaplar = await CevapKaydi.find({ kullaniciAdi }).sort({ tarih: 1, _id: 1 }).lean();
        const soruIdSet = [...new Set(cevaplar.map(c => String(c.soruId)))];
        const soruDocs = soruIdSet.length ? await Soru.find({ _id: { $in: soruIdSet } }, 'ders unite konu').lean() : [];
        const idTopic = {};
        soruDocs.forEach(s => { idTopic[String(s._id)] = (s.ders||'')+'|'+(s.unite||'')+'|'+(s.konu||''); });

        function analizEksikMi(konuCevap) {
            for (const tk of Object.keys(konuToplam)) {
                if ((konuCevap[tk] || 0) < Math.min(2, konuToplam[tk])) return true;
            }
            return false;
        }

        const konuCevap = {};
        const seen = new Set();
        const analizIds = [];
        for (const c of cevaplar) {
            if (analizEksikMi(konuCevap)) analizIds.push(c._id);
            const sid = String(c.soruId);
            if (!seen.has(sid)) {
                seen.add(sid);
                const tk = idTopic[sid];
                if (tk && konuToplam[tk] !== undefined) konuCevap[tk] = (konuCevap[tk] || 0) + 1;
            }
        }

        const zatenEtiketli = cevaplar.filter(c => c.analiz === true).length;
        let rapor = 'Kullanici: ' + kullaniciAdi + ' (sinif ' + k.sinif + ')\n'
            + 'Toplam cevap: ' + cevaplar.length + '\n'
            + 'Acik konu sayisi: ' + Object.keys(konuToplam).length + '\n'
            + 'Analiz olarak isaretlenecek cevap: ' + analizIds.length + '\n'
            + 'Hali hazirda analiz=true: ' + zatenEtiketli + '\n';
        if (uygula) {
            if (analizIds.length) await CevapKaydi.updateMany({ _id: { $in: analizIds } }, { $set: { analiz: true } });
            rapor += '\nUYGULANDI: ' + analizIds.length + ' cevap analiz=true yapildi. Hedef yeniden hesaplanacaktir.';
        } else {
            rapor += '\nKURU CALISMA (degisiklik yok). Uygulamak icin URL sonuna &uygula=1 ekle.';
        }
        res.type('text/plain; charset=utf-8').send(rapor);
    } catch (e) {
        console.error('[analiz-etiket-onar]', e.message);
        res.status(500).send('Hata: ' + e.message);
    }
});

router.post('/kullanici-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Kullanici.findOneAndDelete({ kullaniciAdi: req.body.kullaniciAdi });
        await CevapKaydi.deleteMany({ kullaniciAdi: req.body.kullaniciAdi });
        const params = new URLSearchParams({ mod: 'kullanicilar', il: req.body.il || '', ilce: req.body.ilce || '', okul: req.body.okul || '' }).toString();
        res.redirect('/admin?' + params);
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Veri sıfırla ─────────────────────────────────────────────────────────────
router.post('/sifirla', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Kullanici.updateMany({}, { $set: { soruIndex: 0, puan: 0, toplamSure: 0, dersPuanlari: [] } });
        await Soru.updateMany({}, { $set: { cozulmeSayisi: 0, dogruSayisi: 0, ortalamaSure: 0, hamPuan: null, zorlukKatsayisi: 3, cozumSureleriTum: [], dogruCevapSureleri: [] } });
        await CevapKaydi.deleteMany({});
        res.send('<script>alert("Tüm veriler sıfırlandı!"); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// ── Okul CRUD ────────────────────────────────────────────────────────────────
router.get('/api/okullar', async (req, res) => {
    try {
        const { il, ilce } = req.query;
        const filtre = {};
        if (il) filtre.il = { $regex: new RegExp('^' + il.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
        if (ilce) filtre.ilce = { $regex: new RegExp('^' + ilce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
        const okullar = await Okul.find(filtre, 'ad').sort({ ad: 1 });
        res.json(okullar.map(o => o.ad));
    } catch (err) { res.status(500).json([]); }
});

router.post('/okul-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const varMi = await Okul.findOne({ il: req.body.il, ilce: req.body.ilce, ad: req.body.ad });
        if (!varMi) await new Okul({ il: req.body.il, ilce: req.body.ilce, ad: req.body.ad }).save();
        res.redirect('/admin?mod=okullar');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/okul-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Okul.findByIdAndDelete(req.body.id);
        res.redirect('/admin?mod=okullar');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/okul-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Okul.findByIdAndUpdate(req.body.id, { il: req.body.il, ilce: req.body.ilce, ad: req.body.ad });
        res.redirect('/admin?mod=okullar');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/okul-kaydet', async (req, res) => {
    try {
        const { il, ilce, ad } = req.body;
        if (!il || !ilce || !ad) return res.status(400).json({ ok: false });
        const varMi = await Okul.findOne({ il, ilce, ad });
        if (!varMi) await new Okul({ il, ilce, ad }).save();
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false }); }
});

// ── Excel'den Okul Yükleme ───────────────────────────────────────────────────
router.post('/okul-excel-yukle', uploadOkulExcel.single('okulExcelDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'Excel dosyası seçilmedi.' });
        const XLSX = require('xlsx');
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const satirlar = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        const okullar = [];
        for (let i = 1; i < satirlar.length; i++) {
            const s = satirlar[i];
            if (!s || s.every(h => !h)) continue;
            const il  = s[0] ? String(s[0]).trim() : '';
            const ilce = s[1] ? String(s[1]).trim() : '';
            const ad  = s[2] ? String(s[2]).trim() : '';
            if (il && ilce && ad) okullar.push({ il, ilce, ad });
        }
        res.json({ ok: true, onizleme: okullar, toplam: okullar.length });
    } catch (err) {
        console.error('[Okul Excel Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

router.post('/okul-excel-kaydet', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { okullar, mod } = req.body;
        if (!Array.isArray(okullar) || okullar.length === 0)
            return res.status(400).json({ hata: 'Kaydedilecek okul yok.' });
        if (mod === 'sifirla') {
            await Okul.deleteMany({});
            await Okul.insertMany(okullar.map(o => ({ il: o.il, ilce: o.ilce, ad: o.ad })));
            res.json({ ok: true, eklenen: okullar.length, atlanan: 0 });
        } else {
            // Mevcut okulları çek, set olarak karşılaştır
            const mevcutlar = await Okul.find({}, 'il ilce ad');
            const mevcutSet = new Set(mevcutlar.map(o => o.il+'||'+o.ilce+'||'+o.ad));
            const yeniler = okullar.filter(o => !mevcutSet.has(o.il+'||'+o.ilce+'||'+o.ad));
            if (yeniler.length > 0) await Okul.insertMany(yeniler.map(o => ({ il: o.il, ilce: o.ilce, ad: o.ad })));
            res.json({ ok: true, eklenen: yeniler.length, atlanan: okullar.length - yeniler.length });
        }
    } catch (err) {
        console.error('[Okul Kayıt Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

// ── Excel'den Ünite/Konu Yükleme ─────────────────────────────────────────────

// v4.3.26: Ünite/Konu Excel şablonu indir.
// Tüm kayıtlı üniteler ve konuları, yükleme formatında bir Excel dosyasına
// yazılır. Boş başlık satırı + her konu ayrı satır.
// Sütunlar: Sınıf | Ders | Ünite No | Ünite Adı | Konu
router.get('/unite-sablon-indir', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const XLSX = require('xlsx');
        const uniteler = await Unite.find().sort({ sinif: 1, ders: 1, uniteNo: 1 }).lean();
        const satirlar = [['Sınıf', 'Ders', 'Ünite No', 'Ünite Adı', 'Konu', 'Öğrenme Çıktıları', 'Süreç Bileşenleri']];
        if (uniteler.length === 0) {
            // Kayıt yoksa örnek bir satır koy ki şablon boş olmasın
            satirlar.push(['8', 'Matematik', '1', 'Çarpanlar ve Katlar', 'Asal Çarpanlar', '', '']);
        } else {
            uniteler.forEach(u => {
                const konular = (u.konular && u.konular.length > 0) ? u.konular : [''];
                konular.forEach((konu, idx) => {
                    if (idx === 0) {
                        // İlk konu satırında ünite bilgileri yazılır
                        satirlar.push([u.sinif || '', u.ders || '', u.uniteNo || '', u.uniteAdi || '', konu || '', '', '']);
                    } else {
                        // Aynı ünitenin diğer konuları — ünite sütunları boş (devam eder)
                        satirlar.push(['', '', '', '', konu || '', '', '']);
                    }
                });
            });
        }
        const ws = XLSX.utils.aoa_to_sheet(satirlar);
        ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 10 }, { wch: 32 }, { wch: 36 }, { wch: 40 }, { wch: 50 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Üniteler');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="unite-konu-sablon.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        console.error('[Ünite Şablon İndir Hatası]', err.message);
        res.status(500).send('Hata: ' + err.message);
    }
});

router.post('/unite-excel-yukle', uploadExcel.single('excelDosyasi'), async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        if (!req.file) return res.status(400).json({ hata: 'Excel dosyası seçilmedi.' });
        const XLSX = require('xlsx');
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const satirlar = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        let sonSinif = '', sonDers = '', sonUnite = '', sonUniteAdi = '';
        const uniteMap = {};
        for (let i = 1; i < satirlar.length; i++) {
            const s = satirlar[i];
            if (!s || s.every(h => !h)) continue;
            const sinif    = s[0] != null ? String(s[0]).trim() : sonSinif;
            const ders     = s[1] != null ? String(s[1]).trim() : sonDers;
            const uniteStr = s[2] != null ? String(s[2]).trim() : sonUnite;
            const uniteAdi = s[3] != null ? String(s[3]).trim() : sonUniteAdi;
            const konu     = s[4] != null ? String(s[4]).trim() : '';
            if (!ders && !uniteStr && !uniteAdi) continue;
            const uniteNoEslesen = uniteStr.match(/^(\d+)/);
            const uniteNo = uniteNoEslesen ? parseInt(uniteNoEslesen[1]) : 0;
            const anahtar = `${sinif}||${ders}||${uniteNo}||${uniteAdi || uniteStr}`;
            if (!uniteMap[anahtar]) {
                uniteMap[anahtar] = { sinif, ders, uniteNo, uniteAdi: uniteAdi || uniteStr, konular: [] };
            }
            if (konu) uniteMap[anahtar].konular.push(konu);
            sonSinif = sinif; sonDers = ders; sonUnite = uniteStr; sonUniteAdi = uniteAdi;
        }
        const onizleme = Object.values(uniteMap);
        res.json({ ok: true, onizleme, toplamUnite: onizleme.length, toplamKonu: onizleme.reduce((t, u) => t + u.konular.length, 0) });
    } catch (err) {
        console.error('[Excel Yükleme Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

router.post('/unite-kaydet', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { uniteler, mod } = req.body;
        if (!Array.isArray(uniteler) || uniteler.length === 0)
            return res.status(400).json({ hata: 'Kaydedilecek ünite yok.' });
        if (mod === 'sifirla') await Unite.deleteMany({});
        // v4.3.27: 'sinif' alanı eklendi — Excel'den okunan sınıf bilgisi
        // önceki sürümde kaydedilmiyordu (map içinde atlanmıştı).
        const kayitlar = uniteler.map(u => ({
            sinif: (u.sinif != null ? String(u.sinif).trim() : ''),
            ders: u.ders || 'Belirtilmedi',
            uniteNo: parseInt(u.uniteNo) || 0,
            uniteAdi: u.uniteAdi,
            konular: u.konular || []
        }));
        await Unite.insertMany(kayitlar);
        res.json({ ok: true, kaydedilen: kayitlar.length });
    } catch (err) {
        console.error('[Ünite Kayıt Hatası]', err.message);
        res.status(500).json({ hata: err.message });
    }
});

// v4.8.17: Manuel unite ekleme — Excel akisina dokunmadan tek unite kaydeder.
// Konular tek metin alaninda satir satir veya virgulle ayrilmis gelir
// (unite-guncelle ile ayni bicim).
router.post('/unite-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { sinif, ders, uniteNo, uniteAdi, konularMetin } = req.body;
        if (!uniteAdi || !String(uniteAdi).trim())
            return res.send("<script>alert('Ünite adı zorunlu.'); window.history.back();</script>");
        const konular = (konularMetin || '')
            .split(/[\n,]+/)
            .map(x => x.trim())
            .filter(Boolean);
        await new Unite({
            sinif:    (sinif || '').trim(),
            ders:     (ders || '').trim() || 'Belirtilmedi',
            uniteNo:  parseInt(uniteNo) || 0,
            uniteAdi: String(uniteAdi).trim(),
            konular:  konular
        }).save();
        res.redirect('/admin?mod=uniteler');
    } catch (err) {
        console.error('[Ünite Ekle Hatası]', err.message);
        res.status(500).send('Hata: ' + err.message);
    }
});

router.post('/unite-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Unite.findByIdAndDelete(req.body.id);
        res.redirect('/admin?mod=uniteler');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.26: Ünite düzenle — sınıf, ders, ünite no, ünite adı ve konular güncellenir.
// Konular tek bir metin alanında satır satır veya virgülle ayrılmış gelir.
router.post('/unite-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { id, sinif, ders, uniteNo, uniteAdi, konularMetin } = req.body;
        if (!id) return res.status(400).send('Ünite id eksik.');
        // Konular: satır sonu veya virgülle ayrılmış → temiz dizi
        const konular = (konularMetin || '')
            .split(/[\n,]+/)
            .map(x => x.trim())
            .filter(Boolean);
        await Unite.findByIdAndUpdate(id, {
            sinif:    (sinif || '').trim(),
            ders:     (ders || '').trim() || 'Belirtilmedi',
            uniteNo:  parseInt(uniteNo) || 0,
            uniteAdi: (uniteAdi || '').trim(),
            konular:  konular
        });
        res.redirect('/admin?mod=uniteler');
    } catch (err) {
        console.error('[Ünite Güncelle Hatası]', err.message);
        res.status(500).send('Hata: ' + err.message);
    }
});

// ── Sınıfa göre ünite/konu verisi ────────────────────────────────────────────
// v4.8.7: Konu Izinleri — agac verisi (Unite'den beslenir, durum KonuIzin'den).
router.get('/admin/konu-izinleri-veri', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const uniteler = await Unite.find().sort({ sinif: 1, ders: 1, uniteNo: 1 }).lean();
        const izinler  = await KonuIzin.find().lean();
        const kapaliSet = new Set();
        izinler.forEach(z => {
            if (z.acik === false) kapaliSet.add((z.sinif||'')+'|'+(z.ders||'')+'|'+(z.unite||'')+'|'+(z.konu||''));
        });
        const agac = uniteler.map(u => ({
            sinif: String(u.sinif||''), ders: u.ders||'', unite: u.uniteAdi||'', uniteNo: u.uniteNo||0,
            konular: (u.konular||[]).map(kn => ({
                konu: kn,
                acik: !kapaliSet.has((String(u.sinif||''))+'|'+(u.ders||'')+'|'+(u.uniteAdi||'')+'|'+kn)
            }))
        }));
        res.json({ ok: true, agac });
    } catch (e) {
        console.error('[konu-izinleri-veri] HATA:', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// v4.8.7: Konu Izinleri — kaydet. Body: { kapalilar: [{sinif,ders,unite,konu}] }.
router.post('/admin/konu-izinleri-kaydet', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const kapalilar = Array.isArray(req.body.kapalilar) ? req.body.kapalilar : [];
        await KonuIzin.deleteMany({});
        if (kapalilar.length) {
            const docs = kapalilar.map(x => ({
                sinif: String(x.sinif||''), ders: String(x.ders||''),
                unite: String(x.unite||''), konu: String(x.konu||''), acik: false
            }));
            await KonuIzin.insertMany(docs);
        }
        res.json({ ok: true, kapaliSayisi: kapalilar.length });
    } catch (e) {
        console.error('[konu-izinleri-kaydet] HATA:', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

// v4.8.13: Soru Dagilim raporu — (sinif,ders,unite,konu) basina soru sayisi.
router.get('/admin/soru-dagilim-veri', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const grup = await Soru.aggregate([
            { $group: {
                _id: { sinif: '$sinif', ders: '$ders', unite: '$unite', konu: '$konu' },
                toplam: { $sum: 1 },
                yayinda: { $sum: { $cond: [{ $eq: ['$durum', 'yayinda'] }, 1, 0] } }
            } }
        ]);
        const sayiMap = {};
        let toplamDB = 0, yayindaDB = 0;
        grup.forEach(g => {
            const id = g._id || {};
            const key = (id.sinif||'')+'|'+(id.ders||'')+'|'+(id.unite||'')+'|'+(id.konu||'');
            sayiMap[key] = { toplam: g.toplam, yayinda: g.yayinda };
            toplamDB += g.toplam; yayindaDB += g.yayinda;
        });
        const uniteler = await Unite.find().sort({ sinif: 1, ders: 1, uniteNo: 1 }).lean();
        const satirlar = [];
        let raporToplam = 0;
        uniteler.forEach(u => {
            (u.konular || []).forEach(kn => {
                const key = (String(u.sinif||''))+'|'+(u.ders||'')+'|'+(u.uniteAdi||'')+'|'+kn;
                const s = sayiMap[key] || { toplam: 0, yayinda: 0 };
                raporToplam += s.toplam;
                satirlar.push({
                    sinif: String(u.sinif||''), ders: u.ders||'', unite: u.uniteAdi||'',
                    uniteNo: u.uniteNo||0, konu: kn, toplam: s.toplam, yayinda: s.yayinda
                });
            });
        });
        res.json({ ok: true, satirlar, toplamDB, yayindaDB, eslesmeyen: Math.max(0, toplamDB - raporToplam) });
    } catch (e) {
        console.error('[soru-dagilim-veri] HATA:', e.message);
        res.status(500).json({ ok: false, hata: e.message });
    }
});

router.get('/api/unite-bilgi', async (req, res) => {
    try {
        const { sinif } = req.query;
        // v4.3.29: Tüm ünitelerden sınıf listesi (sınıf/ders dropdownları için)
        const tumU = await Unite.find({}, 'sinif ders').lean();
        const siniflar = [...new Set(tumU.map(u => u.sinif).filter(Boolean).map(String))].sort();
        let uniteler;
        if (sinif) {
            uniteler = await Unite.find({
                $or: [{ sinif: String(sinif) }, { sinif: Number(sinif) }, { sinif: '' }, { sinif: null }]
            }).sort({ ders:1, uniteNo:1 });
        } else {
            uniteler = await Unite.find().sort({ ders:1, uniteNo:1 });
        }
        const dersler = [...new Set(uniteler.map(u => u.ders).filter(Boolean))];
        res.json({ ok: true, siniflar, dersler, uniteler });
    } catch (err) {
        res.status(500).json({ ok: false, hata: err.message });
    }
});

router.get('/api/soru/:id', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const s = await Soru.findById(req.params.id);
        if (!s) return res.status(404).json({ hata: 'Soru bulunamadı' });
        res.json(s);
    } catch (err) { res.status(500).json({ hata: err.message }); }
});

// TEK SEFERLİK MIGRATION v4 — çalıştır sonra sil
router.post('/referans-uret', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const adet = Math.min(parseInt(req.body.adet) || 1, 500);
        // v4.3.2: 'kurumsal' tipi de eklendi. v4.3.25: 'veli' tipi de eklendi.
        const gecerliTipler = ['ogrenci', 'ogretmen', 'kurumsal', 'veli', 'demo'];
        const tip = gecerliTipler.includes(req.body.tip) ? req.body.tip : 'ogrenci';
        await referansKoduUret('admin', adet, tip);
        res.redirect('/admin?mod=referans');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// ── Haberler & Duyurular CRUD ──
router.post('/haber-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const baslik = (req.body.baslik || '').trim();
        const icerik = (req.body.icerik || '').trim();
        if (!baslik || !icerik) {
            return res.send("<script>alert('Başlık ve içerik boş olamaz.'); window.history.back();</script>");
        }
        await new Haber({ baslik, icerik, olusturan: 'admin' }).save();
        res.redirect('/admin?mod=haberler');
    } catch (err) {
        console.error('[haber-ekle] hata:', err.message);
        res.status(500).send("Hata: " + err.message);
    }
});

router.post('/haber-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Haber.deleteOne({ _id: req.body.id });
        res.redirect('/admin?mod=haberler');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/haber-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const baslik = (req.body.baslik || '').trim();
        const icerik = (req.body.icerik || '').trim();
        if (!baslik || !icerik) {
            return res.send("<script>alert('Başlık ve içerik boş olamaz.'); window.history.back();</script>");
        }
        await Haber.updateOne({ _id: req.body.id }, { baslik, icerik });
        res.redirect('/admin?mod=haberler');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Genel kullanıcılar için haberleri JSON döner (panel sekmesinde gösterilir)
router.get('/api/haberler', async (req, res) => {
    try {
        const liste = await Haber.find().sort({ yayinTarih: -1 }).limit(50).lean();
        res.json({ ok: true, haberler: liste });
    } catch (err) {
        res.json({ ok: false, hata: err.message });
    }
});

// ── Mesajlar (İletişim Formu) ──
// Public POST: ziyaretçi formdan mesaj gönderir
router.post('/iletisim-gonder', async (req, res) => {
    try {
        const adSoyad = (req.body.adSoyad || '').trim();
        const email   = (req.body.email   || '').trim();
        const telefon = (req.body.telefon || '').trim();
        const konu    = (req.body.konu    || '').trim();
        const mesaj   = (req.body.mesaj   || '').trim();

        // Zorunlu: adSoyad + email + mesaj
        if (!adSoyad) return res.status(400).send("<script>alert('Ad-Soyad alanı zorunludur.'); window.history.back();</script>");
        if (!email)   return res.status(400).send("<script>alert('E-posta alanı zorunludur.'); window.history.back();</script>");
        if (!mesaj)   return res.status(400).send("<script>alert('Mesaj alanı zorunludur.'); window.history.back();</script>");

        // Hatalı soru bildirimi ise, kullanıcının "------- Açıklamam -------" altına bir şey yazmış olması zorunlu
        if (req.body.hataBildirimi === '1') {
            const ayrac = '------- Açıklamam -------';
            const idx = mesaj.indexOf(ayrac);
            if (idx === -1) {
                return res.status(400).send("<script>alert('Mesaj şablonu bozulmuş, lütfen formu yeniden açın.'); window.history.back();</script>");
            }
            const aciklama = mesaj.substring(idx + ayrac.length).trim();
            if (!aciklama || aciklama.length < 3) {
                return res.status(400).send("<script>alert('Lütfen \"Açıklamam\" satırından sonra hatayı detaylı açıklayın. Boş gönderim yapılamaz.'); window.history.back();</script>");
            }
        }

        // Basit e-posta formatı
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("<script>alert('Geçerli bir e-posta adresi girin.'); window.history.back();</script>");
        }
        // Aşırı uzun girişlere karşı limit
        if (adSoyad.length > 100 || email.length > 200 || telefon.length > 30 || konu.length > 200 || mesaj.length > 5000) {
            return res.status(400).send("<script>alert('Bir veya birden fazla alan çok uzun.'); window.history.back();</script>");
        }

        await new Mesaj({ adSoyad, email, telefon, konu, mesaj }).save();
        res.send("<!DOCTYPE html><html lang='tr'><head><meta charset='UTF-8'><title>Mesaj gönderildi</title><link rel='stylesheet' href='/style.css'></head><body style='font-family:sans-serif; padding:60px 20px; text-align:center;'><div style='max-width:480px; margin:0 auto; background:white; border-radius:14px; padding:40px 28px; box-shadow:0 4px 20px rgba(0,0,0,0.08);'><div style='font-size:48px; margin-bottom:14px;'>✉️</div><h2 style='color:#2e7d32; margin:0 0 10px;'>Mesajınız gönderildi</h2><p style='color:#666; line-height:1.6;'>İletişim formundan gönderdiğiniz mesaj başarıyla iletildi. En kısa sürede dönüş yapılacaktır.</p><div style='margin-top:24px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;'><a href='/' style='padding:10px 22px; background:#1a73e8; color:white; border-radius:8px; text-decoration:none; font-weight:500;'>Ana Sayfaya Dön</a><a href='/iletisim' style='padding:10px 22px; background:#f0f0f0; color:#333; border-radius:8px; text-decoration:none; font-weight:500;'>Yeni Mesaj Gönder</a></div></div></body></html>");
    } catch (err) {
        console.error('[iletisim-gonder] hata:', err.message);
        res.status(500).send("Hata: " + err.message);
    }
});

// Admin: mesajı okundu işaretle (POST)
router.post('/mesaj-okundu', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Mesaj.updateOne({ _id: req.body.id }, { okundu: true });
        res.redirect('/admin?mod=mesajlar');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Admin: mesajı sil
router.post('/mesaj-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await Mesaj.deleteOne({ _id: req.body.id });
        res.redirect('/admin?mod=mesajlar');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/referans-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await ReferansKodu.deleteOne({ _id: req.body.id, kullanildi: false });
        res.redirect('/admin?mod=referans');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/referans-toplu-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        await ReferansKodu.deleteMany({ kullanildi: false });
        res.redirect('/admin?mod=referans');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Admin: referans linki kopyalandı bildirimi (kalıcı işaretle)
router.post('/admin-referans-kopyalandi', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    console.log('[admin-referans-kopyalandi] istek:', { kod: req.body && req.body.kod });
    try {
        const kod = (req.body.kod || '').trim();
        if (!kod) return res.status(400).json({ ok: false, hata: 'kod_bos' });
        const ref = await ReferansKodu.findOne({ kod });
        if (!ref) {
            console.warn('[admin-referans-kopyalandi] kod bulunamadı:', kod);
            return res.status(404).json({ ok: false, hata: 'kod_bulunamadi' });
        }
        if (!ref.kopyalandi) {
            ref.kopyalandi = true;
            ref.kopyalanmaTarih = new Date();
            await ref.save();
            console.log('[admin-referans-kopyalandi] kalıcı işaretlendi:', kod);
        } else {
            // Zaten işaretliyse de tarihi güncelle (admin'in son kopyalama zamanı)
            ref.kopyalanmaTarih = new Date();
            await ref.save();
            console.log('[admin-referans-kopyalandi] tarih güncellendi:', kod);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('[admin-referans-kopyalandi] hata:', err && err.stack || err);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Numarasız soruları onar — _id sırasıyla soruNo atar
router.post('/soru-no-onar', async (req, res) => {    if (!adminKontrol(req, res)) return;
    try {
        const numarasiz = await Soru.find({ $or: [{ soruNo: { $exists: false } }, { soruNo: null }] }).sort({ _id: 1 }).select('_id soruNo durum sinif ders');
        console.log('[soru-no-onar] numarasız bulunan:', numarasiz.length);
        if (numarasiz.length === 0) {
            return res.send('<script>alert("Numarasız soru yok, hepsi düzgün."); window.location.href="/admin?mod=soruListesi";</script>');
        }
        const maxSoru = await Soru.findOne({ soruNo: { $exists: true, $ne: null } }).sort({ soruNo: -1 }).select('soruNo').lean();
        let baslangic = (maxSoru && maxSoru.soruNo) ? maxSoru.soruNo + 1 : 1;
        console.log('[soru-no-onar] başlangıç numarası:', baslangic, '| mevcut max:', maxSoru ? maxSoru.soruNo : 'yok');
        let basariliSayi = 0, hataliSayi = 0;
        for (const s of numarasiz) {
            try {
                const sonuc = await Soru.collection.updateOne({ _id: s._id }, { $set: { soruNo: baslangic } });
                console.log('  →', s._id.toString(), '| #'+baslangic, '| matched:', sonuc.matchedCount, '| modified:', sonuc.modifiedCount, '|', s.sinif, s.ders, s.durum);
                if (sonuc.modifiedCount > 0) basariliSayi++;
                else hataliSayi++;
                baslangic++;
            } catch (e) {
                console.error('  ❌', s._id.toString(), '| hata:', e.message);
                hataliSayi++;
            }
        }
        console.log('[soru-no-onar] tamamlandı | başarılı:', basariliSayi, '| başarısız:', hataliSayi);
        const mesaj = basariliSayi + ' soruya numara atandı.' + (hataliSayi > 0 ? ' (' + hataliSayi + ' başarısız - log\\u0027a bak)' : '');
        res.send('<script>alert("' + mesaj + '"); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) {
        console.error('[soru-no-onar] hata:', err && err.stack || err);
        res.status(500).send("Hata: " + err.message);
    }
});

// LaTeX backslash onarımı: $rac{ → $\frac{, $qrt{ → $\sqrt{ vb.
// PDF yükleme sırasında JSON parse'ın yutmuş olduğu \f \b \v karakterlerini geri getirir
router.post('/soru-latex-onar', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const sorular = await Soru.find({});
        const onarKomut = function(metin) {
            if (!metin || typeof metin !== 'string') return { metin: metin, degisti: false };
            let yeni = metin;
            // $ ... $ blokları içinde kayıp backslash'ları geri ekle
            // \frac yutulmuş: rac{...}{...}  →  \frac{...}{...}
            yeni = yeni.replace(/\$([^$]*)\$/g, function(blok, ic) {
                let d = ic
                    .replace(/\\rac\{/g, '\\frac{')
                    .replace(/\\qrt\{/g, '\\sqrt{')
                    .replace(/\\qrt\[/g, '\\sqrt[')
                    .replace(/\\inom\{/g, '\\binom{')
                    .replace(/\\oxed\{/g, '\\boxed{')
                    .replace(/\\orall\b/g, '\\forall')
                    .replace(/(^|[^a-zA-Z\\])rac\{/g, '$1\\frac{')
                    .replace(/(^|[^a-zA-Z\\])qrt\{/g, '$1\\sqrt{')
                    .replace(/(^|[^a-zA-Z\\])qrt\[/g, '$1\\sqrt[')
                    .replace(/(^|[^a-zA-Z\\])inom\{/g, '$1\\binom{')
                    .replace(/(^|[^a-zA-Z\\])oxed\{/g, '$1\\boxed{')
                    .replace(/(^|[^a-zA-Z\\])eta\b/g, '$1\\beta')
                    .replace(/(^|[^a-zA-Z\\])orall\b/g, '$1\\forall');
                return '$' + d + '$';
            });
            return { metin: yeni, degisti: yeni !== metin };
        };
        let degisen = 0, taranan = 0;
        for (const s of sorular) {
            taranan++;
            let degistiBu = false;
            ['soruMetni','soruOnculu1','soruOnculu2','soruOnculu3'].forEach(function(alan) {
                const r = onarKomut(s[alan]);
                if (r.degisti) { s[alan] = r.metin; degistiBu = true; }
            });
            if (Array.isArray(s.secenekler)) {
                s.secenekler.forEach(function(sik) {
                    const r = onarKomut(sik.metin);
                    if (r.degisti) { sik.metin = r.metin; degistiBu = true; }
                });
                if (degistiBu) s.markModified('secenekler');
            }
            if (degistiBu) { await s.save(); degisen++; }
        }
        console.log('[soru-latex-onar] taranan: %d | onarılan: %d', taranan, degisen);
        res.send('<script>alert("' + degisen + ' soruda LaTeX onarıldı (toplam ' + taranan + ' tarandı)."); window.location.href="/admin?mod=soruListesi";</script>');
    } catch (err) {
        console.error('[soru-latex-onar] hata:', err && err.stack || err);
        res.status(500).send("Hata: " + err.message);
    }
});

router.post('/kullanici-rol', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { kullaniciAdi, il, ilce, okul, yeniRol: yeniRolForm } = req.body;
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send('Kullanıcı bulunamadı');
        // Form'dan gelen geçerli bir rol varsa onu kullan; yoksa eski toggle davranışı
        const gecerliRoller = ['ogrenci', 'ogretmen', 'moderator', 'kurumsal'];
        let yeniRol;
        if (gecerliRoller.indexOf(yeniRolForm) !== -1) {
            yeniRol = yeniRolForm;
        } else {
            // Geriye dönük: form'da yeniRol yoksa moderator toggle (eski Mod Al/Ver davranışı)
            yeniRol = (k.rol === 'moderator') ? 'ogrenci' : 'moderator';
        }
        await Kullanici.updateOne({ kullaniciAdi }, { rol: yeniRol });
        const params = new URLSearchParams({ mod: 'kullanicilar' });
        if (il) params.set('il', il);
        if (ilce) params.set('ilce', ilce);
        if (okul) params.set('okul', okul);
        res.redirect('/admin?' + params.toString());
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.get('/kullanici-detay', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const k = await Kullanici.findOne({ kullaniciAdi: req.query.kullaniciAdi });
        if (!k) return res.status(404).send('Kullanıcı bulunamadı');
        const CevapKaydi = require('../models/CevapKaydi');
        const Soru = require('../models/Soru');
        const tumCevaplar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }).sort({ tarih: -1 }).lean();
        // v4.3.57: Sayfalama - 30 cevap/sayfa, ?sayfa=N parametresi
        const SAYFA_BOYUTU = 30;
        const toplamSayfa = Math.max(1, Math.ceil(tumCevaplar.length / SAYFA_BOYUTU));
        let sayfa = parseInt(req.query.sayfa) || 1;
        if (sayfa < 1) sayfa = 1;
        if (sayfa > toplamSayfa) sayfa = toplamSayfa;
        // Sadece görünür sorular için Soru sorgusu yap (performans)
        const sayfaBasi = (sayfa - 1) * SAYFA_BOYUTU;
        const sayfaSonu = sayfaBasi + SAYFA_BOYUTU;
        const sayfaCevaplar = tumCevaplar.slice(sayfaBasi, sayfaSonu);
        const soruIdleri = [...new Set(sayfaCevaplar.map(c => String(c.soruId)))];
        const sorular = soruIdleri.length > 0 ? await Soru.find({ _id: { $in: soruIdleri } }, 'ders unite konu soruMetni _id').lean() : [];
        const soruMap = {};
        sorular.forEach(s => { soruMap[String(s._id)] = s; });
        const tumOkullar = await Okul.find().sort({ il: 1, ilce: 1, ad: 1 });
        const iller = [...new Set(tumOkullar.map(o => o.il).filter(Boolean))].sort();
        res.render('admin-kullanici-detay', {
            k, tumCevaplar, sayfaCevaplar, soruMap, tumOkullar, iller,
            sayfa, toplamSayfa, sayfaBoyutu: SAYFA_BOYUTU, toplamCevap: tumCevaplar.length,
            adminToken: req.headers.authorization ? req.headers.authorization.replace('Basic ', '') : ''
        });
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/kullanici-guncelle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { kullaniciAdi, il, ilce, okul, sinif, sube } = req.body;
        await Kullanici.updateOne({ kullaniciAdi }, { il, ilce, okul, sinif: parseInt(sinif)||8, sube: sube||'' });
        res.redirect('/kullanici-detay?kullaniciAdi=' + encodeURIComponent(kullaniciAdi));
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Kullanıcının rolünü değiştir (ogrenci ↔ ogretmen)
router.post('/kullanici-rol-degistir', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    try {
        const { kullaniciAdi, yeniRol } = req.body;
        const gecerliRoller = ['ogrenci', 'ogretmen', 'moderator', 'kurumsal'];
        if (!gecerliRoller.includes(yeniRol)) return res.status(400).send('Geçersiz rol.');
        const sonuc = await Kullanici.updateOne({ kullaniciAdi }, { rol: yeniRol });
        if (sonuc.matchedCount === 0) return res.status(404).send('Kullanıcı bulunamadı.');
        const geri = req.body.geri || '/admin?mod=kullanicilar';
        res.redirect(geri);
    } catch (err) {
        console.error('[kullanici-rol-degistir] hata:', err.message);
        res.status(500).send("Hata: " + err.message);
    }
});

router.post('/yasakli-ekle', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    if (!YasakliKelime) return res.redirect('/admin?mod=kullanicilar');
    try {
        const kelime = (req.body.kelime || '').trim().toLowerCase();
        if (kelime) await YasakliKelime.updateOne({ kelime }, { kelime }, { upsert: true });
        res.redirect('/admin?mod=kullanicilar');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/yasakli-sil', async (req, res) => {
    if (!adminKontrol(req, res)) return;
    if (!YasakliKelime) return res.redirect('/admin?mod=kullanicilar');
    try {
        await YasakliKelime.deleteOne({ _id: req.body.id });
        res.redirect('/admin?mod=kullanicilar');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// ── v4.3.45: Puanlama simülasyonu ─────────────────────────────────────────
// v4.3.42'deki puan formülünü (Z = cron Z) gerçek cevap geçmişine uygular
// ve eski/yeni puanları karşılaştırır. HİÇBİR ŞEY YAZMAZ — sadece okur.
// Deploy etmeden önce sonuçları görmek için araç.
function stdSapmaSim(dizi) {
    if (!dizi || dizi.length < 2) return 0;
    const ort = dizi.reduce((a, b) => a + b, 0) / dizi.length;
    const varyans = dizi.reduce((a, b) => a + Math.pow(b - ort, 2), 0) / dizi.length;
    return Math.sqrt(varyans);
}

router.get('/admin/puan-simulasyon', async (req, res) => {
    try {
        // v4.3.46: Yetki kontrolü diğer admin route'larıyla aynı — adminKontrol.
        if (!adminKontrol(req, res)) return;
        // v4.3.47: Sıralama gerçek sistemle aynı mantıkta hesaplanıyor:
        //   - Sadece nitelikli (>=10 doğru cevap) öğrenciler sıralanır
        //   - Sıralama kriteri "ortToplam" — her dersin (toplamPuan/soruSayisi)
        //     ortalamasının toplamı. Bu, gerçek Türkiye sıralamasıyla eşleşir.
        const MIN_SORU = 10;

        const tumOgrenciler = await Kullanici.find({ rol: 'ogrenci' }, 'kullaniciAdi puan il dersPuanlari').lean();

        const tumSorular = await Soru.find({}, 'ders ortalamaSure zorlukKatsayisi cozumSureleriTum').lean();
        const soruMap = {};
        tumSorular.forEach(s => { soruMap[String(s._id)] = s; });

        const sonuclar = [];
        for (const k of tumOgrenciler) {
            const kayitlar = await CevapKaydi.find(
                { kullaniciAdi: k.kullaniciAdi, dogruMu: true },
                'soruId sure'
            ).lean();

            // YENİ: ders bazlı toplam puan + soru sayısı
            const yeniDersMap = {};
            let yeniToplamPuan = 0;
            for (const kayit of kayitlar) {
                const s = soruMap[String(kayit.soruId)];
                if (!s) continue;
                const T_ref = s.ortalamaSure || 60;
                const T_ogr = kayit.sure || T_ref;
                const T_min = 10;
                // v4.5.4: Alt sınır clamp (gerçek puanla aynı olsun).
                const T_ogr_eff = Math.max(T_ogr, T_min);
                const logHiz = Math.log2(1 + (T_ref / T_ogr_eff));
                const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
                const hizBileseni = logMax * Math.tanh(logHiz / logMax);
                const Z = (typeof s.zorlukKatsayisi === 'number') ? s.zorlukKatsayisi : 3;
                const sigmaSure = stdSapmaSim(s.cozumSureleriTum || []);
                const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);
                const puan = Math.max(Math.round(Z * T_ref * hizBileseni * GE), 1);
                yeniToplamPuan += puan;

                const ders = s.ders || 'Diğer';
                if (!yeniDersMap[ders]) yeniDersMap[ders] = { toplamPuan: 0, soruSayisi: 0 };
                yeniDersMap[ders].toplamPuan += puan;
                yeniDersMap[ders].soruSayisi += 1;
            }

            // ortToplam — gerçek sistemle aynı: ders ortalamalarının toplamı
            const eskiOrtToplam = (k.dersPuanlari || []).reduce(
                (acc, d) => acc + (d.soruSayisi > 0 ? d.toplamPuan / d.soruSayisi : 0), 0);
            const yeniOrtToplam = Object.values(yeniDersMap).reduce(
                (acc, d) => acc + (d.soruSayisi > 0 ? d.toplamPuan / d.soruSayisi : 0), 0);
            const dogruSayisi = kayitlar.length;
            const nitelikli = dogruSayisi >= MIN_SORU;

            sonuclar.push({
                kullaniciAdi: k.kullaniciAdi,
                il: k.il || '-',
                eskiPuan: k.puan || 0,
                yeniPuan: yeniToplamPuan,
                eskiOrtToplam,
                yeniOrtToplam,
                dogruCevapSayisi: dogruSayisi,
                nitelikli
            });
        }

        // Sıralama: sadece NİTELİKLİ olanlar (gerçek sistem mantığı)
        const eskiSiralama = sonuclar.filter(s => s.nitelikli).sort((a, b) => b.eskiOrtToplam - a.eskiOrtToplam);
        const yeniSiralama = sonuclar.filter(s => s.nitelikli).sort((a, b) => b.yeniOrtToplam - a.yeniOrtToplam);
        const eskiSiraMap = {};
        const yeniSiraMap = {};
        eskiSiralama.forEach((s, i) => { eskiSiraMap[s.kullaniciAdi] = i + 1; });
        yeniSiralama.forEach((s, i) => { yeniSiraMap[s.kullaniciAdi] = i + 1; });

        const filtreStr = (req.query.kullanici || '').trim();
        let goster = sonuclar;
        if (filtreStr) {
            const filtre = filtreStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            goster = sonuclar.filter(s => filtre.includes(s.kullaniciAdi.toLowerCase()));
        }

        const tablo = goster
            .map(s => ({
                ...s,
                eskiSira: s.nitelikli ? eskiSiraMap[s.kullaniciAdi] : null,
                yeniSira: s.nitelikli ? yeniSiraMap[s.kullaniciAdi] : null
            }))
            .sort((a, b) => {
                if (a.nitelikli && b.nitelikli) return a.yeniSira - b.yeniSira;
                if (a.nitelikli) return -1;
                if (b.nitelikli) return 1;
                return b.yeniPuan - a.yeniPuan;
            });

        res.render('admin-puan-simulasyon', {
            tablo,
            filtreStr,
            toplamOgrenci: sonuclar.length,
            nitelikliSayisi: eskiSiralama.length,
            anaSiralamaTepeEskiYeni: { eski: eskiSiralama.slice(0,5), yeni: yeniSiralama.slice(0,5) }
        });
    } catch (err) {
        console.error('[puan-simulasyon] hata:', err);
        res.status(500).send('Hata: ' + err.message);
    }
});

// ── v4.3.48: Soru puan detayı ─────────────────────────────────────────────
// En az 1 kez çözülmüş tüm soruların:
//   - Cron Z'si (formülde kullanılan değer)
//   - Ham puan (doğru cevap ortalama puanı)
//   - Puan formülü adım adım (T_ref, hizBileseni faktörü, sigmaSure, GE)
//   - Çözüm sayısı, doğru sayısı, doğru oranı
// gösterilir. SALT-OKUNUR.
router.get('/admin/soru-puan-detay', async (req, res) => {
    try {
        if (!adminKontrol(req, res)) return;

        const sorular = await Soru.find({ cozulmeSayisi: { $gt: 0 } },
            'soruMetni ders unite konu sinif zorlukKatsayisi hamPuan ortalamaSure cozulmeSayisi dogruSayisi cozumSureleriTum'
        ).lean();

        // Sıralama: zorluğa göre azalan, sonra ham puana göre azalan
        sorular.sort((a, b) => {
            const za = a.zorlukKatsayisi || 0, zb = b.zorlukKatsayisi || 0;
            if (zb !== za) return zb - za;
            return (b.hamPuan || 0) - (a.hamPuan || 0);
        });

        // Her soru için puan formülü kırılımı hesapla
        // ÖRNEK öğrenci süresi = T_ref (ortalama hızda)
        const tablo = sorular.map(s => {
            const T_ref = s.ortalamaSure || 60;
            const T_ogr = T_ref; // örnek: ortalama hızdaki bir öğrenci
            const T_min = 10;
            // v4.5.4: Alt sınır clamp (formül tüm kod tabanında tek-tip kalsın
            // diye eklendi; burada T_ogr=T_ref≥60 olduğundan davranış değişmez).
            const T_ogr_eff = Math.max(T_ogr, T_min);
            const logHiz = Math.log2(1 + (T_ref / T_ogr_eff));
            const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
            const hizBileseni = logMax * Math.tanh(logHiz / logMax);
            const Z = (typeof s.zorlukKatsayisi === 'number') ? s.zorlukKatsayisi : 3;
            const sigmaSure = stdSapmaSim(s.cozumSureleriTum || []);
            const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);
            const ornekPuan = Math.max(Math.round(Z * T_ref * hizBileseni * GE), 1);

            const dogruOrani = s.cozulmeSayisi > 0
                ? Math.round((s.dogruSayisi || 0) / s.cozulmeSayisi * 100)
                : 0;

            // Etiket
            let etiket = '-';
            if (Z < 1.5) etiket = 'Çok Kolay';
            else if (Z < 2.5) etiket = 'Kolay';
            else if (Z < 3.5) etiket = 'Orta';
            else if (Z < 4.5) etiket = 'Zor';
            else etiket = 'Çok Zor';

            return {
                id: String(s._id),
                ders: s.ders || '-',
                sinif: s.sinif || '-',
                unite: s.unite || '-',
                konu: s.konu || '-',
                soruOzet: (s.soruMetni || '').replace(/<[^>]+>/g, '').trim().slice(0, 60),
                Z: Number(Z.toFixed(2)),
                etiket,
                hamPuan: s.hamPuan != null ? Math.round(s.hamPuan * 10) / 10 : null,
                cozulme: s.cozulmeSayisi || 0,
                dogru: s.dogruSayisi || 0,
                dogruOrani,
                T_ref: Math.round(T_ref),
                sigmaSure: Math.round(sigmaSure * 10) / 10,
                hizBileseni: Math.round(hizBileseni * 1000) / 1000,
                GE: Math.round(GE * 1000) / 1000,
                ornekPuan, // ortalama hızdaki öğrenci için hesaplanan örnek puan
                // 50'den az çözüm varsa Z 3'e doğru çekildi (yapışkanlık)
                // v4.3.49: MINIMUM_COZUM=5'e indirildi — yapışkanlık eşiği de 5
                yapiskanlik: s.cozulmeSayisi < 5
            };
        });

        // Filtreler — ders, sınıf, zorluk aralığı (URL ile)
        const fDers = (req.query.ders || '').trim();
        const fSinif = (req.query.sinif || '').trim();
        const fZorlukMin = parseFloat(req.query.zMin) || 0;
        const fZorlukMax = parseFloat(req.query.zMax) || 5;
        let goster = tablo;
        if (fDers) goster = goster.filter(s => s.ders === fDers);
        if (fSinif) goster = goster.filter(s => String(s.sinif) === fSinif);
        goster = goster.filter(s => s.Z >= fZorlukMin && s.Z <= fZorlukMax);

        // Filtre seçenekleri için ders/sınıf listeleri
        const dersListesi = [...new Set(tablo.map(s => s.ders))].sort();
        const sinifListesi = [...new Set(tablo.map(s => String(s.sinif)))].sort();

        res.render('admin-soru-puan-detay', {
            tablo: goster,
            toplamSoru: tablo.length,
            gosterilenSoru: goster.length,
            dersListesi, sinifListesi,
            fDers, fSinif, fZorlukMin, fZorlukMax
        });
    } catch (err) {
        console.error('[soru-puan-detay] hata:', err);
        res.status(500).send('Hata: ' + err.message);
    }
});

// v4.3.68: Duplicate soru tespiti (SADECE OKUMA, sil/birleştir yok)
router.get('/admin/duplicate-sorular', async (req, res) => {
    try {
        if (!adminKontrol(req, res)) return;
        const { duplicateBul } = require('../services/duplicateTespit');

        // Filtre opsiyonları (URL parametresi)
        const filDers = req.query.ders || '';
        const benzerlikEsigi = Math.max(0.5, Math.min(1, parseFloat(req.query.esik) || 0.85));

        const sorular = await Soru.find({},
            'soruMetni secenekler ders unite konu sinif soruNo'
        ).lean();

        const filtreliSorular = filDers
            ? sorular.filter(s => s.ders === filDers)
            : sorular;

        const ciftler = duplicateBul(filtreliSorular, { benzerlikEsigi });

        // Her çift için: kaç kullanıcı a'yı, kaç b'yi, kaçı ikisini de çözmüş
        const tumSoruIdleri = [];
        ciftler.forEach(c => {
            tumSoruIdleri.push(String(c.a._id));
            tumSoruIdleri.push(String(c.b._id));
        });
        const benzersizIdler = [...new Set(tumSoruIdleri)];

        // O sorulardaki tüm cevap kayıtlarını çek
        const cevaplar = benzersizIdler.length > 0
            ? await CevapKaydi.find({ soruId: { $in: benzersizIdler } }, 'soruId kullaniciAdi dogruMu').lean()
            : [];

        // Soru ID → kullaniciAdi set
        const soruKullaniciMap = {};
        cevaplar.forEach(cv => {
            const sid = String(cv.soruId);
            if (!soruKullaniciMap[sid]) soruKullaniciMap[sid] = new Set();
            soruKullaniciMap[sid].add(cv.kullaniciAdi);
        });

        // Her çift için cevap istatistiği
        const ciftlerZenginlestirilmis = ciftler.map(c => {
            const idA = String(c.a._id);
            const idB = String(c.b._id);
            const usersA = soruKullaniciMap[idA] || new Set();
            const usersB = soruKullaniciMap[idB] || new Set();
            let cakisan = 0;
            usersA.forEach(u => { if (usersB.has(u)) cakisan++; });
            return {
                ...c,
                aKullaniciSayisi: usersA.size,
                bKullaniciSayisi: usersB.size,
                cakisanSayi: cakisan,
                // Senaryo tespiti
                senaryo: cakisan > 0 ? 'cakisma'
                       : (usersA.size === 0 && usersB.size === 0) ? 'ikisi_de_bos'
                       : (usersA.size === 0 || usersB.size === 0) ? 'biri_bos'
                       : 'ayri_kullanicilar'
            };
        });

        // Ders listesi filtre için
        const tumDersler = [...new Set(sorular.map(s => s.ders).filter(Boolean))].sort();

        res.render('admin-duplicate-sorular', {
            ciftler: ciftlerZenginlestirilmis,
            toplamSoru: sorular.length,
            tumDersler,
            filDers,
            benzerlikEsigi,
            kullaniciAdi: req.session && req.session.kullaniciAdi || 'admin'
        });
    } catch (err) {
        console.error('[duplicate-sorular] hata:', err);
        res.status(500).send('Hata: ' + err.message);
    }
});

// v4.5.3: Bir sorunun çözüm detayları — kim, ne zaman, kaç saniyede çözmüş.
// Zorluk Raporu ve Soru Puan Detayı sayfalarındaki "açılır iç tablo"
// için JSON döner. Sadece DOĞRU cevaplar listelenir.
router.get('/admin/soru-cozumler/:soruId', async (req, res) => {
    try {
        if (!adminKontrol(req, res)) return;
        const soruId = req.params.soruId;
        if (!soruId) return res.status(400).json({ ok: false, hata: 'soruId gerekli' });

        const soru = await Soru.findById(soruId, 'soruMetni ders unite konu soruNo ortalamaSure zorlukKatsayisi').lean();
        if (!soru) return res.status(404).json({ ok: false, hata: 'Soru bulunamadi' });

        // Doğru cevaplar — kullanıcı bilgileriyle birlikte
        const cevaplar = await CevapKaydi.find(
            { soruId, dogruMu: true },
            'kullaniciAdi sure tarih kazanilanPuan ikinciKezMi'
        ).sort({ sure: 1 }).lean(); // hızlıdan yavaşa

        // Kullanıcıların sınıf/okul bilgisi
        const adlar = [...new Set(cevaplar.map(c => c.kullaniciAdi))];
        const kullanicilar = await Kullanici.find(
            { kullaniciAdi: { $in: adlar } },
            'kullaniciAdi sinif sube okul il ilce'
        ).lean();
        const kMap = {};
        kullanicilar.forEach(k => { kMap[k.kullaniciAdi] = k; });

        const liste = cevaplar.map(c => {
            const k = kMap[c.kullaniciAdi] || {};
            return {
                kullaniciAdi: c.kullaniciAdi,
                sinif: k.sinif || '?',
                sube: k.sube || '',
                okul: k.okul || '',
                il: k.il || '',
                ilce: k.ilce || '',
                sure: c.sure || 0,
                tarih: c.tarih,
                kazanilanPuan: c.kazanilanPuan || 0,
                ikinciKezMi: !!c.ikinciKezMi
            };
        });

        res.json({
            ok: true,
            soru: {
                _id: soru._id,
                soruNo: soru.soruNo,
                ders: soru.ders,
                konu: soru.konu,
                ortalamaSure: soru.ortalamaSure || 0,
                zorlukKatsayisi: soru.zorlukKatsayisi || 0
            },
            cozumSayisi: liste.length,
            cozumler: liste
        });
    } catch (err) {
        console.error('[soru-cozumler] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

module.exports = router;
