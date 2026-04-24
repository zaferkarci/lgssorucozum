const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');

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

// Oturum kontrol: session'daki kullanıcı URL'dekiyle eşleşmeli
function oturumKontrol(req, res, next) {
    if (!req.session || !req.session.kullaniciAdi) {
        return res.redirect('/');
    }
    if (req.params.kullaniciAdi && req.session.kullaniciAdi !== req.params.kullaniciAdi) {
        return res.status(403).send('Bu sayfaya erişim yetkiniz yok.');
    }
    if (req.body.kullaniciAdi && req.session.kullaniciAdi !== req.body.kullaniciAdi) {
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
    // Sadece yayında olan, öğrencinin sınıf seviyesindeki ve çözülmemiş sorular
    const yayindaSorular = await Soru.find({ durum: 'yayinda', sinif: String(k.sinif) }).lean();
    const cozulmemisSorular = yayindaSorular.filter(s => !cozulenIds.has(String(s._id)));
    cozulmemisSorular.sort((a, b) => {
        const za = a.zorlukKatsayisi || 3;
        const zb = b.zorlukKatsayisi || 3;
        if (za !== zb) return za - zb;
        // Aynı zorlukta: kullanıcı adı + soru _id karması ile stabil ama kişiye özel sıralama
        const hashA = (String(k.kullaniciAdi) + String(a._id)).split('').reduce((h,c) => (h*31 + c.charCodeAt(0)) & 0xffffffff, 0);
        const hashB = (String(k.kullaniciAdi) + String(b._id)).split('').reduce((h,c) => (h*31 + c.charCodeAt(0)) & 0xffffffff, 0);
        return hashA - hashB;
    });
    const sorular = cozulmemisSorular;

    const zorlukBilgisi = (soru) => {
        const z = soru.zorlukKatsayisi || 3;
        if (z < 1.5) return { etiket: "Çok Kolay", renk: "#27ae60" };
        if (z < 2.5) return { etiket: "Kolay",     renk: "#2ecc71" };
        if (z < 3.5) return { etiket: "Orta",      renk: "#f39c12" };
        if (z < 4.5) return { etiket: "Zor",       renk: "#e67e22" };
        return { etiket: "Çok Zor", renk: "#c0392b" };
    };

    // Profil için sıralama — önce cache'den dene, yoksa canlı hesapla (fallback)
    let siralamaVerisi = { turkiye: 1, il: 1, ilce: 1, okul: 1, sinif: 1, toplamKullanici: 1, ilKullanici: 1, ilceKullanici: 1, okulKullanici: 1, sinifKullanici: 1, dersSiralamalari: {} };
    if (mod === 'profil') {
        if (k.siralamaCache && k.siralamaCache.turkiye !== undefined) {
            // Cache'den oku (hızlı)
            siralamaVerisi = k.siralamaCache;
        } else {
            // Fallback: canlı hesapla (cron henüz çalışmadıysa)
            const tumKullanicilar = await Kullanici.find({}).lean();
            const kOrtTop = ortToplamHesapla(k);

            const turkiyeListesi = tumKullanicilar.map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const ilListesi      = tumKullanicilar.filter(u => u.il === k.il).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const ilceListesi    = tumKullanicilar.filter(u => u.ilce === k.ilce).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const okulListesi    = tumKullanicilar.filter(u => u.okul === k.okul).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const sinifFiltre = (u) => u.okul === k.okul && Number(u.sinif) === Number(k.sinif) && (k.sube ? u.sube === k.sube : true);
            const sinifListesi = tumKullanicilar.filter(sinifFiltre).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);

            siralamaVerisi = {
                turkiye:        turkiyeListesi.findIndex(p => p <= kOrtTop) + 1,
                il:             ilListesi.findIndex(p => p <= kOrtTop) + 1,
                ilce:           ilceListesi.findIndex(p => p <= kOrtTop) + 1,
                okul:           okulListesi.findIndex(p => p <= kOrtTop) + 1,
                sinif:          sinifListesi.findIndex(p => p <= kOrtTop) + 1,
                toplamKullanici: turkiyeListesi.length,
                ilKullanici:    ilListesi.length,
                ilceKullanici:  ilceListesi.length,
                okulKullanici:  okulListesi.length,
                sinifKullanici: sinifListesi.length
            };

            const dersSiralamalari = {};
            const tumDersler = [...new Set(tumKullanicilar.flatMap(u => (u.dersPuanlari||[]).map(d => d.ders)))];
            for (const dersAdi of tumDersler) {
                const dersOrtFn = (u) => {
                    const d = (u.dersPuanlari||[]).find(x => x.ders === dersAdi);
                    return d && d.soruSayisi > 0 ? d.toplamPuan / d.soruSayisi : 0;
                };
                const kDersOrt = dersOrtFn(k);
                const tList = tumKullanicilar.map(dersOrtFn).sort((a,b) => b-a);
                const iList = tumKullanicilar.filter(u => u.il === k.il).map(dersOrtFn).sort((a,b) => b-a);
                const ilList = tumKullanicilar.filter(u => u.ilce === k.ilce).map(dersOrtFn).sort((a,b) => b-a);
                const oList = tumKullanicilar.filter(u => u.okul === k.okul).map(dersOrtFn).sort((a,b) => b-a);
                const sList = tumKullanicilar.filter(sinifFiltre).map(dersOrtFn).sort((a,b) => b-a);
                dersSiralamalari[dersAdi] = {
                    turkiye: tList.findIndex(p => p <= kDersOrt) + 1,
                    il:      iList.findIndex(p => p <= kDersOrt) + 1,
                    ilce:    ilList.findIndex(p => p <= kDersOrt) + 1,
                    okul:    oList.findIndex(p => p <= kDersOrt) + 1,
                    sinif:   sList.findIndex(p => p <= kDersOrt) + 1,
                    toplamKullanici: tList.length,
                    ilKullanici: iList.length,
                    ilceKullanici: ilList.length,
                    okulKullanici: oList.length,
                    sinifKullanici: sList.length
                };
            }
            siralamaVerisi.dersSiralamalari = dersSiralamalari;
        }
    }

    const ReferansKodu = require('../models/ReferansKodu');
    const kullanicininKodlari = await ReferansKodu.find({ olusturan: k.kullaniciAdi }).sort({ olusturmaTarih: 1 }).lean();
    const baseUrl = process.env.SITE_URL || 'https://' + req.get('host');

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
        baseUrl
    });
});

router.post('/cevap', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
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

module.exports = router;