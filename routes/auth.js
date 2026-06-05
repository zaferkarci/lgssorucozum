const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Kullanici = require('../models/Kullanici');
const PasswordReset = require('../models/PasswordReset');
const ReferansKodu = require('../models/ReferansKodu');
const Kurum = require('../models/Kurum');
const KurumUyelikIstek = require('../models/KurumUyelikIstek');
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
    // DB yasaklı kelime kontrolü (model yoksa atla)
    let yasak = null;
    try {
        const YasakliKelime = require('../models/YasakliKelime');
        yasak = await YasakliKelime.findOne({ kelime: ad.toLowerCase() }).lean();
    } catch (e) { /* model dosyası yok, kontrolü atla */ }
    if (yasak) return res.json({ gecerli: false, mesaj: 'Bu kullanıcı adı kullanılamaz.' });
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
async function referansKoduUret(olusturan, adet, tip) {
    const kodlar = [];
    // v4.3.2: 'kurumsal' tipi. v4.3.25: 'veli' tipi de geçerli.
    const gecerliTipler = ['ogrenci', 'ogretmen', 'kurumsal', 'veli', 'demo'];
    const kodTip = gecerliTipler.includes(tip) ? tip : 'ogrenci';
    let deneme = 0;
    while (kodlar.length < adet && deneme < adet * 10) {
        deneme++;
        const kod = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 10);
        const varMi = await ReferansKodu.findOne({ kod });
        if (!varMi) {
            await new ReferansKodu({ kod, olusturan, tip: kodTip }).save();
            kodlar.push(kod);
        }
    }
    return kodlar;
}

router.get('/', async (req, res) => {
    try {
        const kullaniciSayisi = await Kullanici.countDocuments({});
        res.render('giris', { kullaniciSayisi, kayitBasarili: req.query.kayit === 'basarili' });
    } catch (err) {
        res.render('giris', { kullaniciSayisi: 0, kayitBasarili: false });
    }
});

router.get('/kayit', async (req, res) => {
    const refKod = (req.query.ref || '').trim();
    let refTip = 'ogrenci';
    // v4.1.27: Öğretmen davet linkinde öğretmenin il/ilçe/okul'unu view'a gönder
    // ki form dropdownları pre-fill olsun. Öğrenci farklı okulda ise değiştirebilir.
    let onSecimIl = '', onSecimIlce = '', onSecimOkul = '';
    let veliDavetAdi = ''; // v4.3.28: veli'nin ürettiği davet kodu ise, velinin adı
    if (refKod) {
        try {
            const ref = await ReferansKodu.findOne({ kod: refKod }).lean();
            if (ref && ref.tip === 'ogretmen') {
                refTip = 'ogretmen';
                if (ref.olusturan && ref.olusturan !== 'admin') {
                    const ogretmenSahip = await Kullanici.findOne(
                        { kullaniciAdi: ref.olusturan, rol: 'ogretmen' },
                        'il ilce okul'
                    ).lean();
                    if (ogretmenSahip) {
                        onSecimIl   = ogretmenSahip.il   || '';
                        onSecimIlce = ogretmenSahip.ilce || '';
                        onSecimOkul = ogretmenSahip.okul || '';
                    }
                }
            } else if (ref && ref.tip === 'kurumsal') {
                // v4.3.4: Kurumsal davet kodu için refTip atanıyor
                refTip = 'kurumsal';
            } else if (ref && ref.tip === 'veli') {
                // v4.3.25/28: tip:'veli' kodu iki amaçlı:
                //   • olusturan === 'admin' → VELİ kaydı (yeni veli üye olur)
                //   • olusturan bir veli kullanıcı → ÖĞRENCİ kaydı (Yol B), öğrenci
                //     o veliyi otomatik takibe alır. Bu durumda refTip='ogrenci'
                //     ama view'a velinin adı geçilir.
                if (ref.olusturan && ref.olusturan !== 'admin') {
                    const olusturanVeli = await Kullanici.findOne(
                        { kullaniciAdi: ref.olusturan, rol: 'veli' }, 'kullaniciAdi'
                    ).lean();
                    if (olusturanVeli) {
                        refTip = 'ogrenci';
                        veliDavetAdi = olusturanVeli.kullaniciAdi;
                    } else {
                        // olusturan veli değilse (silinmiş vs) admin gibi davran → veli kaydı
                        refTip = 'veli';
                    }
                } else {
                    refTip = 'veli';
                }
            } else if (ref && ref.tip === 'demo') {
                // v4.3.33: Demo davet kodu — etkisiz öğrenci hesabı
                refTip = 'demo';
            }
        } catch (e) { /* yoksay, default ogrenci + boş ön seçim */ }
    }
    res.render('kayit', { refKod, refTip, onSecimIl, onSecimIlce, onSecimOkul, veliDavetAdi });
});

