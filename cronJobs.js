// Günlük cron job — her gün 05:00 (Europe/Istanbul) çalışır
// Sorunun istatistiklerini CevapKaydi'dan yeniden hesaplar, kullanıcı puanlarını yeni zorluklarla günceller

const Soru = require('./models/Soru');
const Kullanici = require('./models/Kullanici');
const CevapKaydi = require('./models/CevapKaydi');

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
    if (sure <= 30) return 1;
    if (sure <= 60) return 2;
    if (sure <= 120) return 3;
    if (sure <= 180) return 4;
    return 5;
}

// --- Adım 1: Soru istatistiklerini CevapKaydi'lardan yeniden hesapla ---
async function soruIstatistikHesapla() {
    const tumSorular = await Soru.find({});
    const MINIMUM_COZUM = 50;

    for (const s of tumSorular) {
        const kayitlar = await CevapKaydi.find({ soruId: s._id });

        if (kayitlar.length === 0) {
            s.cozulmeSayisi = 0;
            s.dogruSayisi = 0;
            s.ortalamaSure = 0;
            s.cozumSureleriTum = [];
            s.dogruCevapSureleri = [];
            s.zorlukKatsayisi = 3;
            s.hamPuan = null;
            await s.save();
            continue;
        }

        const tumSureler = kayitlar.map(k => k.sure);
        const dogruKayitlar = kayitlar.filter(k => k.dogruMu);
        const dogruSureler = dogruKayitlar.map(k => k.sure);

        s.cozulmeSayisi = kayitlar.length;
        s.dogruSayisi = dogruKayitlar.length;
        s.ortalamaSure = tumSureler.reduce((a,b) => a+b, 0) / tumSureler.length;
        s.cozumSureleriTum = tumSureler;
        s.dogruCevapSureleri = dogruSureler;

        // Zorluk katsayısı hesabı
        let Z_final = 3;
        if (s.cozulmeSayisi > 0) {
            const dogruOrani = s.dogruSayisi / s.cozulmeSayisi;
            const D = dogruOraniKademesi(dogruOrani);
            const S = dogruSureler.length > 0
                ? dogruSureler.reduce((acc, sure) => acc + sureKademesi(sure), 0) / dogruSureler.length
                : 3;
            const sigma = stdSapma(dogruSureler);
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

// --- Adım 2: Her kullanıcının puanını yeni zorluklara göre yeniden hesapla ---
async function kullaniciPuanHesapla() {
    const tumKullanicilar = await Kullanici.find({});

    for (const k of tumKullanicilar) {
        const kayitlar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }).sort({ tarih: 1 });

        let toplamPuan = 0;
        let toplamSure = 0;
        const dersMap = {};

        for (const kayit of kayitlar) {
            const s = await Soru.findById(kayit.soruId);
            if (!s) continue;

            toplamSure += kayit.sure || 0;

            const dersAdi = s.ders || 'Diğer';
            if (!dersMap[dersAdi]) {
                dersMap[dersAdi] = { ders: dersAdi, toplamPuan: 0, soruSayisi: 0, toplamSure: 0 };
            }
            dersMap[dersAdi].soruSayisi += 1;
            dersMap[dersAdi].toplamSure += kayit.sure || 0;

            if (kayit.dogruMu) {
                // Puanı YENİ zorluk/süre/istatistiklerle yeniden hesapla
                const T_ref = s.ortalamaSure || 60;
                const T_ogr = kayit.sure || T_ref;
                const T_min = 10;
                const logHiz = Math.log2(1 + (T_ref / T_ogr));
                const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
                const hizBileseni = logMax * Math.tanh(logHiz / logMax);
                const dogruOrani = s.cozulmeSayisi > 0 ? s.dogruSayisi / s.cozulmeSayisi : 0.5;
                const sigmaBasari = s.cozulmeSayisi > 1
                    ? stdSapma(Array(s.dogruSayisi).fill(1).concat(Array(s.cozulmeSayisi - s.dogruSayisi).fill(0)))
                    : 0;
                const Z_katsayi = Math.min(1 + 4 * (1 - dogruOrani) * (1 + sigmaBasari), 5);
                const sigmaSure = stdSapma(s.cozumSureleriTum || []);
                const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);
                const kazanilanPuan = Math.max(Math.round(Z_katsayi * T_ref * hizBileseni * GE), 1);

                toplamPuan += kazanilanPuan;
                dersMap[dersAdi].toplamPuan += kazanilanPuan;
            }
        }

        k.puan = toplamPuan;
        k.toplamSure = toplamSure;
        k.soruIndex = kayitlar.length;
        k.dersPuanlari = Object.values(dersMap);
        k.markModified('dersPuanlari');
        await k.save();
    }
}

// --- Adım 3: Sorunun ham puan ortalamasını yeniden hesapla ---
async function hamPuanHesapla() {
    const tumSorular = await Soru.find({});
    for (const s of tumSorular) {
        const dogruKayitlar = await CevapKaydi.find({ soruId: s._id, dogruMu: true });
        if (dogruKayitlar.length === 0) {
            s.hamPuan = null;
        } else {
            const toplam = dogruKayitlar.reduce((acc, k) => acc + (k.kazanilanPuan || 0), 0);
            s.hamPuan = toplam / dogruKayitlar.length;
        }
        await s.save();
    }
}

// --- Ana fonksiyon ---
async function gunlukHesapla() {
    console.log('🔄 Günlük hesaplama başladı:', new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }));
    try {
        await soruIstatistikHesapla();
        console.log('  ✅ Soru istatistikleri güncellendi');
        await kullaniciPuanHesapla();
        console.log('  ✅ Kullanıcı puanları güncellendi');
        await hamPuanHesapla();
        console.log('  ✅ Ham puan ortalamaları güncellendi');
        console.log('✅ Günlük hesaplama tamamlandı');
    } catch (err) {
        console.error('❌ Günlük hesaplama hatası:', err.message);
    }
}

module.exports = { gunlukHesapla };
