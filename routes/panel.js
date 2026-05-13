const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const ReferansKodu = require('../models/ReferansKodu');
const Unite = require('../models/Unite');

function stdSapma(dizi) {
    if (!dizi || dizi.length < 2) return 0;
    const ort = dizi.reduce((a, b) => a + b, 0) / dizi.length;
    return Math.sqrt(dizi.reduce((a, b) => a + Math.pow(b - ort, 2), 0) / dizi.length);
}

function dogruOraniKademesi(oran) {
    if (oran <= 0.20) return 5;
    if (oran <= 0.40) return 4;
    if (oran <= 0.60) return 3;
    if (oran <= 0.80) return 2;
    return 1;
}

function sureKademesi(sure) {
    if (sure <= 30)  return 1;
    if (sure <= 60)  return 2;
    if (sure <= 90)  return 3;
    if (sure <= 120) return 4;
    return 5;
}

async function zorlukGuncelle(soruId) {
    const MINIMUM_COZUM = 50;
    const tumSorular = await Soru.find();
    for (const s of tumSorular) {
        let Z_final = 3;
        if (s.cozulmeSayisi > 0) {
            const dogruOrani = s.dogruSayisi / s.cozulmeSayisi;
            const D = dogruOraniKademesi(dogruOrani);
            const dogruSureleri = s.dogruCevapSureleri || [];
            const S = dogruSureleri.length > 0
                ? dogruSureleri.reduce((acc, sure) => acc + sureKademesi(sure), 0) / dogruSureleri.length
                : 3;
            const sigma = stdSapma(dogruSureleri);
            const sigma_n = Math.min(sigma / 60, 1);
            const Z_base = (D * 0.6) + (S * 0.4);
            const Z_ham = Z_base + sigma_n * 0.5;
            const agirlik = Math.min(s.cozulmeSayisi / MINIMUM_COZUM, 1);
            Z_final = (agirlik * Z_ham) + ((1 - agirlik) * 3);
        }
        s.zorlukKatsayisi = Math.min(Math.max(Math.round(Z_final * 10) / 10, 1), 5);
        await s.save();
    }
}

// Öğrencinin ders ortalamalarının toplamını hesapla
function ortToplamHesapla(kullanici) {
    if (!kullanici.dersPuanlari || kullanici.dersPuanlari.length === 0) return 0;
    return kullanici.dersPuanlari.reduce((toplam, d) => {
        const ort = d.soruSayisi > 0 ? d.toplamPuan / d.soruSayisi : 0;
        return toplam + ort;
    }, 0);
}

// Oturum kontrol: session'daki kullanıcı URL'dekiyle eşleşmeli.
// İstisna: Admin yetkisi varsa (session veya Basic Auth), başka bir kullanıcının
// profilini incelemesine izin ver.
function oturumKontrol(req, res, next) {
    const sessionKullanici = req.session && req.session.kullaniciAdi;
    const urlKullanici = req.params.kullaniciAdi;

    // Normal akış: session sahibi kendi sayfasını görüyorsa direk geçir
    if (sessionKullanici && urlKullanici && sessionKullanici === urlKullanici) {
        return next();
    }

    // v4.1.35: Admin bypass — session-based admin kontrolü.
    // Sticky session sayesinde admin bir kez giriş yaptıysa req.session.adminGirisli=true.
    // Bu durumda admin başka bir kullanıcının profilini görüntüleyebilir (sayfa
    // navigation'larında Authorization header gelmediği için bu kontrol gerekli).
    if (req.session && req.session.adminGirisli === true) {
        req.adminGorunum = true;
        return next();
    }

    // Admin bypass: AJAX vb. isteklerde Basic Auth header'ı doğrudan gelirse de geçir
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Basic ')) {
        try {
            const cred = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
            const [u, p] = cred.split(':');
            if (u === (process.env.ADMIN_USER || 'admin') && p === (process.env.ADMIN_PASSWORD || '1234')) {
                req.adminGorunum = true;
                if (req.session) req.session.adminGirisli = true; // tutarlılık için işaretle
                return next();
            }
        } catch (e) { /* yoksay */ }
    }

    if (!sessionKullanici) {
        return res.redirect('/');
    }
    if (urlKullanici && sessionKullanici !== urlKullanici) {
        return res.status(403).send('Bu sayfaya erişim yetkiniz yok.');
    }
    if (req.body.kullaniciAdi && sessionKullanici !== req.body.kullaniciAdi) {
        return res.status(403).send('Bu işlem için yetkiniz yok.');
    }
    next();
}