// İletişim formu sayfası (oturum gerekmez, herkese açık)
router.get('/iletisim', async (req, res) => {
    // Hatalı soru bildirimi için URL parametreleri
    const hata = !!req.query.hata;
    const sinif = req.query.sinif || '';
    const ders = req.query.ders || '';
    const konu = req.query.konu || '';
    const soruNo = req.query.soruNo || '';

    // Oturumluysa kullanıcı adı + email otomatik doldurulsun
    let kullaniciAdi = '';
    let email = '';
    if (req.session && req.session.kullaniciAdi) {
        try {
            const k = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }, 'kullaniciAdi email').lean();
            if (k) {
                kullaniciAdi = k.kullaniciAdi || '';
                email = k.email || '';
            }
        } catch (e) { /* yoksay */ }
    }

    res.render('iletisim', { hata, sinif, ders, konu, soruNo, kullaniciAdi, email });
});

router.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, email, sifre, sifreTekrar, sinif, sube, il, ilce, okul, refKod } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    if (!refKod || !refKod.trim()) return res.send("<script>alert('Referans kodu gerekli!'); window.history.back();</script>");
    try {
        // Referans kodu doğrula
        const ref = await ReferansKodu.findOne({ kod: refKod.trim().toUpperCase(), kullanildi: false });
        if (!ref) return res.send("<script>alert('Geçersiz veya kullanılmış referans kodu!'); window.history.back();</script>");

        // Rol referans kodundan belirleniyor (kullanıcı manipüle edemesin)
        // v4.3.2: 'kurumsal'. v4.3.25/28: 'veli' tipi iki amaçlı —
        //   • admin üretti → yeni VELİ kaydı
        //   • bir veli üretti → ÖĞRENCİ kaydı (Yol B davet linki)
        let rol;
        if (ref.tip === 'ogretmen')      rol = 'ogretmen';
        else if (ref.tip === 'kurumsal') rol = 'kurumsal';
        else if (ref.tip === 'veli') {
            if (ref.olusturan && ref.olusturan !== 'admin') {
                const olusturanVeli = await Kullanici.findOne(
                    { kullaniciAdi: ref.olusturan, rol: 'veli' }, 'kullaniciAdi'
                ).lean();
                rol = olusturanVeli ? 'ogrenci' : 'veli';
            } else {
                rol = 'veli';
            }
        }
        else if (ref.tip === 'demo')     rol = 'demo';
        else rol = 'ogrenci';

        // Kullanıcı adı format ve küfür kontrolü
        const adHata = kullaniciAdiKontrol(kullaniciAdi);
        if (adHata) return res.send("<script>alert('" + adHata + "'); window.history.back();</script>");

        // DB'deki yasaklı kelime kontrolü (model yoksa atla)
        let yasaklilar = [];
        try {
            const YasakliKelime = require('../models/YasakliKelime');
            yasaklilar = await YasakliKelime.find({}, 'kelime').lean();
        } catch (e) { /* model dosyası yok, kontrolü atla */ }
        const kucukAd = kullaniciAdi.toLowerCase();
        for (const y of yasaklilar) {
            if (kucukAd === y.kelime) {
                return res.send("<script>alert('Bu kullanıcı adı kullanılamaz.'); window.history.back();</script>");
            }
        }

        // Kullanıcı adı tekrar kontrolü
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");

        // v4.1.27: Form pre-fill yaklaşımı — öğretmen kodu ile gelen formda
        // il/ilçe/okul dropdownları öğretmenin değerleriyle önceden seçili gelir
        // (kayit GET handler'ında doldurulur). Öğrenci özel ders / başka okul ise
        // dokunup değiştirebilir. Backend tarafında otomatik fallback YOK; ne
        // gönderilirse o kaydedilir. Boş gönderildiyse boş kalır.
        const ilSon   = (il   && il.trim())   || '';
        const ilceSon = (ilce && ilce.trim()) || '';
        const okulSon = (okul && okul.trim()) || '';

        // Öğretmen ise sınıf/şube boş; öğrenci ise normal
        const yeniKullaniciData = {
            kullaniciAdi,
            email: email || '',
            sifre: await bcrypt.hash(sifre, SALT_ROUNDS),
            il: ilSon, ilce: ilceSon, okul: okulSon,
            rol
        };
        // v4.3.5: Çoklu rol — kurumsal kullanıcı hem kurumsal hem öğretmen rolüne sahip
        // olur, aralarında geçiş yapabilir. Diğer roller sadece kendi rollerine sahip.
        if (rol === 'kurumsal') {
            yeniKullaniciData.rolListesi = ['kurumsal', 'ogretmen'];
            yeniKullaniciData.aktifRol = 'kurumsal';
        } else {
            yeniKullaniciData.rolListesi = [rol];
            yeniKullaniciData.aktifRol = rol;
        }
        if (rol === 'ogrenci' || rol === 'demo') {
            // v4.3.33: Demo hesabı da sınıf seçer — soruları sınıfına göre görür.
            yeniKullaniciData.sinif = sinif;
            yeniKullaniciData.sube = sube || '';
        }
        // Öğretmen için: sinif default 8 olarak kalır şemada (geriye dönük uyumluluk),
        // ama view'larda rol kontrolü ile gizlenir
        const yeniKullanici = await new Kullanici(yeniKullaniciData).save();

        // v4.3.6: Kurumsal kullanıcı kayıt olunca otomatik bir Kurum belgesi oluşur
        // ve yonettigiKurumId'ye bağlanır. Kullanıcının seçtiği okul/il/ilçe bilgisi
        // Kurum'un da il/ilçe/ad alanlarına yazılır. Kurumsal kullanıcı bu kurumun
        // yöneticisi olur (olusturanKullaniciAdi).
        if (rol === 'kurumsal') {
            try {
                const yeniKurum = await new Kurum({
                    ad: okulSon || ('Kurum-' + kullaniciAdi),
                    tip: 'okul',
                    il: ilSon,
                    ilce: ilceSon,
                    olusturanKullaniciAdi: kullaniciAdi
                }).save();
                yeniKullanici.yonettigiKurumId = yeniKurum._id;
                await yeniKullanici.save();
                // v4.3.11: Bu okulda görev yaptığını/öğrenci olduğunu beyan etmiş
                // mevcut öğretmen ve öğrenciler için otomatik kuruma katılma istekleri
                // oluşturulur. Kurum yöneticisi paneli açtığında bekleyen istekleri görür.
                // (v4.3.10'da kaldırılmıştı, geri getirildi.)
                try {
                    const mevcutUyeler = await Kullanici.find({
                        rol: { $in: ['ogretmen', 'ogrenci'] },
                        okul: okulSon,
                        il: ilSon || '',
                        ilce: ilceSon || '',
                        bagliKurumId: null
                    }, 'kullaniciAdi rol').lean();
                    for (const u of mevcutUyeler) {
                        try {
                            await new KurumUyelikIstek({
                                kullaniciAdi: u.kullaniciAdi,
                                kullaniciRol: u.rol,
                                kurumId: yeniKurum._id
                            }).save();
                        } catch (e) {
                            if (e.code !== 11000) {
                                console.error('[kayit] Toplu istek hatasi:', e.message);
                            }
                        }
                    }
                } catch (e) { /* sessiz */ }
            } catch (e) {
                console.error('[kayit] Kurum olusturma hatasi:', e.message);
                // Kurum oluşturulamasa bile kullanıcı kaydı düşmesin
            }
        }

        // v4.3.11: Öğretmen kayıt olunca, beyan ettiği okul kayıtlı kurumsa otomatik
        // katılma isteği oluşturulur. (v4.3.10'da kaldırılmıştı, geri getirildi.)
        // İstek atılırsa profilde/banner'da okul beyanı onay gelene kadar gizli olur.
        if (rol === 'ogretmen' && okulSon) {
            try {
                const eslesenKurum = await Kurum.findOne({
                    ad: okulSon,
                    il: ilSon || '',
                    ilce: ilceSon || ''
                });
                if (eslesenKurum) {
                    await new KurumUyelikIstek({
                        kullaniciAdi: kullaniciAdi,
                        kullaniciRol: 'ogretmen',
                        kurumId: eslesenKurum._id
                    }).save();
                }
            } catch (e) {
                if (e.code !== 11000) {
                    console.error('[kayit] Otomatik kurum istegi hatasi:', e.message);
                }
            }
        }
        // v4.3.11: Öğrenci için de aynı otomatik istek davranışı
        if (rol === 'ogrenci' && okulSon) {
            try {
                const eslesenKurum = await Kurum.findOne({
                    ad: okulSon,
                    il: ilSon || '',
                    ilce: ilceSon || ''
                });
                if (eslesenKurum) {
                    await new KurumUyelikIstek({
                        kullaniciAdi: kullaniciAdi,
                        kullaniciRol: 'ogrenci',
                        kurumId: eslesenKurum._id
                    }).save();
                }
            } catch (e) {
                if (e.code !== 11000) {
                    console.error('[kayit] Otomatik kurum istegi hatasi (ogrenci):', e.message);
                }
            }
        }

        // Referans kodunu kullanıldı olarak işaretle
        ref.kullanildi = true;
        ref.kullanan = kullaniciAdi;
        ref.kullanimTarih = new Date();
        await ref.save();

        // Yeni kullanıcıya 2 adet referans kodu üret.
        // v4.6.2: Öğrenci kullanıcılar için referans kodu üretimi durduruldu.
        // v4.6.8: Öğretmen kullanıcılar için de durduruldu (otomatik link üretimi
        //         kaldırıldı). 'ogrenci' ve 'ogretmen' atlanır; kurumsal/veli/demo
        //         eski davranışını aynen korur.
        if (rol !== 'ogrenci' && rol !== 'ogretmen') {
            await referansKoduUret(kullaniciAdi, 2, 'ogrenci');
        }

        // Yeni kayıt ÖĞRENCİ ise ve ref kodu bir öğretmen/veli tarafından üretildiyse,
        // otomatik takip ilişkisi kurulur.
        //   • Öğretmen daveti → durum 'beklemede' (öğrenci onaylar)
        //   • Veli daveti     → durum 'kabul' (onaysız — veli zaten çocuğunu davet etti)
        if (rol === 'ogrenci' && ref.olusturan && ref.olusturan !== 'admin') {
            try {
                const olusturanKullanici = await Kullanici.findOne({ kullaniciAdi: ref.olusturan }).lean();
                if (olusturanKullanici && (olusturanKullanici.rol === 'ogretmen' || olusturanKullanici.rol === 'veli')) {
                    const TakipIliski = require('../models/TakipIliski');
                    const mevcut = await TakipIliski.findOne({
                        ogretmenAdi: ref.olusturan,
                        ogrenciAdi: kullaniciAdi
                    });
                    if (!mevcut) {
                        const veliMi = (olusturanKullanici.rol === 'veli');
                        await new TakipIliski({
                            ogretmenAdi: ref.olusturan,
                            ogrenciAdi: kullaniciAdi,
                            isteyenRol: veliMi ? 'veli' : 'ogretmen',
                            durum: veliMi ? 'kabul' : 'beklemede',
                            yanitTarih: veliMi ? new Date() : null
                        }).save();
                        console.log('[kayit-yap] Otomatik takip (' + olusturanKullanici.rol + '): ' + ref.olusturan + ' → ' + kullaniciAdi);
                    }
                }
            } catch (e) {
                console.warn('[kayit-yap] Otomatik takip isteği oluşturulamadı:', e.message);
            }
        }

        res.redirect('/?kayit=basarili');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

router.post('/giris', async (req, res) => {
    try {
        const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi });
        if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
        const eslesti = await bcrypt.compare(req.body.sifre, k.sifre);
        if (!eslesti) return res.send("<script>alert('Hata!'); window.history.back();</script>");
        req.session.kullaniciAdi = k.kullaniciAdi;
        // v4.3.69: Login zaman damgası — "bugün aktif" tespiti için
        // (await beklemiyoruz, çünkü oturum açılışı bunu beklememeli)
        Kullanici.updateOne({ _id: k._id }, { $set: { sonGiris: new Date() } }).catch(e =>
            console.warn('[auth] sonGiris guncellenmedi:', e.message)
        );
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

