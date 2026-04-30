const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const ReferansKodu = require('../models/ReferansKodu');

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
// İstisna: Basic Auth ile admin yetkisi varsa, başka bir kullanıcının profilini incelemesine izin ver.
function oturumKontrol(req, res, next) {
    const sessionKullanici = req.session && req.session.kullaniciAdi;
    const urlKullanici = req.params.kullaniciAdi;

    // Normal akış: session sahibi kendi sayfasını görüyorsa direk geçir (admin token olsa bile)
    if (sessionKullanici && urlKullanici && sessionKullanici === urlKullanici) {
        return next();
    }

    // Admin bypass: session yok veya session sahibi başka biri AMA admin token doğru
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Basic ')) {
        try {
            const cred = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
            const [u, p] = cred.split(':');
            if (u === (process.env.ADMIN_USER || 'admin') && p === (process.env.ADMIN_PASSWORD || '1234')) {
                req.adminGorunum = true;
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
    const mod = req.query.mod || 'soru';
    // Kullanıcının çözdüğü soru ID'lerini CevapKaydi'ndan topla
    const cozulenKayitlar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }, 'soruId').lean();
    const cozulenIds = new Set(cozulenKayitlar.map(c => String(c.soruId)));
    const ogretmen = k.rol === 'ogretmen';
    // Sadece yayında olan, öğrencinin sınıf seviyesindeki sorular
    // Öğretmen için: tüm yayında sorular (sınıf filtresi yok)
    const yayindaSorular = ogretmen
        ? await Soru.find({ durum: 'yayinda' }).lean()
        : await Soru.find({ durum: 'yayinda', sinif: String(k.sinif) }).lean();

    // Moderatör tüm soruları görür, öğrenci sadece çözülmemişleri
    const moderator = k.rol === 'moderator';
    const cozulmemisSorular = (moderator || ogretmen)
        ? yayindaSorular
        : yayindaSorular.filter(s => !cozulenIds.has(String(s._id)));

    cozulmemisSorular.sort((a, b) => {
        const uniteA = a.unite || '';
        const uniteB = b.unite || '';
        const uniteCmp = uniteA.localeCompare(uniteB, 'tr', { numeric: true });
        if (uniteCmp !== 0) return uniteCmp;
        const konuA = a.konu || '';
        const konuB = b.konu || '';
        const konuCmp = konuA.localeCompare(konuB, 'tr', { numeric: true });
        if (konuCmp !== 0) return konuCmp;
        const za = a.zorlukKatsayisi || 3;
        const zb = b.zorlukKatsayisi || 3;
        return za - zb;
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

    const kullanicininKodlari = await ReferansKodu.find({ olusturan: k.kullaniciAdi }).sort({ kopyalandi: 1, olusturmaTarih: 1 }).lean();
    const baseUrl = (process.env.SITE_URL || 'https://' + req.get('host')).replace(/\/$/, '');

    // Yeni soru bildirimi
    const yeniSoruSayisi = (k.soruIndex > 0 && cozulmemisSorular.length > 0) ? cozulmemisSorular.length : 0;

    // Ders istatistikleri — CevapKaydi'ndan ders/konu bazlı detay
    const tumCevaplar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }).lean();
    const soruIdleri = [...new Set(tumCevaplar.map(c => String(c.soruId)))];
    const cevapSorular = soruIdleri.length > 0
        ? await Soru.find({ _id: { $in: soruIdleri } }, 'ders unite konu soruMetni soruOnculu1 soruOnculu1Resmi soruOnculu2 soruOnculu2Resmi soruOnculu3 soruOnculu3Resmi soruResmi secenekler dogruCevapIndex tabloBaslik sikDizilimi _id').lean()
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
        if (!dersIstatMap[ders]) dersIstatMap[ders] = { toplamDogru: 0, toplamYanlis: 0, konular: {} };
        if (!dersIstatMap[ders].konular[konu]) dersIstatMap[ders].konular[konu] = { dogru: 0, yanlis: 0, toplamSure: 0 };
        if (c.dogruMu) { dersIstatMap[ders].toplamDogru++; dersIstatMap[ders].konular[konu].dogru++; }
        else           { dersIstatMap[ders].toplamYanlis++; dersIstatMap[ders].konular[konu].yanlis++; }
        dersIstatMap[ders].konular[konu].toplamSure += c.sure || 0;
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

    res.render('panel', {
        k,
        mod,
        sorular,
        zorlukBilgisi,
        basla: req.query.basla,
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
            // Zorluk artık anlık güncellenmiyor — günlük cron job (05:00) üzerinden hesaplanacak
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

// Şube güncelleme
router.post('/profil/sube-guncelle', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, sube } = req.body;
        await Kullanici.findOneAndUpdate({ kullaniciAdi }, { sube: sube || '' });
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