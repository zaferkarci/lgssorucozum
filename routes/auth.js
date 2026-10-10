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
    // v4.3.2: 'kurumsal' tipi. v4.3.25: 'veli' tipi de geçerli. v4.17.21-1: 'aile' (veli+ogrenci tek kod).
    const gecerliTipler = ['ogrenci', 'ogretmen', 'kurumsal', 'veli', 'demo', 'aile'];
    const kodTip = gecerliTipler.includes(tip) ? tip : 'ogrenci';
    let deneme = 0;
    while (kodlar.length < adet && deneme < adet * 10) {
        deneme++;
        const kod = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 10);
        const varMi = await ReferansKodu.findOne({ kod });
        if (!varMi) {
            // v4.17.20: Kod her zaman essiz — 'kod' alani unique index'li; es zamanli
            //   uretimde cakisma olursa (E11000) bu kod atlanir ve yenisi denenir.
            try {
                await new ReferansKodu({ kod, olusturan, tip: kodTip }).save();
                kodlar.push(kod);
            } catch (e) {
                if (!(e && e.code === 11000)) throw e;
            }
        }
    }
    return kodlar;
}

// v4.17.20: Basili karta dusmus bir KULLANICI kodu (veli/ogretmen/kurum uretimi)
//   dagitilmis kart sayilir: sahibi yokmus gibi (yonetici kodu gibi) islenir —
//   rol tipten belirlenir ve OTOMATIK TAKIP KURULMAZ. Boylece hatayla basilip
//   dagitilan kartlar, kodu ureten veliye/ogretmene baska cocuklarin verisini acmaz.
function kodSahibiCoz(ref) {
    if (!ref) return null;
    if (ref.yazdirildi && ref.olusturan && ref.olusturan !== 'admin') return 'admin';
    return ref.olusturan;
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
                if (kodSahibiCoz(ref) && kodSahibiCoz(ref) !== 'admin') {
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
                const _sahip = kodSahibiCoz(ref); // v4.17.20
                if (_sahip && _sahip !== 'admin') {
                    const olusturanVeli = await Kullanici.findOne(
                        { kullaniciAdi: _sahip, rol: 'veli' }, 'kullaniciAdi'
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
            } else if (ref && ref.tip === 'aile') {
                // v4.17.21-1: Aile karti — tek formda veli + ogrenci hesabi
                refTip = 'aile';
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
        // v4.17.21-1: Aile karti bu formla kullanilamaz (veli+ogrenci birlikte acilir)
        if (ref.tip === 'aile') return res.send("<script>alert('Bu bir aile kartı. Kayıt bağlantısını kartın karekodundan açın.'); window.location.href='/kayit?ref=" + encodeURIComponent(ref.kod) + "';</script>");

        // Rol referans kodundan belirleniyor (kullanıcı manipüle edemesin)
        // v4.3.2: 'kurumsal'. v4.3.25/28: 'veli' tipi iki amaçlı —
        //   • admin üretti → yeni VELİ kaydı
        //   • bir veli üretti → ÖĞRENCİ kaydı (Yol B davet linki)
        // v4.17.20: Basili karta dusmus kullanici kodu -> sahipsiz (yonetici kodu) gibi.
        const kodSahibi = kodSahibiCoz(ref);
        if (kodSahibi !== ref.olusturan) {
            console.warn('[kayit-yap] Basili karttaki kullanici kodu (' + ref.kod + ', sahibi ' + ref.olusturan + ') — otomatik takip KURULMAYACAK.');
        }
        let rol;
        if (ref.tip === 'ogretmen')      rol = 'ogretmen';
        else if (ref.tip === 'kurumsal') rol = 'kurumsal';
        else if (ref.tip === 'veli') {
            if (kodSahibi && kodSahibi !== 'admin') {
                const olusturanVeli = await Kullanici.findOne(
                    { kullaniciAdi: kodSahibi, rol: 'veli' }, 'kullaniciAdi'
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
        } else if (rol === 'veli') {
            // v4.6.11: Velinin sınıfı yoktur; şema varsayılanı (8) yerine boş bırakılır.
            yeniKullaniciData.sinif = null;
            yeniKullaniciData.sube = '';
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
        if (rol === 'ogrenci' && kodSahibi && kodSahibi !== 'admin') {
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

// ===================================================================
// v4.17.21-1: AILE KARTI ILE KAYIT — tek formda VELI + OGRENCI hesabi.
//   Ikisi de formda girilen ortak ilk sifreyle acilir; ilk giriste her biri kendi
//   sifresini belirler (sifreDegistirmeli). Veli cocugu ONAYLI (kaynak:'aile')
//   takip eder; ogrencinin sifremi-unuttum baglantisi bu velinin e-postasina gider.
// ===================================================================
router.post('/kayit-aile', async (req, res) => {
    const geriHata = (m) => res.send('<script>alert(' + JSON.stringify(String(m)).replace(/</g, '\\u003c') + '); window.history.back();</script>');
    const b = req.body || {};
    const refKod = String(b.refKod || '').trim().toUpperCase();
    const ogrAdi = String(b.ogrenciAdi || '').trim();
    const veliAdi = String(b.veliAdi || '').trim();
    const veliEmail = String(b.veliEmail || '').trim().toLowerCase();
    const sifre = String(b.sifre || ''), sifreTekrar = String(b.sifreTekrar || '');
    const sinif = parseInt(b.sinif, 10);
    const sube = String(b.sube || '').trim();
    const ilSon = String(b.il || '').trim(), ilceSon = String(b.ilce || '').trim(), okulSon = String(b.okul || '').trim();

    if (!refKod) return geriHata('Kart kodu gerekli.');
    for (const [ad, etiket] of [[ogrAdi, 'Öğrenci'], [veliAdi, 'Veli']]) {
        const h = kullaniciAdiKontrol(ad);
        if (h) return geriHata(etiket + ' kullanıcı adı: ' + h);
    }
    if (ogrAdi.toLowerCase() === veliAdi.toLowerCase()) return geriHata('Veli ve öğrenci kullanıcı adları farklı olmalı.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(veliEmail)) return geriHata('Velinin geçerli bir e-posta adresi gerekli (şifre sıfırlama bağlantıları bu adrese gider).');
    if (sifre.length < 4) return geriHata('Şifre en az 4 karakter olmalı.');
    if (sifre !== sifreTekrar) return geriHata('Şifreler uyuşmuyor!');
    if (!(sinif >= 1 && sinif <= 12)) return geriHata('Öğrencinin sınıfını seçin.');

    try {
        // Yasakli kelime (DB) + kullanici adi bos mu
        try {
            const YasakliKelime = require('../models/YasakliKelime');
            const yas = await YasakliKelime.find({}, 'kelime').lean();
            for (const ad of [ogrAdi, veliAdi]) if (yas.some(y => y.kelime === ad.toLowerCase())) return geriHata('"' + ad + '" kullanıcı adı kullanılamaz.');
        } catch (e) { /* model yoksa atla */ }
        for (const ad of [ogrAdi, veliAdi]) {
            if (await Kullanici.findOne({ kullaniciAdi: ad }, '_id').lean()) return geriHata('"' + ad + '" kullanıcı adı alınmış!');
        }

        // Kodu ATOMIK olarak sahiplen (ayni kart iki kez kullanilamasin)
        const ref = await ReferansKodu.findOneAndUpdate(
            { kod: refKod, tip: 'aile', kullanildi: false },
            { $set: { kullanildi: true, kullanimTarih: new Date() } },
            { new: true }
        );
        if (!ref) return geriHata('Geçersiz veya kullanılmış aile kartı!');

        const hash = await bcrypt.hash(sifre, SALT_ROUNDS);
        let ogr = null, veli = null, takip = null;
        try {
            ogr = await new Kullanici({
                kullaniciAdi: ogrAdi, email: '', sifre: hash,
                il: ilSon, ilce: ilceSon, okul: okulSon,
                rol: 'ogrenci', rolListesi: ['ogrenci'], aktifRol: 'ogrenci',
                sinif, sube, sifreDegistirmeli: true, aileKodu: ref.kod
            }).save();
            veli = await new Kullanici({
                kullaniciAdi: veliAdi, email: veliEmail, sifre: hash,
                il: ilSon, ilce: ilceSon, okul: '',
                rol: 'veli', rolListesi: ['veli'], aktifRol: 'veli',
                sinif: null, sube: '', sifreDegistirmeli: true, aileKodu: ref.kod
            }).save();
            const TakipIliski = require('../models/TakipIliski');
            const simdi = new Date();
            takip = await new TakipIliski({
                ogretmenAdi: veliAdi, ogrenciAdi: ogrAdi, isteyenRol: 'veli', durum: 'kabul',
                kaynak: 'aile', istekTarih: simdi, yanitTarih: simdi, ogrenciOnayTarih: simdi
            }).save();
            ref.kullanan = ogrAdi;
            ref.aileVeli = veliAdi;
            await ref.save();
        } catch (e) {
            // Geri al: yarim kayit kalmasin, kart tekrar kullanilabilsin
            try { if (takip) await takip.deleteOne(); } catch (x) {}
            try { if (veli) await Kullanici.deleteOne({ _id: veli._id }); } catch (x) {}
            try { if (ogr) await Kullanici.deleteOne({ _id: ogr._id }); } catch (x) {}
            try { await ReferansKodu.updateOne({ _id: ref._id }, { $set: { kullanildi: false, kullanimTarih: null, kullanan: null, aileVeli: null } }); } catch (x) {}
            if (e && e.code === 11000) return geriHata('Kullanıcı adlarından biri az önce alındı, başka bir ad deneyin.');
            throw e;
        }

        // Ogrenci icin okul kurum ise otomatik katilma istegi (normal kayitla ayni davranis)
        if (okulSon) {
            try {
                const eslesenKurum = await Kurum.findOne({ ad: okulSon, il: ilSon || '', ilce: ilceSon || '' });
                if (eslesenKurum) await new KurumUyelikIstek({ kullaniciAdi: ogrAdi, kullaniciRol: 'ogrenci', kurumId: eslesenKurum._id }).save();
            } catch (e) { if (e.code !== 11000) console.error('[kayit-aile] kurum istegi:', e.message); }
        }
        console.log('[kayit-aile] ' + ref.kod + ': veli ' + veliAdi + ' + ogrenci ' + ogrAdi);
        const msg = 'Hesaplar oluşturuldu.\n\nÖğrenci: ' + ogrAdi + '\nVeli: ' + veliAdi +
            '\n\nİkisi de az önce belirlediğiniz şifreyle giriş yapar; ilk girişte her biri kendi şifresini belirler.';
        res.send('<script>alert(' + JSON.stringify(msg).replace(/</g, '\\u003c') + '); window.location.href="/?kayit=basarili";</script>');
    } catch (err) {
        console.error('[kayit-aile] HATA:', err.message);
        res.status(500).send('Hata: ' + err.message);
    }
});

router.post('/giris', async (req, res) => {
    try {
        let k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi });
        // v4.17.21-1: Yonetici adini degistirdiyse eski adla da (dogru sifreyle) giris yapilir.
        let eskiAdlaGiris = false;
        if (!k && req.body.kullaniciAdi) {
            k = await Kullanici.findOne({ eskiAdlar: String(req.body.kullaniciAdi) });
            eskiAdlaGiris = !!k;
        }
        if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
        const eslesti = await bcrypt.compare(req.body.sifre, k.sifre);
        if (!eslesti) return res.send("<script>alert('Hata!'); window.history.back();</script>");
        req.session.kullaniciAdi = k.kullaniciAdi;
        // v4.17.21-1: Ortak ilk sifreyle acilan hesap -> once kendi sifresini belirlemeli
        if (k.sifreDegistirmeli) req.session.sifreDegistirmeli = true;
        else delete req.session.sifreDegistirmeli;
        // v4.3.69: Login zaman damgası — "bugün aktif" tespiti için
        // (await beklemiyoruz, çünkü oturum açılışı bunu beklememeli)
        Kullanici.updateOne({ _id: k._id }, { $set: { sonGiris: new Date() } }).catch(e =>
            console.warn('[auth] sonGiris guncellenmedi:', e.message)
        );
        const hedef = k.sifreDegistirmeli ? '/sifre-belirle' : '/panel/' + encodeURIComponent(k.kullaniciAdi);
        if (eskiAdlaGiris) {
            const js = x => JSON.stringify(String(x)).replace(/</g, '\\u003c');
            return res.send('<script>alert(' + js('Kullanıcı adın "' + k.kullaniciAdi + '" olarak değiştirildi. Bundan sonra bu adla giriş yap.') + '); window.location.href=' + js(hedef) + ';</script>');
        }
        res.redirect(hedef);
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// v4.17.21-1: ILK GIRISTE KENDI SIFRENI BELIRLE (aile karti ortak ilk sifresinden sonra)
router.get('/sifre-belirle', async (req, res) => {
    if (!req.session || !req.session.kullaniciAdi) return res.redirect('/');
    const k = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }, 'kullaniciAdi rol sifreDegistirmeli').lean();
    if (!k) return res.redirect('/');
    if (!k.sifreDegistirmeli) { delete req.session.sifreDegistirmeli; return res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi)); }
    res.render('sifre-belirle', { kullaniciAdi: k.kullaniciAdi, rol: k.rol, hata: '' });
});
router.post('/sifre-belirle', async (req, res) => {
    try {
        if (!req.session || !req.session.kullaniciAdi) return res.redirect('/');
        const k = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi });
        if (!k) return res.redirect('/');
        const goster = (hata) => res.render('sifre-belirle', { kullaniciAdi: k.kullaniciAdi, rol: k.rol, hata });
        const yeni = String(req.body.yeniSifre || ''), tekrar = String(req.body.yeniSifreTekrar || '');
        if (yeni.length < 6) return goster('Şifre en az 6 karakter olmalı.');
        if (yeni !== tekrar) return goster('Şifreler uyuşmuyor.');
        if (await bcrypt.compare(yeni, k.sifre)) return goster('Yeni şifren ilk (ortak) şifreden farklı olmalı.');
        k.sifre = await bcrypt.hash(yeni, SALT_ROUNDS);
        k.sifreDegistirmeli = false;
        await k.save();
        delete req.session.sifreDegistirmeli;
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
// v4.17.21-1: Kullanici adi VEYA e-posta ile.
//   • Ogrenci (kullanici adiyla): baglanti VELISININ e-postasina gider. Yalniz guvenilir
//     veliler: aile kartiyla birlikte acilan veli (kaynak:'aile') ya da ogrencinin
//     "evet, velim" diye onayladigi veli. Boyle veli yoksa ogrencinin kendi e-postasi.
//   • Veli / ogretmen / diger: kendi e-postasina.
//   • E-posta girilirse: o adrese kayitli hesap(lar) icin o adrese.
//   Yanit her durumda ayni (hangi hesabin var oldugu disari sizmaz). Ayni hesap icin
//   2 dakikada bir istek (mail bombardimanina karsi).
async function ogrenciGuvenilirVelileri(ogrenciAdi) {
    const TakipIliski = require('../models/TakipIliski');
    const iliskiler = await TakipIliski.find({
        ogrenciAdi, durum: 'kabul',
        $or: [{ kaynak: 'aile' }, { ogrenciOnayTarih: { $ne: null } }]
    }, 'ogretmenAdi').lean();
    if (!iliskiler.length) return [];
    return await Kullanici.find({ kullaniciAdi: { $in: iliskiler.map(i => i.ogretmenAdi) }, rol: 'veli', email: { $nin: ['', null] } },
        'kullaniciAdi email').lean();
}
router.post('/sifremi-unuttum', async (req, res) => {
    const kimlik = String((req.body && (req.body.kimlik || req.body.email)) || '').trim();
    const yanit = () => res.send("<script>alert('Kayıtlı bir hesapsa şifre sıfırlama bağlantısı gönderildi. Öğrenci hesaplarında bağlantı velinin e-posta adresine gider. Lütfen mail kutunu (ve gereksiz klasörünü) kontrol et.'); window.location.href='/';</script>");
    try {
        if (!kimlik) return yanit();
        const hedefler = []; // { kullaniciAdi, email, veliAdi? }
        if (kimlik.includes('@')) {
            const kul = await Kullanici.find({ email: kimlik.toLowerCase() }, 'kullaniciAdi email').lean();
            const kul2 = kul.length ? kul : await Kullanici.find({ email: kimlik }, 'kullaniciAdi email').lean();
            kul2.forEach(u => hedefler.push({ kullaniciAdi: u.kullaniciAdi, email: u.email }));
        } else {
            const u = await Kullanici.findOne({ kullaniciAdi: kimlik }, 'kullaniciAdi email rol').lean();
            if (u) {
                if (u.rol === 'ogrenci' || u.rol === 'demo') {
                    const veliler = await ogrenciGuvenilirVelileri(u.kullaniciAdi);
                    if (veliler.length) veliler.forEach(v => hedefler.push({ kullaniciAdi: u.kullaniciAdi, email: v.email, veliAdi: v.kullaniciAdi }));
                    else if (u.email) hedefler.push({ kullaniciAdi: u.kullaniciAdi, email: u.email });
                    else console.warn('[sifremi-unuttum] ' + u.kullaniciAdi + ': guvenilir veli/e-posta yok, baglanti gonderilemedi.');
                } else if (u.email) {
                    hedefler.push({ kullaniciAdi: u.kullaniciAdi, email: u.email });
                }
            }
        }
        const baseUrl = (process.env.SITE_URL || ('https://' + req.get('host'))).replace(/\/$/, '');
        const { ogrenciSifreSifirlamaMailiGonder } = require('../mailGonder');
        const yakinZamanda = new Date(Date.now() + 58 * 60 * 1000); // 2 dk icinde uretilmis token var mi
        for (const h of hedefler) {
            const son = await PasswordReset.findOne({ kullaniciAdi: h.kullaniciAdi, email: h.email, expires: { $gt: yakinZamanda } }).lean();
            if (son) continue;
            const token = crypto.randomBytes(32).toString('hex');
            await new PasswordReset({ kullaniciAdi: h.kullaniciAdi, email: h.email, token, expires: new Date(Date.now() + 60 * 60 * 1000) }).save();
            const link = baseUrl + '/sifre-yenile/' + token;
            try {
                if (h.veliAdi) await ogrenciSifreSifirlamaMailiGonder(h.email, h.veliAdi, h.kullaniciAdi, link);
                else await sifreSifirlamaMailiGonder(h.email, h.kullaniciAdi, link);
            } catch (mailErr) { console.error('Mail gönderim hatası:', mailErr.message); }
        }
        yanit();
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
        // v4.17.21-1: Kendi belirledigi sifre -> ilk giris zorunlulugu kalkar; ayni hesap
        //   icin (orn. iki veliye) gonderilmis diger baglantilar da gecersizlesir.
        await Kullanici.updateOne({ kullaniciAdi: kayit.kullaniciAdi }, { sifre: hash, sifreDegistirmeli: false });
        await PasswordReset.deleteMany({ kullaniciAdi: kayit.kullaniciAdi });
        res.send("<script>alert('Şifreniz güncellendi! Giriş yapabilirsiniz.'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

module.exports = router;
module.exports.referansKoduUret = referansKoduUret;
module.exports.kullaniciAdiKontrol = kullaniciAdiKontrol; // v4.17.21-1: yonetici ad degistirme de ayni kurallari kullanir