router.get('/panel/:kullaniciAdi', oturumKontrol, async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı bulunamadı.");

    // v4.3.5: rolListesi / aktifRol lazy fix — eski kullanıcıların bu alanları boş gelebilir.
    // Kurumsal kullanıcılar için her zaman ['kurumsal','ogretmen'] doldurulur, diğerleri tek rol.
    let dbDegisiklik = false;
    if (!Array.isArray(k.rolListesi) || k.rolListesi.length === 0) {
        if (k.rol === 'kurumsal') {
            k.rolListesi = ['kurumsal', 'ogretmen'];
        } else {
            k.rolListesi = [k.rol];
        }
        dbDegisiklik = true;
    }
    if (!k.aktifRol) {
        k.aktifRol = k.rol;
        dbDegisiklik = true;
    }
    if (dbDegisiklik) {
        try { await k.save(); } catch (e) { /* sessiz */ }
    }

    // v4.3.5: Session'da geçici mod tercihi varsa onu kullan (sayfa yenileme arası kalıcı)
    // Sadece kullanıcının rolListesi'nde olan rolleri kabul et — güvenlik için.
    if (req.session && req.session.aktifModlar && req.session.aktifModlar[k.kullaniciAdi]) {
        const istenenMod = req.session.aktifModlar[k.kullaniciAdi];
        if (k.rolListesi.includes(istenenMod)) {
            k.aktifRol = istenenMod;
        }
    }

    // Görünüm için: k.rol'ü aktifRol'e bağla. Tüm mevcut view kontrolleri (k.rol === 'ogretmen' vb.)
    // otomatik olarak aktif görünüm rolüne göre çalışır. DB'deki gerçek rol değişmez.
    const gercekRol = k.rol;
    k.rol = k.aktifRol;

    const mod = req.query.mod || 'soru';
    // Kullanıcının çözdüğü soru ID'lerini CevapKaydi'ndan topla
    const cozulenKayitlar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }, 'soruId').lean();
    const cozulenIds = new Set(cozulenKayitlar.map(c => String(c.soruId)));
    // v4.3.4: ogretmen flag, hem öğretmen hem kurumsal kullanıcıları kapsar
    // (her ikisi de soru çözmez, sıralamaya girmez, tüm soruları görebilir).
    // Etiket/rozet için view'da k.rol özelliği ayrıca kontrol edilir.
    const ogretmen = (k.rol === 'ogretmen' || k.rol === 'kurumsal');
    // Sadece yayında olan, öğrencinin sınıf seviyesindeki sorular
    // Öğretmen için: tüm yayında sorular (sınıf filtresi yok)
    const yayindaSorular = ogretmen
        ? await Soru.find({ durum: 'yayinda' }).lean()
        : await Soru.find({ durum: 'yayinda', sinif: String(k.sinif) }).lean();

    // v4.1.40: Eğer öğrencinin sınıfı için soru yoksa, diğer sınıflarda kaç soru
    // olduğunu say — "yapım aşamasında, 8. sınıf için X soru var" mesajı için.
    // Sadece öğrenci ve yayında sorusu hiç yoksa çağrılır (gereksiz aggregate yok).
    let digerSinifSoruSayilari = null;
    if (!ogretmen && yayindaSorular.length === 0) {
        try {
            const dagilim = await Soru.aggregate([
                { $match: { durum: 'yayinda' } },
                { $group: { _id: '$sinif', sayi: { $sum: 1 } } }
            ]);
            digerSinifSoruSayilari = {};
            dagilim.forEach(d => {
                if (d._id) digerSinifSoruSayilari[String(d._id)] = d.sayi;
            });
        } catch (e) { digerSinifSoruSayilari = null; }
    }

    // Moderatör tüm soruları görür, öğrenci sadece çözülmemişleri
    const moderator = k.rol === 'moderator';
    let cozulmemisSorular = (moderator || ogretmen)
        ? yayindaSorular
        : yayindaSorular.filter(s => !cozulenIds.has(String(s._id)));

    // v4.1.41: Yeni sıralama mantığı — admin'de tanımlı sıraya göre
    //   1) ders filtresi (?ders=Matematik) varsa o derse indirgenir
    //   2) "eksik konu" filtresi (?eksik=ders|konu) varsa sadece o konuya indirgenir
    //   3) Sıralama: ders → ünite (uniteNo artan) → konu (admin array sırası)
    //                → zorluk (artan) → soruID (artan)
    //   4) Unite tablosunda olmayan ünite/konu sona düşer (güvenlik ağı)
    const dersFiltre = (req.query.ders || '').trim();
    const eksikFiltre = (req.query.eksik || '').trim(); // "ders|konu" formatı

    if (dersFiltre && !ogretmen && !moderator) {
        cozulmemisSorular = cozulmemisSorular.filter(s => (s.ders || '') === dersFiltre);
    }
    if (eksikFiltre && !ogretmen && !moderator) {
        const [eDers, eKonu] = eksikFiltre.split('|');
        cozulmemisSorular = cozulmemisSorular.filter(s =>
            (s.ders || '') === eDers && (s.konu || '') === eKonu
        );
    }

    // Admin'de tanımlı ünite/konu sırasını çek (öğrencinin sınıfı için)
    let uniteSiraMap = {}; // anahtar: "ders|unite", değer: { uniteSira, konuSiraMap }
    if (!ogretmen) {
        try {
            const uniteler = await Unite.find({ sinif: String(k.sinif) }).lean();
            uniteler.forEach(u => {
                const anahtar = (u.ders || '') + '|' + (u.uniteAdi || '');
                const konuSiraMap = {};
                (u.konular || []).forEach((kn, idx) => { konuSiraMap[kn] = idx; });
                uniteSiraMap[anahtar] = {
                    uniteSira: u.uniteNo || 9999,
                    konuSiraMap: konuSiraMap
                };
            });
        } catch (e) { /* tablo boşsa fallback alfabetik kalır */ }
    }

    cozulmemisSorular.sort((a, b) => {
        // 1) Ders alfabetik (ders filtreli mod'da bu hiç tetiklenmez)
        const dersA = a.ders || '';
        const dersB = b.ders || '';
        const dersCmp = dersA.localeCompare(dersB, 'tr');
        if (dersCmp !== 0) return dersCmp;

        // 2) Ünite — admin'deki uniteNo'ya göre
        const uniteAnhA = (a.ders || '') + '|' + (a.unite || '');
        const uniteAnhB = (b.ders || '') + '|' + (b.unite || '');
        const uA = uniteSiraMap[uniteAnhA];
        const uB = uniteSiraMap[uniteAnhB];
        const uniteSiraA = uA ? uA.uniteSira : 9999;
        const uniteSiraB = uB ? uB.uniteSira : 9999;
        if (uniteSiraA !== uniteSiraB) return uniteSiraA - uniteSiraB;

        // 3) Konu — admin'deki konular array sırası
        const konuSiraA = uA && uA.konuSiraMap[a.konu] !== undefined ? uA.konuSiraMap[a.konu] : 9999;
        const konuSiraB = uB && uB.konuSiraMap[b.konu] !== undefined ? uB.konuSiraMap[b.konu] : 9999;
        if (konuSiraA !== konuSiraB) return konuSiraA - konuSiraB;

        // 4) Zorluk artan
        const za = a.zorlukKatsayisi != null ? a.zorlukKatsayisi : 3;
        const zb = b.zorlukKatsayisi != null ? b.zorlukKatsayisi : 3;
        if (za !== zb) return za - zb;

        // 5) Eşitlik durumunda soruID artan
        return String(a._id).localeCompare(String(b._id));
    });

    // Moderatör için navigasyon indexi
    const modIdx = moderator ? Math.max(0, Math.min(parseInt(req.query.idx) || 0, cozulmemisSorular.length - 1)) : 0;
    let sorular;
    if (moderator) {
        sorular = cozulmemisSorular.slice(modIdx, modIdx + 1);
    } else if (ogretmen) {
        // Öğretmene rastgele 1 örnek soru göster (moderator modunda — cevap butonu yok, doğru cevap işaretli)
        if (cozulmemisSorular.length > 0) {
            const rastgele = Math.floor(Math.random() * cozulmemisSorular.length);
            sorular = [cozulmemisSorular[rastgele]];
        } else {
            sorular = [];
        }
    } else {
        sorular = cozulmemisSorular;
    }

    // v4.1.41: Filtre ile gelmiş (ders veya eksik) ama o filtrede çözülmemiş soru
    // kalmamışsa, kullanıcıyı ders seçim ekranına geri yönlendir (mod=soru, basla yok).
    // Soru çözme akışında yarıda kalmasın, ders seçim ekranını görsün.
    if (!moderator && !ogretmen && req.query.basla === 'true' && sorular.length === 0 && (dersFiltre || eksikFiltre)) {
        return res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi) + '?bitti=' + (dersFiltre || eksikFiltre.split('|').join('-')));
    }

    const zorlukBilgisi = (soru) => {
        const z = soru.zorlukKatsayisi || 3;
        if (z < 1.5) return { etiket: "Çok Kolay", renk: "#27ae60" };
        if (z < 2.5) return { etiket: "Kolay",     renk: "#2ecc71" };
        if (z < 3.5) return { etiket: "Orta",      renk: "#f39c12" };
        if (z < 4.5) return { etiket: "Zor",       renk: "#e67e22" };
        return { etiket: "Çok Zor", renk: "#c0392b" };
    };

    // Profil için sıralama — önce cache'den dene, yoksa veya kullanıcının son aktivitesi cache'ten yeniyse canlı hesapla
    let siralamaVerisi = { turkiye: 0, il: 0, ilce: 0, okul: 0, sinif: 0, toplamKullanici: 0, ilKullanici: 0, ilceKullanici: 0, okulKullanici: 0, sinifKullanici: 0, dersSiralamalari: {}, nitelikli: false, kullaniciSoruSayisi: 0, minSoru: 10 };
    if (mod === 'profil') {
        // Kullanıcının cache'ten sonra yeni cevap verip vermediğini kontrol et
        const cacheTarih = k.siralamaCacheTarih ? new Date(k.siralamaCacheTarih) : null;
        let cacheGuncelMi = false;
        // Cache 'nitelikli' alanı içermiyorsa eski formattır (v4.0.23 öncesi) — yok say
        const cacheYeniFormat = k.siralamaCache && k.siralamaCache.nitelikli !== undefined;
        if (cacheYeniFormat && k.siralamaCache.turkiye !== undefined && cacheTarih) {
            const sonCevap = await CevapKaydi.findOne({ kullaniciAdi: k.kullaniciAdi }).sort({ tarih: -1 }).lean();
            if (!sonCevap || new Date(sonCevap.tarih) <= cacheTarih) {
                cacheGuncelMi = true;
            }
        }
        if (cacheGuncelMi) {
            // Cache'den oku (hızlı)
            siralamaVerisi = k.siralamaCache;
        } else {
            // Fallback: canlı hesapla (cron henüz çalışmadıysa veya kullanıcı yeni cevap verdiyse)
            const tumKullanicilar = await Kullanici.find({}).lean();
            const kOrtTop = ortToplamHesapla(k);
            const MIN_SORU = 10;

            // Toplam soru sayısı = tüm derslerdeki soruSayisi'nın toplamı
            const toplamSoruFn = (u) => (u.dersPuanlari||[]).reduce((t,d) => t + (d.soruSayisi||0), 0);
            const kToplamSoru = toplamSoruFn(k);
            const kNitelikli = kToplamSoru >= MIN_SORU;

            // Genel sıralama listeleri — sadece en az MIN_SORU çözmüş olanlar
            const nitelikliFiltre = (u) => toplamSoruFn(u) >= MIN_SORU;
            const sinifFiltre = (u) => u.okul === k.okul && Number(u.sinif) === Number(k.sinif) && (k.sube ? u.sube === k.sube : true);

            const turkiyeListesi = tumKullanicilar.filter(nitelikliFiltre).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const ilListesi      = tumKullanicilar.filter(u => nitelikliFiltre(u) && u.il === k.il).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const ilceListesi    = tumKullanicilar.filter(u => nitelikliFiltre(u) && u.ilce === k.ilce).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const okulListesi    = tumKullanicilar.filter(u => nitelikliFiltre(u) && u.okul === k.okul).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const sinifListesi   = tumKullanicilar.filter(u => nitelikliFiltre(u) && sinifFiltre(u)).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);

            siralamaVerisi = {
                turkiye:         kNitelikli ? turkiyeListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                il:              kNitelikli ? ilListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                ilce:            kNitelikli ? ilceListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                okul:            kNitelikli ? okulListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                sinif:           kNitelikli ? sinifListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                toplamKullanici: turkiyeListesi.length,
                ilKullanici:     ilListesi.length,
                ilceKullanici:   ilceListesi.length,
                okulKullanici:   okulListesi.length,
                sinifKullanici:  sinifListesi.length,
                nitelikli:       kNitelikli,
                kullaniciSoruSayisi: kToplamSoru,
                minSoru:         MIN_SORU
            };

            const dersSiralamalari = {};
            const tumDersler = [...new Set(tumKullanicilar.flatMap(u => (u.dersPuanlari||[]).map(d => d.ders)))];
            for (const dersAdi of tumDersler) {
                const dersOrtFn = (u) => {
                    const d = (u.dersPuanlari||[]).find(x => x.ders === dersAdi);
                    return d && d.soruSayisi > 0 ? d.toplamPuan / d.soruSayisi : 0;
                };
                const dersSoruSayisiFn = (u) => {
                    const d = (u.dersPuanlari||[]).find(x => x.ders === dersAdi);
                    return d ? (d.soruSayisi||0) : 0;
                };
                const kDersOrt = dersOrtFn(k);
                const kDersSoruSayisi = dersSoruSayisiFn(k);
                const kDersNitelikli = kDersSoruSayisi >= MIN_SORU;

                const dersNitelikliFiltre = (u) => dersSoruSayisiFn(u) >= MIN_SORU;
                const tList  = tumKullanicilar.filter(dersNitelikliFiltre).map(dersOrtFn).sort((a,b) => b-a);
                const iList  = tumKullanicilar.filter(u => dersNitelikliFiltre(u) && u.il === k.il).map(dersOrtFn).sort((a,b) => b-a);
                const ilList = tumKullanicilar.filter(u => dersNitelikliFiltre(u) && u.ilce === k.ilce).map(dersOrtFn).sort((a,b) => b-a);
                const oList  = tumKullanicilar.filter(u => dersNitelikliFiltre(u) && u.okul === k.okul).map(dersOrtFn).sort((a,b) => b-a);
                const sList  = tumKullanicilar.filter(u => dersNitelikliFiltre(u) && sinifFiltre(u)).map(dersOrtFn).sort((a,b) => b-a);
                dersSiralamalari[dersAdi] = {
                    turkiye:        kDersNitelikli ? tList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    il:             kDersNitelikli ? iList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    ilce:           kDersNitelikli ? ilList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    okul:           kDersNitelikli ? oList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    sinif:          kDersNitelikli ? sList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    toplamKullanici: tList.length,
                    ilKullanici:    iList.length,
                    ilceKullanici:  ilList.length,
                    okulKullanici:  oList.length,
                    sinifKullanici: sList.length,
                    nitelikli:      kDersNitelikli,
                    kullaniciSoruSayisi: kDersSoruSayisi
                };
            }
            siralamaVerisi.dersSiralamalari = dersSiralamalari;
        }
    }

    // v4.1.28: Öğretmen için otomatik günlük kod üretimi (lazy/on-demand).
    // Profil sayfasını açtığında çalışır. Kural: aktif (kullanılmamış) kodu yoksa
    // ve son üretim bugünden eski ise 2 yeni öğrenci davet kodu üret. Birikme yok.
    if (mod === 'profil' && k.rol === 'ogretmen') {
        try {
            const aktifKodSayisi = await ReferansKodu.countDocuments({
                olusturan: k.kullaniciAdi, kullanildi: false
            });
            if (aktifKodSayisi === 0) {
                const sonKod = await ReferansKodu.findOne({ olusturan: k.kullaniciAdi })
                    .sort({ olusturmaTarih: -1 }).select('olusturmaTarih').lean();
                const bugunBasi = new Date(); bugunBasi.setHours(0, 0, 0, 0);
                const sonTarih = sonKod ? new Date(sonKod.olusturmaTarih) : null;
                if (!sonTarih || sonTarih < bugunBasi) {
                    const { referansKoduUret } = require('./auth');
                    await referansKoduUret(k.kullaniciAdi, 2, 'ogrenci');
                    console.log('[panel] Otomatik 2 davet kodu üretildi: ' + k.kullaniciAdi);
                }
            }
        } catch (e) { console.warn('[panel] Otomatik kod üretimi başarısız:', e.message); }
    }

    const kullanicininKodlari = await ReferansKodu.find({ olusturan: k.kullaniciAdi }).sort({ kopyalandi: 1, olusturmaTarih: 1 }).lean();
    const baseUrl = (process.env.SITE_URL || 'https://' + req.get('host')).replace(/\/$/, '');

    // Yeni soru bildirimi
    const yeniSoruSayisi = (k.soruIndex > 0 && cozulmemisSorular.length > 0) ? cozulmemisSorular.length : 0;

    // v4.1.25: Ana ekran (landing) için hızlı istatistikler — ekstra DB sorgusu yok,
    // tumCevaplar zaten aşağıda yükleniyor; bu hesapları onun üstünden yapacağız.
    // Hesaplamalar tumCevaplar yüklendikten SONRA yapılıyor (aşağıda landingStats blokunda).

    // Ders istatistikleri — CevapKaydi'ndan ders/konu bazlı detay
    // v4.1.37: Projection eklendi — sadece kullanılan 5 alan çekiliyor (önceden tüm
    // belge alanları geliyordu). Satır sayısı aynı kalır, payload ~%60 küçülür.
    // Hesaplamalar (toplamCozulen, dogruluk, ders kırılımı, bugün) etkilenmez.
    const tumCevaplar = await CevapKaydi.find(
        { kullaniciAdi: k.kullaniciAdi },
        'soruId dogruMu sure kazanilanPuan tarih'
    ).lean();

    // v4.1.37: Tutarlılık kontrolü — k.puan ile cevaplardan toplanan puan farkı.
    // Aynı /cevap endpoint'inde k.puan += kazanilan VE CevapKaydi.save() çağrılır;
    // ikisi tutarsızsa save'lerden biri bir noktada başarısız olmuştur. Sadece
    // logla, kullanıcıya görsel etki yok.
    try {
        const cevaplardanToplam = tumCevaplar.reduce((s, c) => s + (c.kazanilanPuan || 0), 0);
        const kPuan = Number(k.puan || 0);
        const fark = Math.abs(kPuan - cevaplardanToplam);
        if (fark > 0.5) {
            console.warn('[tutarlılık] ' + k.kullaniciAdi + ' — k.puan=' + kPuan.toFixed(2) +
                ' / cevaplardan=' + cevaplardanToplam.toFixed(2) + ' / fark=' + fark.toFixed(2));
        }
    } catch (e) { /* sessiz */ }

    const soruIdleri = [...new Set(tumCevaplar.map(c => String(c.soruId)))];
    const cevapSorular = soruIdleri.length > 0
        ? await Soru.find({ _id: { $in: soruIdleri } }, 'ders unite konu sinif soruNo soruMetni soruOnculu1 soruOnculu1Resmi soruOnculu2 soruOnculu2Resmi soruOnculu3 soruOnculu3Resmi soruResmi secenekler dogruCevapIndex tabloBaslik sikDizilimi _id').lean()
        : [];
    const soruBilgiMap = {};
    cevapSorular.forEach(s => { soruBilgiMap[String(s._id)] = s; });

    // Ders → Konu → {dogru, yanlis, sure}
    const dersIstatMap = {};
    tumCevaplar.forEach(c => {
        const sb = soruBilgiMap[String(c.soruId)];
        if (!sb) return;
        const ders = sb.ders || 'Diğer';
        const konu = sb.konu || 'Genel';
        if (!dersIstatMap[ders]) dersIstatMap[ders] = { toplamDogru: 0, toplamYanlis: 0, toplamPuan: 0, konular: {} };
        if (!dersIstatMap[ders].konular[konu]) dersIstatMap[ders].konular[konu] = { dogru: 0, yanlis: 0, toplamSure: 0 };
        if (c.dogruMu) { dersIstatMap[ders].toplamDogru++; dersIstatMap[ders].konular[konu].dogru++; }
        else           { dersIstatMap[ders].toplamYanlis++; dersIstatMap[ders].konular[konu].yanlis++; }
        dersIstatMap[ders].konular[konu].toplamSure += c.sure || 0;
        dersIstatMap[ders].toplamPuan += (c.kazanilanPuan || 0);
    });

    // Öğretmen — davet ettiği öğrencilerin listesi (mod=davetEdilenler için)
    let davetEdilenler = [];
    if (ogretmen) {
        try {
            const benimKodlarim = await ReferansKodu.find({ olusturan: k.kullaniciAdi, kullanildi: true }).lean();
            const kullananAdlari = benimKodlarim.map(r => r.kullanan).filter(Boolean);
            if (kullananAdlari.length > 0) {
                davetEdilenler = await Kullanici.find(
                    { kullaniciAdi: { $in: kullananAdlari } },
                    'kullaniciAdi puan soruIndex sinif sube il ilce okul rol'
                ).lean();
            }
        } catch (e) { console.warn('davetEdilenler yüklenemedi:', e.message); }
    }

    // v4.1.25: Landing istatistikleri — tumCevaplar üzerinden hesaplanıyor (ek DB yok)
    const toplamCozulen = tumCevaplar.length;
    const toplamDogru   = tumCevaplar.filter(c => c.dogruMu).length;
    const dogrulukYuzde = toplamCozulen > 0 ? Math.round((toplamDogru / toplamCozulen) * 100) : 0;
    // Bugün çözülen
    const bugunBaslangic = new Date(); bugunBaslangic.setHours(0,0,0,0);
    const bugunCozulen   = tumCevaplar.filter(c => c.tarih && new Date(c.tarih) >= bugunBaslangic).length;
    // Sıralama: cache'ten oku (cron 05:10'da günceller). Cache yoksa null gönder.
    const cacheVar = k.siralamaCache && k.siralamaCache.nitelikli !== undefined && k.siralamaCache.sinif !== undefined;
    const landingStats = {
        toplamPuan:    Math.round(k.puan || 0),
        toplamCozulen,
        toplamDogru,
        dogrulukYuzde,
        bugunCozulen,
        sinifSira:      cacheVar && k.siralamaCache.nitelikli ? k.siralamaCache.sinif : null,
        sinifKullanici: cacheVar ? (k.siralamaCache.sinifKullanici || 0) : 0,
        nitelikli:      cacheVar ? !!k.siralamaCache.nitelikli : false,
        kullaniciSoruSayisi: cacheVar ? (k.siralamaCache.kullaniciSoruSayisi || 0) : 0,
        minSoru:        cacheVar ? (k.siralamaCache.minSoru || 10) : 10
    };

    // v4.1.26: Profil tamamlanma kontrolü — il/ilçe/okul'dan herhangi biri boşsa
    // landing'de ve profilde "Profilini tamamla" uyarısı gösterilir.
    const eksikBilgiVar = !(k.il && k.il.trim()) || !(k.ilce && k.ilce.trim()) || !(k.okul && k.okul.trim());

    // v4.1.41: Ders seçim ekranı için ders bazlı çözülmemiş soru sayısı.
    // Sadece öğrencide ve hiçbir filtre yokken hesaplanır.
    let cozulmemisDersDagilim = null;
    let tumDersler = []; // admin Unite tablosundan tanımlı dersler (sınıf seviyesi için)
    if (!ogretmen && !moderator) {
        try {
            // Admin'de tanımlı tüm derslerin listesi (öğrencinin sınıfı için)
            const uniteler = await Unite.find({ sinif: String(k.sinif) }, 'ders').lean();
            const dersSet = new Set(uniteler.map(u => u.ders).filter(Boolean));
            tumDersler = Array.from(dersSet).sort((a, b) => a.localeCompare(b, 'tr'));

            // Öğrencinin tüm yayında soruları için ders dağılımı (filtre uygulanmadan)
            // yayindaSorular zaten kullanıcının sınıfına özel
            const dagilim = {};
            tumDersler.forEach(d => { dagilim[d] = 0; });
            yayindaSorular.forEach(s => {
                if (!cozulenIds.has(String(s._id))) {
                    if (s.ders) dagilim[s.ders] = (dagilim[s.ders] || 0) + 1;
                }
            });
            cozulmemisDersDagilim = dagilim;
        } catch (e) { cozulmemisDersDagilim = null; }
    }

    // v4.1.41: "Eksiklerini Kapat" için en zayıf konuyu bul
    // Profildeki "zayıftan güçlüye" mantığı: doğru oranı düşük olan konular önce
    let enZayifKonu = null; // { ders, konu, oran, kalanSoru }
    if (!ogretmen && !moderator && cozulmemisDersDagilim) {
        try {
            // Konu bazında doğru/toplam say
            const konuStat = {}; // anahtar: "ders|konu" → { dogru, toplam }
            const soruIdToDersKonu = {};
            // Önce yayındaki sorular için ders/konu eşle
            yayindaSorular.forEach(s => {
                soruIdToDersKonu[String(s._id)] = { ders: s.ders || '', konu: s.konu || '' };
            });
            // Cevaplardan konu istatistiği bina et
            tumCevaplar.forEach(c => {
                const dk = soruIdToDersKonu[String(c.soruId)];
                if (!dk || !dk.ders || !dk.konu) return;
                const anahtar = dk.ders + '|' + dk.konu;
                if (!konuStat[anahtar]) konuStat[anahtar] = { dogru: 0, toplam: 0, ders: dk.ders, konu: dk.konu };
                konuStat[anahtar].toplam++;
                if (c.dogruMu) konuStat[anahtar].dogru++;
            });
            // Konuları zayıftan güçlüye sırala
            const konuListesi = Object.values(konuStat).map(kk => ({
                ders: kk.ders, konu: kk.konu,
                oran: kk.toplam > 0 ? Math.round((kk.dogru / kk.toplam) * 100) : 0,
                toplam: kk.toplam
            })).sort((a, b) => {
                if (a.oran !== b.oran) return a.oran - b.oran;
                return b.toplam - a.toplam;
            });
            // Sırayla geç, çözülmemiş sorusu olan ilk konuyu bul
            for (const kn of konuListesi) {
                const kalanSoru = yayindaSorular.filter(s =>
                    !cozulenIds.has(String(s._id)) &&
                    (s.ders || '') === kn.ders &&
                    (s.konu || '') === kn.konu
                ).length;
                if (kalanSoru > 0) {
                    enZayifKonu = { ders: kn.ders, konu: kn.konu, oran: kn.oran, kalanSoru };
                    break;
                }
            }
        } catch (e) { enZayifKonu = null; }
    }

    res.render('panel', {
        k,
        mod,
        sorular,
        zorlukBilgisi,
        basla: req.query.basla,
        query: req.query,
        encodeURIComponent,
        siralamaVerisi,
        ortToplamHesapla,
        referansKodlari: kullanicininKodlari,
        baseUrl,
        yeniSoruSayisi,
        dersIstatMap,
        tumCevaplar,
        soruBilgiMap,
        moderator,
        ogretmen,
        davetEdilenler,
        modIdx,
        toplamSoru: cozulmemisSorular.length,
        landingStats,
        digerSinifSoruSayilari,
        cozulmemisDersDagilim,
        tumDersler,
        enZayifKonu,
        dersFiltre,
        eksikFiltre,
        eksikBilgiVar,
        adminGorunum: req.adminGorunum || false
    });
});

