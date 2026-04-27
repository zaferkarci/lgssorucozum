const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Kullanici = require('../models/Kullanici');
const PasswordReset = require('../models/PasswordReset');
const ReferansKodu = require('../models/ReferansKodu');
const { sifreSifirlamaMailiGonder } = require('../mailGonder');

const SALT_ROUNDS = 10;

// Türkçe karakter dönüşümü
function turkceTemizle(str) {
    return str.toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
        .replace(/İ/g,'i').replace(/Ğ/g,'g').replace(/Ü/g,'u')
        .replace(/Ş/g,'s').replace(/Ö/g,'o').replace(/Ç/g,'c')
        .replace(/[^a-z0-9_.]/g,'');
}

// Yasaklı kelime listesi
const YASAK_KELIMELER = [
    // Sistem
    'admin','root','test','user','sistem','moderator','mod',
    'null','undefined','superuser','support','help',
    // Türkçe küfürler
    'sik','sik','orospu','orsp','got','piç','pic',
    'bok','amk','mk','bok','oç','oc','beyinsiz',
    'gerizekal','salak','aptal','mal','embesil',
    'kahpe','kaltak','s1k','s1ks','b0k','g0t'
];

function kullaniciAdiKontrol(ad) {
    if (!ad || ad.length < 4) return 'Kullanıcı adı en az 4 karakter olmalı.';
    if (ad.length > 20) return 'Kullanıcı adı en fazla 20 karakter olmalı.';
    if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9_.]+$/.test(ad))
        return 'Sadece harf, rakam, _ ve . kullanılabilir.';
    if (/^[0-9]+$/.test(ad))
        return 'Kullanıcı adı sadece rakamdan oluşamaz.';
    if (/^[_.]+$/.test(ad))
        return 'Geçersiz kullanıcı adı.';
    const kucuk = turkceTemizle(ad);
    for (const k of YASAK_KELIMELER) {
        if (kucuk.includes(k)) return 'Bu kullanıcı adı kullanılamaz.';
    }
    return null;
}

// Kullanıcı adı öneri üret
function oneriUret(ad, soyad) {
    const a = turkceTemizle(ad).slice(0, 12);
    const s = turkceTemizle(soyad).slice(0, 12);
    if (!a && !s) return [];
    const rnd = () => Math.floor(Math.random() * 90 + 10);
    const oneriler = [];
    if (a && s) {
        oneriler.push(a + s);
        oneriler.push(a + '.' + s);
        oneriler.push(a + s + rnd());
        oneriler.push(a[0] + s + rnd());
        oneriler.push(a + '_' + s[0] + rnd());
    } else {
        const tek = a || s;
        oneriler.push(tek + rnd());
        oneriler.push(tek + '.' + rnd());
        oneriler.push(tek + '_' + rnd());
    }
    // Küfür filtresi uygula, min 4 karakter
    return oneriler.filter(o => o.length >= 4 && o.length <= 20 && !kullaniciAdiKontrol(o));
}

// API: kullanıcı adı kontrol
router.get('/api/kullaniciadi-kontrol', async (req, res) => {
    const ad = (req.query.ad || '').trim();
    const hata = kullaniciAdiKontrol(ad);
    if (hata) return res.json({ gecerli: false, mesaj: hata });
    const varMi = await Kullanici.findOne({ kullaniciAdi: ad }).lean();
    if (varMi) return res.json({ gecerli: false, mesaj: 'Bu kullanıcı adı alınmış.' });
    return res.json({ gecerli: true, mesaj: 'Kullanılabilir ✓' });
});

// API: kullanıcı adı öner
router.get('/api/kullaniciadi-oner', async (req, res) => {
    const ad = (req.query.ad || '').trim();
    const soyad = (req.query.soyad || '').trim();
    const oneriler = oneriUret(ad, soyad);
    // Alınmış olanları filtrele
    const musait = [];
    for (const o of oneriler) {
        const varMi = await Kullanici.findOne({ kullaniciAdi: o }).lean();
        if (!varMi) musait.push(o);
        if (musait.length >= 3) break;
    }
    res.json({ oneriler: musait });
});

// Benzersiz 10 karakterlik referans kodu üret
async function referansKoduUret(olusturan, adet) {
    const kodlar = [];
    let deneme = 0;
    while (kodlar.length < adet && deneme < adet * 10) {
        deneme++;
        const kod = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 10);
        const varMi = await ReferansKodu.findOne({ kod });
        if (!varMi) {
            await new ReferansKodu({ kod, olusturan }).save();
            kodlar.push(kod);
        }
    }
    return kodlar;
}

router.get('/', async (req, res) => {
    try {
        const kullaniciSayisi = await Kullanici.countDocuments({});
        res.render('giris', { kullaniciSayisi });
    } catch (err) {
        res.render('giris', { kullaniciSayisi: 0 });
    }
});

router.get('/kayit', (req, res) => {
    res.render('kayit', { refKod: req.query.ref || '' });
});

router.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, email, sifre, sifreTekrar, sinif, sube, il, ilce, okul, refKod } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    if (!refKod || !refKod.trim()) return res.send("<script>alert('Referans kodu gerekli!'); window.history.back();</script>");
    try {
        // Referans kodu doğrula
        const ref = await ReferansKodu.findOne({ kod: refKod.trim().toUpperCase(), kullanildi: false });
        if (!ref) return res.send("<script>alert('Geçersiz veya kullanılmış referans kodu!'); window.history.back();</script>");

        // Kullanıcı adı format ve küfür kontrolü
        const adHata = kullaniciAdiKontrol(kullaniciAdi);
        if (adHata) return res.send("<script>alert('" + adHata + "'); window.history.back();</script>");

        // Kullanıcı adı tekrar kontrolü
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");

        // Kullanıcıyı kaydet
        const hash = await bcrypt.hash(sifre, SALT_ROUNDS);
        await new Kullanici({ kullaniciAdi, email: email||'', sifre: hash, sinif, sube: sube||'', il, ilce, okul }).save();

        // Referans kodunu kullanıldı olarak işaretle
        ref.kullanildi = true;
        ref.kullanan = kullaniciAdi;
        ref.kullanimTarih = new Date();
        await ref.save();

        // Yeni kullanıcıya 2 adet referans kodu üret
        await referansKoduUret(kullaniciAdi, 2);

        res.send("<script>alert('Kayıt başarılı!'); window.location.href='/';</script>");
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
        if (k) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000);
            await new PasswordReset({ kullaniciAdi: k.kullaniciAdi, email: k.email, token, expires }).save();
            const baseUrl = process.env.SITE_URL || ('https://' + req.get('host'));
            const link = baseUrl.replace(/\/$/, '') + '/sifre-yenile/' + token;
            try { await sifreSifirlamaMailiGonder(k.email, k.kullaniciAdi, link); }
            catch (mailErr) { console.error('Mail gönderim hatası:', mailErr.message); }
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
        const kayit = await PasswordReset.findOne({ token });
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
module.exports.referansKoduUret = referansKoduUret;