router.post('/cevap', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        // Öğretmen rolündeki kullanıcılar soru çözmesin
        if (k && k.rol === 'ogretmen') {
            return res.status(403).send("<script>alert('Öğretmen hesabı soru çözemez.'); window.history.back();</script>");
        }
        if (s && k) {
            const T_ogr = Math.max(parseInt(gecenSure) || 1, 1);
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
            let kazanilanPuan = 0;

            if (dogruMu) {
                const eskiCozulmeSayisi = s.cozulmeSayisi || 0;
                const eskiDogruSayisi = s.dogruSayisi || 0;
                const eskiSureleri = [...(s.cozumSureleriTum || [])];
                const T_ref = s.ortalamaSure || 60;
                const T_min = 10;
                const logHiz = Math.log2(1 + (T_ref / T_ogr));
                const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
                const hizBileseni = logMax * Math.tanh(logHiz / logMax);
                const dogruOrani = eskiCozulmeSayisi > 0 ? eskiDogruSayisi / eskiCozulmeSayisi : 0.5;
                const sigmaBasari = eskiCozulmeSayisi > 1
                    ? stdSapma(Array(eskiDogruSayisi).fill(1).concat(Array(eskiCozulmeSayisi - eskiDogruSayisi).fill(0)))
                    : 0;
                const Z_katsayi = Math.min(1 + 4 * (1 - dogruOrani) * (1 + sigmaBasari), 5);
                const sigmaSure = stdSapma(eskiSureleri);
                const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);
                const kazanilanPuanHesap = Math.max(Math.round(Z_katsayi * T_ref * hizBileseni * GE), 1);
                kazanilanPuan = kazanilanPuanHesap;
                k.puan += kazanilanPuan;

                // Sorunun ham puan ortalamasını güncelle
                const oncekiHP = s.hamPuan;
                const oncekiDogru = eskiDogruSayisi;
                if (oncekiHP === null || oncekiHP === undefined || oncekiDogru === 0) {
                    s.hamPuan = kazanilanPuan;
                } else {
                    s.hamPuan = ((oncekiHP * oncekiDogru) + kazanilanPuan) / (oncekiDogru + 1);
                }
            }

            s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;
            if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;
            const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
            s.ortalamaSure = (eskiSureToplami + T_ogr) / s.cozulmeSayisi;
            s.cozumSureleriTum = s.cozumSureleriTum || [];
            s.cozumSureleriTum.push(T_ogr);
            if (dogruMu) {
                s.dogruCevapSureleri = s.dogruCevapSureleri || [];
                s.dogruCevapSureleri.push(T_ogr);
            }
            await s.save();

            k.toplamSure += T_ogr;
            k.soruIndex += 1;

            // Ders bazlı istatistik güncelle
            if (!k.dersPuanlari) k.dersPuanlari = [];
            const dersAdi = s.ders || 'Diğer';
            let dersKayit = k.dersPuanlari.find(d => d.ders === dersAdi);
            if (!dersKayit) {
                k.dersPuanlari.push({ ders: dersAdi, toplamPuan: 0, soruSayisi: 0, toplamSure: 0 });
                dersKayit = k.dersPuanlari[k.dersPuanlari.length - 1];
            }
            if (dogruMu) dersKayit.toplamPuan += kazanilanPuan;
            dersKayit.soruSayisi += 1;
            dersKayit.toplamSure += T_ogr;
            k.markModified('dersPuanlari');

            await k.save();
            // Zorluk artık anlık güncellenmiyor — günlük cron job (05:10) üzerinden hesaplanacak
            // await zorlukGuncelle(soruId);

            // Cevap kaydını tut (günlük istatistik için)
            await new CevapKaydi({
                soruId: soruId,
                kullaniciAdi: kullaniciAdi,
                dogruMu: dogruMu,
                sure: T_ogr,
                kazanilanPuan: kazanilanPuan
            }).save();
        }
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// v4.3.5: Çoklu rol — kurumsal kullanıcının "Kurum Modu" ↔ "Öğretmen Modu" geçişi.
// Session'a yazıyoruz (sayfa yenileme arası kalıcı), DB'ye aktifRol da yazılır.
router.post('/profil/mod-degistir', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, yeniMod } = req.body;
        const gecerli = ['ogrenci', 'ogretmen', 'kurumsal'];
        if (!gecerli.includes(yeniMod)) {
            return res.redirect('/panel/' + encodeURIComponent(kullaniciAdi));
        }
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send('Kullanıcı bulunamadı.');
        if (!Array.isArray(k.rolListesi) || !k.rolListesi.includes(yeniMod)) {
            return res.status(403).send('Bu role geçiş yetkin yok.');
        }
        k.aktifRol = yeniMod;
        await k.save();
        if (req.session) {
            if (!req.session.aktifModlar) req.session.aktifModlar = {};
            req.session.aktifModlar[kullaniciAdi] = yeniMod;
        }
        // Hangi sayfaya geri döneceğini referer'dan al, yoksa panele
        const geri = req.body.geri || ('/panel/' + encodeURIComponent(kullaniciAdi));
        res.redirect(geri);
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// Şube güncelleme
router.post('/profil/sube-guncelle', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, sube } = req.body;
        await Kullanici.findOneAndUpdate({ kullaniciAdi }, { sube: sube || '' });
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.1.26: Konum (il/ilçe/okul) güncelleme — kayıt formunda opsiyonel olduğu için
// sonradan profilden tamamlanabilir. Sıralama cron'u 05:10'da yeni değerleri yakalar.
router.post('/profil/konum-guncelle', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, il, ilce, okul } = req.body;
        // Sadece oturum sahibi kendi profilini güncelleyebilsin
        if (req.session.kullaniciAdi !== kullaniciAdi) {
            return res.status(403).send('Yetkisiz işlem');
        }
        const guncelleme = {};
        if (typeof il   === 'string') guncelleme.il   = il.trim();
        if (typeof ilce === 'string') guncelleme.ilce = ilce.trim();
        if (typeof okul === 'string') guncelleme.okul = okul.trim();
        await Kullanici.findOneAndUpdate({ kullaniciAdi }, guncelleme);
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

router.post('/profil/sifre-degistir', oturumKontrol, async (req, res) => {
    const { kullaniciAdi, eskiSifre, yeniSifre, yeniSifreTekrar } = req.body;
    const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil';
    try {
        if (yeniSifre !== yeniSifreTekrar)
            return res.send("<script>alert('Yeni şifreler uyuşmuyor!'); window.location.href='" + geri + "';</script>");
        if (!yeniSifre || yeniSifre.length < 4)
            return res.send("<script>alert('Yeni şifre en az 4 karakter olmalı.'); window.location.href='" + geri + "';</script>");
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send("Kullanıcı bulunamadı.");
        const bcrypt = require('bcrypt');
        const eslesti = await bcrypt.compare(eskiSifre, k.sifre);
        if (!eslesti)
            return res.send("<script>alert('Eski şifre yanlış!'); window.location.href='" + geri + "';</script>");
        k.sifre = await bcrypt.hash(yeniSifre, 10);
        await k.save();
        res.send("<script>alert('Şifreniz başarıyla değiştirildi.'); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// v4.2.5: Mail değiştirme — 2 adımlı doğrulama akışı
// Adım 1: Kullanıcı yeni mail girer, sistem o mail'e 6 haneli kod gönderir
router.post('/profil/email-degistir-kod-gonder', oturumKontrol, async (req, res) => {
    const { kullaniciAdi, yeniEmail } = req.body;
    const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil';
    try {
        const mail = (yeniEmail || '').trim().toLowerCase();
        if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
            return res.send("<script>alert('Geçerli bir mail adresi girin.'); window.location.href='" + geri + "';</script>");
        }
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send("Kullanıcı bulunamadı.");
        if (k.email && k.email.toLowerCase() === mail) {
            return res.send("<script>alert('Bu zaten mevcut mail adresiniz.'); window.location.href='" + geri + "';</script>");
        }
        // 6 haneli rastgele kod (100000–999999)
        const kod = String(Math.floor(100000 + Math.random() * 900000));
        k.yeniEmailBekleyen = mail;
        k.emailDogrulamaKodu = kod;
        k.emailDogrulamaSonGecerli = new Date(Date.now() + 15 * 60 * 1000); // 15 dk
        await k.save();
        try {
            const { emailDogrulamaKoduGonder } = require('../mailGonder');
            await emailDogrulamaKoduGonder(mail, k.kullaniciAdi, kod);
        } catch (err) {
            console.error('[email-degistir] mail gonderme hatasi:', err.message);
            return res.send("<script>alert('Mail gönderilirken hata oluştu. Mail servisi yapılandırılmamış olabilir.'); window.location.href='" + geri + "';</script>");
        }
        res.send("<script>alert('Doğrulama kodu " + mail + " adresine gönderildi. 15 dakika içinde girin.'); window.location.href='" + geri + "#email-dogrulama';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Adım 2: Kullanıcı kodu girer, doğruysa email kalıcı değişir
router.post('/profil/email-degistir-kod-dogrula', oturumKontrol, async (req, res) => {
    const { kullaniciAdi, kod } = req.body;
    const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil';
    try {
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send("Kullanıcı bulunamadı.");
        if (!k.yeniEmailBekleyen || !k.emailDogrulamaKodu) {
            return res.send("<script>alert('Bekleyen mail değiştirme isteği yok.'); window.location.href='" + geri + "';</script>");
        }
        if (!k.emailDogrulamaSonGecerli || new Date() > new Date(k.emailDogrulamaSonGecerli)) {
            k.yeniEmailBekleyen = '';
            k.emailDogrulamaKodu = '';
            k.emailDogrulamaSonGecerli = null;
            await k.save();
            return res.send("<script>alert('Kodun süresi dolmuş. Tekrar isteyin.'); window.location.href='" + geri + "';</script>");
        }
        if (String(kod || '').trim() !== String(k.emailDogrulamaKodu)) {
            return res.send("<script>alert('Kod yanlış. Tekrar deneyin.'); window.location.href='" + geri + "#email-dogrulama';</script>");
        }
        // Başarılı — yeni maili kalıcı kaydet, geçici alanları temizle
        k.email = k.yeniEmailBekleyen;
        k.yeniEmailBekleyen = '';
        k.emailDogrulamaKodu = '';
        k.emailDogrulamaSonGecerli = null;
        await k.save();
        res.send("<script>alert('Mail adresiniz başarıyla güncellendi.'); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// Davet linki kopyalandı bildirimi (sadece kodun sahibi işaretleyebilir)
router.post('/referans-kopyalandi', async (req, res) => {
    console.log('[referans-kopyalandi] istek geldi:', { kod: req.body && req.body.kod, kullanici: req.session && req.session.kullaniciAdi });
    if (!req.session || !req.session.kullaniciAdi) {
        console.warn('[referans-kopyalandi] oturum yok → 401');
        return res.status(401).json({ ok: false, hata: 'oturum_yok' });
    }
    try {
        const kod = (req.body.kod || '').trim();
        if (!kod) {
            console.warn('[referans-kopyalandi] kod boş → 400');
            return res.status(400).json({ ok: false, hata: 'kod_bos' });
        }
        const ref = await ReferansKodu.findOne({ kod, olusturan: req.session.kullaniciAdi });
        if (!ref) {
            console.warn('[referans-kopyalandi] kod bulunamadı → 404 |', kod, '|', req.session.kullaniciAdi);
            return res.status(404).json({ ok: false, hata: 'kod_bulunamadi' });
        }
        if (!ref.kopyalandi) {
            ref.kopyalandi = true;
            ref.kopyalanmaTarih = new Date();
            await ref.save();
            console.log('[referans-kopyalandi] kalıcı işaretlendi:', kod);
        } else {
            console.log('[referans-kopyalandi] zaten işaretliydi:', kod);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('[referans-kopyalandi] hata:', err && err.stack || err);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

module.exports = router;