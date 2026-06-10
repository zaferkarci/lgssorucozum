const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const Soru = require('../models/Soru');
const CevapKaydi = require('../models/CevapKaydi');
const ReferansKodu = require('../models/ReferansKodu');
const Unite = require('../models/Unite');
const KonuIzin = require('../models/KonuIzin');
const Kurum = require('../models/Kurum');
const KurumUyelikIstek = require('../models/KurumUyelikIstek');
const KurumSinif = require('../models/KurumSinif');
const { lgsAgirlikliOrtalama } = require('../services/lgsOrtalama');
const TakipIliski = require('../models/TakipIliski');

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
    const MINIMUM_COZUM = 5;
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

// v4.3.65: LGS ağırlıklı ortalama hesabı services/lgsOrtalama.js'e taşındı.
// Bu fonksiyon geriye dönük uyumluluk için duruyor — kod içinde çok yerde
// 'ortToplamHesapla(k)' diye çağrılıyor.
function ortToplamHesapla(kullanici) {
    return lgsAgirlikliOrtalama(kullanici.dersPuanlari || []);
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

// v4.3.23: Bir sınıfın ders + konu bazlı ortalama başarısını hesaplayan yardımcı.
// Hem "Atandığım Sınıflar" hem kurum yöneticisinin sınıf detay sayfası kullanır.
// Dönüş: { dersIstat:{ders:{dogru,yanlis,toplam,oran,konular:[]}}, genelOran, genelToplamCevap }
async function sinifOrtalamaHesapla(ogrenciAdlari) {
    const sonuc = { dersIstat: {}, genelOran: 0, genelToplamCevap: 0 };
    try {
        if (!ogrenciAdlari || ogrenciAdlari.length === 0) return sonuc;
        const cevaplar = await CevapKaydi.find(
            { kullaniciAdi: { $in: ogrenciAdlari } }, 'soruId dogruMu'
        ).lean();
        if (cevaplar.length === 0) return sonuc;
        const soruIdler = [...new Set(cevaplar.map(c => String(c.soruId)))];
        const sorular = await Soru.find({ _id: { $in: soruIdler } }, 'ders konu').lean();
        const soruDersMap = {}, soruKonuMap = {};
        sorular.forEach(sr => {
            soruDersMap[String(sr._id)] = sr.ders || 'Diğer';
            soruKonuMap[String(sr._id)] = sr.konu || 'Genel';
        });
        let genelDogru = 0, genelToplam = 0;
        const konuSayac = {};
        cevaplar.forEach(c => {
            const ders = soruDersMap[String(c.soruId)] || 'Diğer';
            const konu = soruKonuMap[String(c.soruId)] || 'Genel';
            if (!sonuc.dersIstat[ders]) {
                sonuc.dersIstat[ders] = { dogru: 0, yanlis: 0, toplam: 0, oran: 0, konular: [] };
            }
            if (!konuSayac[ders]) konuSayac[ders] = {};
            if (!konuSayac[ders][konu]) konuSayac[ders][konu] = { dogru: 0, yanlis: 0 };
            sonuc.dersIstat[ders].toplam++;
            genelToplam++;
            if (c.dogruMu) {
                sonuc.dersIstat[ders].dogru++;
                genelDogru++;
                konuSayac[ders][konu].dogru++;
            } else {
                sonuc.dersIstat[ders].yanlis++;
                konuSayac[ders][konu].yanlis++;
            }
        });
        Object.keys(sonuc.dersIstat).forEach(ders => {
            const d = sonuc.dersIstat[ders];
            d.oran = d.toplam > 0 ? Math.round((d.dogru / d.toplam) * 100) : 0;
            const konular = [];
            Object.keys(konuSayac[ders] || {}).forEach(konu => {
                const ks = konuSayac[ders][konu];
                const kt = ks.dogru + ks.yanlis;
                konular.push({
                    konu: konu, dogru: ks.dogru, yanlis: ks.yanlis, toplam: kt,
                    oran: kt > 0 ? Math.round((ks.dogru / kt) * 100) : 0
                });
            });
            konular.sort((a, b) => a.oran - b.oran); // zayıftan güçlüye
            d.konular = konular;
        });
        sonuc.genelToplamCevap = genelToplam;
        sonuc.genelOran = genelToplam > 0 ? Math.round((genelDogru / genelToplam) * 100) : 0;
    } catch (e) {
        console.error('[sinifOrtalamaHesapla] hata:', e.message);
    }
    return sonuc;
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

    // v4.3.6: Eski kurumsal kullanıcılarda Kurum belgesi olmayabilir. Lazy oluştur.
    if (k.rol === 'kurumsal' && !k.yonettigiKurumId) {
        try {
            const yeniKurum = await new Kurum({
                ad: k.okul || ('Kurum-' + k.kullaniciAdi),
                tip: 'okul',
                il: k.il || '',
                ilce: k.ilce || '',
                olusturanKullaniciAdi: k.kullaniciAdi
            }).save();
            k.yonettigiKurumId = yeniKurum._id;
            await k.save();
        } catch (e) {
            console.error('[panel] Kurum lazy olusturma hatasi:', e.message);
        }
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

    let mod = req.query.mod || 'soru';
    // v4.6.0: Veli kullanıcı — veliPanel ve profil sekmelerine erişebilir.
    if (k.rol === 'veli' && mod !== 'profil') {
        mod = 'veliPanel';
    }
    // Kullanıcının çözdüğü soru ID'lerini CevapKaydi'ndan topla
    const cozulenKayitlar = await CevapKaydi.find({ kullaniciAdi: k.kullaniciAdi }, 'soruId dogruMu').lean();
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
    // v4.3.33: Demo hesabı da moderatör gibi TÜM soruları görür ve ileri-geri
    // geçer (çözülmüş/çözülmemiş ayrımı yok — demo hiçbir şey kaydetmez).
    const moderator = k.rol === 'moderator';
    const demo = k.rol === 'demo';
    // v4.3.34: Demo hesabı için sınıf seçici listesi — Unite koleksiyonundaki
    // sınıflar (soru/ünite tanımlı sınıflar). Demo ekran üstünden sınıf değiştirir.
    let demoSiniflar = [];
    if (demo) {
        try {
            const uList = await Unite.find({}, 'sinif').lean();
            demoSiniflar = [...new Set(uList.map(u => u.sinif).filter(Boolean).map(String))]
                .sort((a, b) => Number(a) - Number(b));
        } catch (e) { demoSiniflar = []; }
    }
    let cozulmemisSorular = (moderator || demo || ogretmen)
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

    if (dersFiltre && !ogretmen && !moderator && !demo) {
        cozulmemisSorular = cozulmemisSorular.filter(s => (s.ders || '') === dersFiltre);
    }
    if (eksikFiltre && !ogretmen && !moderator && !demo) {
        const [eDers, eKonu] = eksikFiltre.split('|');
        cozulmemisSorular = cozulmemisSorular.filter(s =>
            (s.ders || '') === eDers && (s.konu || '') === eKonu
        );
    }

    // v4.8.7: Konu izinleri — admin'in kapattigi konular ogrenciye gelmez.
    // Varsayilan ACIK; yalnizca KonuIzin'de acik:false olan konu suzulur.
    // Sadece gercek ogrencilere uygulanir (ogretmen/kurumsal/moderator/demo
    // tum sorulari gormeye devam eder — mevcut davranis).
    if (!ogretmen && !moderator && !demo) {
        try {
            const kapaliKayitlar = await KonuIzin.find({ sinif: String(k.sinif), acik: false }, 'ders unite konu').lean();
            if (kapaliKayitlar.length) {
                const kapaliSet = new Set(kapaliKayitlar.map(x => (x.ders||'')+'|'+(x.unite||'')+'|'+(x.konu||'')));
                cozulmemisSorular = cozulmemisSorular.filter(s =>
                    !kapaliSet.has((s.ders||'')+'|'+(s.unite||'')+'|'+(s.konu||''))
                );
            }
        } catch (e) { /* izin tablosu yoksa varsayilan acik */ }
    }

    // v4.8.8: Mastery gate — bir (ders,konu) konusunda yeterince soru cozulup
    //   basari >= %66 olunca o konunun kalan (normal) sorulari havuzdan cikar;
    //   ogrenci siradaki konuya gecer. Olcut: kart yuzdesi = (ders,konu) basina
    //   dogru/toplam (dersIstatMap ile ayni). Esik: en az min(3, o konudaki yayinda
    //   soru sayisi) soru cevaplanmis VE oran >= 0.66. Kumulatif (pencere yok).
    //   GECILMIS (skip) sorular budanmaz — konu gecse de sonda bekler; cozulup
    //   yanlis olursa oran %66 altina duser ve konu yeniden acilir. Skip puan
    //   cezasi (/cevap'ta 1/5,1/25,0) aynen korunur. Yalnizca gercek ogrenciye.
    if (!ogretmen && !moderator && !demo) {
        try {
            const cIds = [...new Set(cozulenKayitlar.map(c => String(c.soruId)))];
            const cTopics = cIds.length
                ? await Soru.find({ _id: { $in: cIds } }, 'ders konu').lean()
                : [];
            const topicMap = {};
            cTopics.forEach(s => { topicMap[String(s._id)] = (s.ders || 'Diğer') + '|' + (s.konu || 'Genel'); });
            const konuBasari = {}; // 'ders|konu' -> { dogru, toplam }
            cozulenKayitlar.forEach(c => {
                const tk = topicMap[String(c.soruId)];
                if (!tk) return;
                if (!konuBasari[tk]) konuBasari[tk] = { dogru: 0, toplam: 0 };
                konuBasari[tk].toplam++;
                if (c.dogruMu) konuBasari[tk].dogru++;
            });
            const konuToplam = {}; // sinifin (ders,konu) basina yayinda soru sayisi
            yayindaSorular.forEach(s => {
                const tk = (s.ders || 'Diğer') + '|' + (s.konu || 'Genel');
                konuToplam[tk] = (konuToplam[tk] || 0) + 1;
            });
            const gecilenKonular = new Set();
            Object.keys(konuBasari).forEach(tk => {
                const b = konuBasari[tk];
                const esikN = Math.min(3, konuToplam[tk] || 3);
                if (b.toplam >= esikN && (b.dogru / b.toplam) >= 0.66) gecilenKonular.add(tk);
            });
            if (gecilenKonular.size) {
                const skipIds = new Set((k.gecilenSorular || []).map(g => String(g.soruId)));
                cozulmemisSorular = cozulmemisSorular.filter(s =>
                    skipIds.has(String(s._id)) ||
                    !gecilenKonular.has((s.ders || 'Diğer') + '|' + (s.konu || 'Genel'))
                );
            }
        } catch (e) { /* gate hesaplanamadi -> tum sorular normal akista */ }
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

    // v4.4.0: Geçilen soruları sıralamada en sona itmek için harita oluştur
    // Anahtar: String(soruId), değer: gecisSayisi (1 ise 2. kez, 2+ ise 3+. kez)
    const gecilenSoruMap = {};
    if (!ogretmen && !moderator && !demo && k.gecilenSorular) {
        k.gecilenSorular.forEach(g => {
            if (g && g.soruId) gecilenSoruMap[String(g.soruId)] = g.gecisSayisi || 1;
        });
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

        // v4.4.0: Geçilen sorular ders/ünite/konu içinde EN SONA itilir.
        //   gecisSayisi=0 (geçilmemiş): normal akışta zorluğa göre artan
        //   gecisSayisi>=1: o konunun son zor sorusundan sonra, gecisSayisi'na göre
        const gecA = gecilenSoruMap[String(a._id)] || 0;
        const gecB = gecilenSoruMap[String(b._id)] || 0;
        if (gecA !== gecB) return gecA - gecB; // 0 → 1 → 2... azalan öncelikte

        // 4) Zorluk artan (geçilmemişler için)
        const za = a.zorlukKatsayisi != null ? a.zorlukKatsayisi : 3;
        const zb = b.zorlukKatsayisi != null ? b.zorlukKatsayisi : 3;
        if (za !== zb) return za - zb;

        // 5) Eşitlik durumunda soruID artan
        return String(a._id).localeCompare(String(b._id));
    });

    // Moderatör/demo için navigasyon indexi (ileri-geri tek tek geçiş)
    const modIdx = (moderator || demo) ? Math.max(0, Math.min(parseInt(req.query.idx) || 0, cozulmemisSorular.length - 1)) : 0;
    let sorular;
    if (moderator || demo) {
        // Tek soru göster — demo cevap verebilir, moderatör sadece inceler
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
            // v4.3.16: Sınıf filtresi okul ve şube dolu olmalı (boş okul/şube farklı kişileri eşleyemez)
            const sinifFiltre = (u) => u.okul && k.okul && u.okul === k.okul && Number(u.sinif) === Number(k.sinif) && (k.sube ? (u.sube && u.sube === k.sube) : true);

            const turkiyeListesi = tumKullanicilar.filter(nitelikliFiltre).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const ilListesi      = tumKullanicilar.filter(u => nitelikliFiltre(u) && u.il === k.il).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const ilceListesi    = tumKullanicilar.filter(u => nitelikliFiltre(u) && u.ilce === k.ilce).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            // v4.3.16: Okul ve sınıf sıralamaları sadece okul/şubesi dolu kullanıcılar arasında
            const okulListesi    = tumKullanicilar.filter(u => nitelikliFiltre(u) && u.okul && k.okul && u.okul === k.okul).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);
            const sinifListesi   = tumKullanicilar.filter(u => nitelikliFiltre(u) && sinifFiltre(u)).map(u => ortToplamHesapla(u)).sort((a, b) => b - a);

            // v4.3.16: Kullanıcının kendi okul/şubesi boşsa o sıralamalarda 0 (görünmez) döndür
            const okulGecerli  = !!k.okul;
            const sinifGecerli = !!k.okul && !!k.sube;

            siralamaVerisi = {
                turkiye:         kNitelikli ? turkiyeListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                il:              kNitelikli ? ilListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                ilce:            kNitelikli ? ilceListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                okul:            (kNitelikli && okulGecerli)  ? okulListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                sinif:           (kNitelikli && sinifGecerli) ? sinifListesi.findIndex(p => p <= kOrtTop) + 1 : 0,
                toplamKullanici: turkiyeListesi.length,
                ilKullanici:     ilListesi.length,
                ilceKullanici:   ilceListesi.length,
                okulKullanici:   okulGecerli  ? okulListesi.length  : 0,
                sinifKullanici:  sinifGecerli ? sinifListesi.length : 0,
                nitelikli:       kNitelikli,
                kullaniciSoruSayisi: kToplamSoru,
                minSoru:         MIN_SORU,
                okulGecerli,     // v4.3.16: view tarafı sıralama satırını gizlemek için
                sinifGecerli     // v4.3.16: aynısı
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
                // v4.3.16: Ders okul/sınıf sıralaması — sadece okul/şubesi dolu kullanıcılar
                const oList  = tumKullanicilar.filter(u => dersNitelikliFiltre(u) && u.okul && k.okul && u.okul === k.okul).map(dersOrtFn).sort((a,b) => b-a);
                const sList  = tumKullanicilar.filter(u => dersNitelikliFiltre(u) && sinifFiltre(u)).map(dersOrtFn).sort((a,b) => b-a);
                dersSiralamalari[dersAdi] = {
                    turkiye:        kDersNitelikli ? tList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    il:             kDersNitelikli ? iList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    ilce:           kDersNitelikli ? ilList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    okul:           (kDersNitelikli && okulGecerli)  ? oList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    sinif:          (kDersNitelikli && sinifGecerli) ? sList.findIndex(p => p <= kDersOrt) + 1 : 0,
                    toplamKullanici: tList.length,
                    ilKullanici:    iList.length,
                    ilceKullanici:  ilList.length,
                    okulKullanici:  okulGecerli  ? oList.length : 0,
                    sinifKullanici: sinifGecerli ? sList.length : 0,
                    nitelikli:      kDersNitelikli,
                    kullaniciSoruSayisi: kDersSoruSayisi
                };
            }
            siralamaVerisi.dersSiralamalari = dersSiralamalari;
        }
    }

    // v4.5.2: Ders bazlı günlük hedef — öğrenci/demo için her modda hesaplanır
    //   (v4.5.0'da yalnızca mod === 'profil' iken hesaplanıyordu, ama kart
    //   panele girer girmez görünmeli, profil sekmesine geçmeye gerek yok).
    let gunlukHedefData = null;
    if (k.rol === 'ogrenci' || k.rol === 'demo') {
        try {
            const { gunlukHedefHesap } = require('../services/gunlukHedef');
            gunlukHedefData = await gunlukHedefHesap(k.kullaniciAdi);
        } catch (e) {
            console.warn('[panel] gunlukHedef hesaplanamadi:', e.message);
        }
    }

    // v4.6.8: Öğretmen için otomatik günlük davet kodu üretimi tamamen kaldırıldı.
    //         (Önceki "kopyalanmamış taze kod 2'nin altındaysa 2'ye tamamla + günlük
    //         tavan 2" mantığı çıkarıldı.) Öğretmenler artık otomatik link almaz;
    //         mevcut kodları aşağıda yalnızca gösterilir.

    // v4.3.51: Davet linkleri sıralama — son oluşturulanlar en üstte,
    // kopyalananlar (kullanılmamış ama kopyalanmış) en altta.
    // Kopyalanmamış taze linkler üstte, içinde yeniden eskiye doğru dizilir.
    const kullanicininKodlari = await ReferansKodu.find({ olusturan: k.kullaniciAdi }).sort({ kopyalandi: 1, olusturmaTarih: -1 }).lean();
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
    if (!ogretmen && !moderator && !demo) {
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
    if (!ogretmen && !moderator && !demo && cozulmemisDersDagilim) {
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
            }))
            // v4.6.6: Tüm konular adaydır — sorusu kalan en zayıf konu önerilir
            // (%100 olsa bile). Zayıftan güçlüye sıralanır.
            .sort((a, b) => {
                if (a.oran !== b.oran) return a.oran - b.oran;
                return b.toplam - a.toplam;
            });
            // Sırayla (zayıftan güçlüye) geç, çözülmemiş sorusu olan ilk konuyu bul.
            // v4.6.6: Daha zayıf bir konu (sorusu bittiği için) atlandıysa, önerilen
            // konu "gerçekten en zayıf" değildir → kart metni buna göre dürüst yazılır.
            let dahaZayifAtlandi = false;
            for (const kn of konuListesi) {
                const kalanSoru = yayindaSorular.filter(s =>
                    !cozulenIds.has(String(s._id)) &&
                    (s.ders || '') === kn.ders &&
                    (s.konu || '') === kn.konu
                ).length;
                if (kalanSoru > 0) {
                    enZayifKonu = { ders: kn.ders, konu: kn.konu, oran: kn.oran, kalanSoru, gercektenEnZayif: !dahaZayifAtlandi };
                    break;
                }
                dahaZayifAtlandi = true;
            }
        } catch (e) { enZayifKonu = null; }
    }

    // v4.3.6: Kurumsal kullanıcı için kurum bilgisi + üye listesi (mod=kurumUyeleri sayfası için)
    let kurum = null;
    let kurumOgretmenler = [];
    let kurumOgrenciler = [];
    let bekleyenIstekler = []; // v4.3.7: kuruma katılma bekleyen öğretmen/öğrenci istekleri
    let kurumSiniflar = []; // v4.3.18: kurumun sınıfları + her birinin öğretmenleri/öğrenci sayıları
    let kurumSinifDetay = null; // v4.3.18: ?mod=kurumSinif sayfası için tek sınıfın detayı
    if (k.aktifRol === 'kurumsal' && k.yonettigiKurumId) {
        try {
            kurum = await Kurum.findById(k.yonettigiKurumId).lean();
            if (kurum) {
                const uyeler = await Kullanici.find(
                    { bagliKurumId: k.yonettigiKurumId },
                    'kullaniciAdi rol sinif sube il ilce okul puan soruIndex'
                ).lean();
                kurumOgretmenler = uyeler.filter(u => u.rol === 'ogretmen');
                kurumOgrenciler = uyeler.filter(u => u.rol === 'ogrenci');
                // Bekleyen istekleri yükle + isteyenin profil bilgilerini ekle
                const istekler = await KurumUyelikIstek.find(
                    { kurumId: k.yonettigiKurumId, durum: 'beklemede' }
                ).lean();
                if (istekler.length > 0) {
                    const isteyenAdlar = istekler.map(i => i.kullaniciAdi);
                    const isteyenProfilller = await Kullanici.find(
                        { kullaniciAdi: { $in: isteyenAdlar } },
                        'kullaniciAdi rol okul il ilce'
                    ).lean();
                    const profilMap = {};
                    isteyenProfilller.forEach(p => { profilMap[p.kullaniciAdi] = p; });
                    bekleyenIstekler = istekler.map(i => Object.assign({}, i, {
                        profil: profilMap[i.kullaniciAdi] || null
                    }));
                }

                // v4.3.18: Sınıf otomatik üretimi (lazy)
                // Öğrencilerin sinif+sube beyanından sınıflar oluşur.
                // Geçerli kombolar (her ikisi de dolu) için KurumSinif kaydı yoksa oluşturulur.
                try {
                    const sinifKombolari = {};
                    kurumOgrenciler.forEach(o => {
                        const sn = Number(o.sinif);
                        const sb = (o.sube || '').trim();
                        if (sn && sb) {
                            const anahtar = sn + '/' + sb;
                            if (!sinifKombolari[anahtar]) {
                                sinifKombolari[anahtar] = { sinif: sn, sube: sb, ogrenciSayisi: 0 };
                            }
                            sinifKombolari[anahtar].ogrenciSayisi++;
                        }
                    });
                    // Mevcut sınıf kayıtlarını yükle
                    const mevcutSiniflar = await KurumSinif.find({ kurumId: k.yonettigiKurumId }).lean();
                    const mevcutAnahtarSet = new Set(mevcutSiniflar.map(s => s.sinif + '/' + s.sube));
                    // Eksik olanları oluştur
                    for (const anahtar of Object.keys(sinifKombolari)) {
                        if (!mevcutAnahtarSet.has(anahtar)) {
                            const c = sinifKombolari[anahtar];
                            try {
                                await new KurumSinif({
                                    kurumId: k.yonettigiKurumId,
                                    sinif:   c.sinif,
                                    sube:    c.sube,
                                    atananOgretmenler: []
                                }).save();
                            } catch (e) {
                                if (e.code !== 11000) {
                                    console.error('[panel] Sınıf olusturma:', e.message);
                                }
                            }
                        }
                    }
                    // Hepsini yeniden çek
                    const tumSiniflar = await KurumSinif.find({ kurumId: k.yonettigiKurumId }).sort({ sinif: 1, sube: 1 }).lean();
                    kurumSiniflar = tumSiniflar.map(s => {
                        const k2 = s.sinif + '/' + s.sube;
                        return {
                            _id: s._id,
                            sinif: s.sinif,
                            sube:  s.sube,
                            atananOgretmenler: s.atananOgretmenler || [],
                            ogrenciSayisi: (sinifKombolari[k2] ? sinifKombolari[k2].ogrenciSayisi : 0)
                        };
                    });
                } catch (e) {
                    console.error('[panel] Sınıf yukleme:', e.message);
                }

                // v4.3.18: Sınıf detay modu (?mod=kurumSinif&sinif=X&sube=Y)
                if (mod === 'kurumSinif' && req.query.sinif && req.query.sube) {
                    const istenenSinif = Number(req.query.sinif);
                    const istenenSube  = String(req.query.sube).trim();
                    const sinifBelge = await KurumSinif.findOne({
                        kurumId: k.yonettigiKurumId,
                        sinif:   istenenSinif,
                        sube:    istenenSube
                    }).lean();
                    if (sinifBelge) {
                        // Bu sınıftaki öğrenciler (kuruma bağlı + sinif+sube eşleşen)
                        const siniftaki = kurumOgrenciler.filter(o =>
                            Number(o.sinif) === istenenSinif && (o.sube || '').trim() === istenenSube
                        );
                        // Atanan öğretmenlerin profilleri
                        let atananProfilller = [];
                        if (sinifBelge.atananOgretmenler && sinifBelge.atananOgretmenler.length > 0) {
                            atananProfilller = await Kullanici.find(
                                { kullaniciAdi: { $in: sinifBelge.atananOgretmenler } },
                                'kullaniciAdi rol email'
                            ).lean();
                        }
                        // v4.3.23: Sınıf ortalama başarısı (ders + konu bazlı)
                        const sinifOrt = await sinifOrtalamaHesapla(siniftaki.map(o => o.kullaniciAdi));
                        kurumSinifDetay = {
                            _id:               sinifBelge._id,
                            sinif:             sinifBelge.sinif,
                            sube:              sinifBelge.sube,
                            ogrenciler:        siniftaki,
                            atananOgretmenler: atananProfilller,
                            dersIstat:         sinifOrt.dersIstat,
                            genelOran:         sinifOrt.genelOran,
                            genelToplamCevap:  sinifOrt.genelToplamCevap,
                            // v4.3.20: Atanabilir öğretmenler — kuruma bağlı öğretmenler +
                            // yöneticinin kendisi. Zaten atanmış olanlar hariç.
                            atanabilirOgretmenler: (function() {
                                const atanmisSet = new Set(sinifBelge.atananOgretmenler || []);
                                const aday = [];
                                kurumOgretmenler.forEach(o => {
                                    if (!atanmisSet.has(o.kullaniciAdi)) {
                                        aday.push({ kullaniciAdi: o.kullaniciAdi, rol: 'ogretmen' });
                                    }
                                });
                                // Yöneticinin kendisi (zaten atanmamışsa)
                                if (!atanmisSet.has(k.kullaniciAdi)) {
                                    aday.push({ kullaniciAdi: k.kullaniciAdi, rol: 'kurumsal' });
                                }
                                return aday;
                            })()
                        };
                    }
                }
            }
        } catch (e) {
            console.error('[panel] Kurum bilgileri yuklenirken hata:', e.message);
        }
    }

    // v4.3.7-3.11: Öğretmen için — beyan ettiği okula bağlı kurumun bilgisi + onun gönderdiği istek durumu.
    // v4.3.11: Lazy fix geri getirildi, ama bir koruma ile:
    //   • Hiç istek yoksa → otomatik oluştur (eski öğretmenler için)
    //   • Önceki istek 'red' veya 'cikarildi' ise → otomatik yenisini açma (kullanıcı manuel istek atmalı)
    //   • 'beklemede' veya 'kabul' ise → mevcut isteği oku
    let oğretmenIcinKurum = null;
    let oğretmenIstekDurum = null;
    if (k.aktifRol === 'ogretmen' && k.rol === 'ogretmen') {
        if (!k.bagliKurumId && k.okul) {
            try {
                oğretmenIcinKurum = await Kurum.findOne({
                    ad: k.okul,
                    il: k.il || '',
                    ilce: k.ilce || ''
                }).lean();
                if (oğretmenIcinKurum) {
                    let istek = await KurumUyelikIstek.findOne({
                        kullaniciAdi: k.kullaniciAdi,
                        kurumId: oğretmenIcinKurum._id
                    });
                    if (!istek) {
                        // Hiç istek yok → otomatik oluştur
                        try {
                            istek = await new KurumUyelikIstek({
                                kullaniciAdi: k.kullaniciAdi,
                                kullaniciRol: 'ogretmen',
                                kurumId: oğretmenIcinKurum._id
                            }).save();
                        } catch (e) {
                            if (e.code !== 11000) {
                                console.error('[panel] Otomatik kurum istegi olusturulamadi:', e.message);
                            }
                        }
                    }
                    // Mevcut istek varsa (red/cikarildi dahil) dokunma — kullanıcı manuel atmalı
                    oğretmenIstekDurum = istek ? istek.durum : null;
                }
            } catch (e) { /* sessiz */ }
        }
    }

    // v4.3.11: Öğrenci için de aynı lazy fix akışı
    let ogrenciIcinKurum = null;
    let ogrenciIstekDurum = null;
    if (k.rol === 'ogrenci') {
        if (!k.bagliKurumId && k.okul) {
            try {
                ogrenciIcinKurum = await Kurum.findOne({
                    ad: k.okul,
                    il: k.il || '',
                    ilce: k.ilce || ''
                }).lean();
                if (ogrenciIcinKurum) {
                    let istek = await KurumUyelikIstek.findOne({
                        kullaniciAdi: k.kullaniciAdi,
                        kurumId: ogrenciIcinKurum._id
                    });
                    if (!istek) {
                        try {
                            istek = await new KurumUyelikIstek({
                                kullaniciAdi: k.kullaniciAdi,
                                kullaniciRol: 'ogrenci',
                                kurumId: ogrenciIcinKurum._id
                            }).save();
                        } catch (e) {
                            if (e.code !== 11000) {
                                console.error('[panel] Otomatik kurum istegi olusturulamadi (ogrenci):', e.message);
                            }
                        }
                    }
                    ogrenciIstekDurum = istek ? istek.durum : null;
                }
            } catch (e) { /* sessiz */ }
        }
    }

    // v4.3.21: Öğretmenin (veya kurumsal yöneticinin) atandığı sınıflar.
    // Profil "Atandığım Sınıflar" sekmesinde gösterilir. Her sınıf için
    // o sınıftaki öğrenci listesi de hazırlanır.
    let atandigimSiniflar = [];
    if (k.rol === 'ogretmen' || k.rol === 'kurumsal') {
        try {
            const siniflar = await KurumSinif.find({
                atananOgretmenler: k.kullaniciAdi
            }).sort({ sinif: 1, sube: 1 }).lean();
            for (const s of siniflar) {
                const kurumBilgi = await Kurum.findById(s.kurumId).lean();
                const ogrenciler = await Kullanici.find({
                    bagliKurumId: s.kurumId,
                    rol: 'ogrenci',
                    sinif: s.sinif,
                    sube: s.sube
                }, 'kullaniciAdi puan soruIndex').sort({ puan: -1 }).lean();

                // v4.3.22-3.23: Sınıfın ders + konu bazlı ortalama başarısı (helper ile)
                const sinifOrt = await sinifOrtalamaHesapla(ogrenciler.map(o => o.kullaniciAdi));

                atandigimSiniflar.push({
                    _id:        s._id,
                    sinif:      s.sinif,
                    sube:       s.sube,
                    kurumAdi:   kurumBilgi ? kurumBilgi.ad : '—',
                    ogrenciler: ogrenciler,
                    dersIstat:  sinifOrt.dersIstat,
                    genelOran:  sinifOrt.genelOran,
                    genelToplamCevap: sinifOrt.genelToplamCevap
                });
            }
        } catch (e) {
            console.error('[panel] atandigimSiniflar:', e.message);
        }
    }

    // v4.3.28: Veli paneli verisi — takip ettiği çocuklar + veli davet kodları.
    let veliCocuklar = [];
    let veliBekleyenler = [];
    let veliDavetKodlari = [];
    let veliAktiviteMap = {}; // v4.6.0: { ogrenciAdi: { cozumSayisi, girisYaptiMi } }
    let veliHedefMap = {};   // v4.6.1: { ogrenciAdi: { toplamBugun, toplamHedef, toplamTamamlandi } }
    if (k.rol === 'veli') {
        try {
            // Tüm veli takip ilişkileri (ogretmenAdi slotunda veli)
            const iliskiler = await TakipIliski.find({
                ogretmenAdi: k.kullaniciAdi,
                isteyenRol: 'veli'
            }).sort({ istekTarih: -1 }).lean();
            const cocukAdlar = iliskiler.map(i => i.ogrenciAdi);
            const cocukDetay = await Kullanici.find(
                { kullaniciAdi: { $in: cocukAdlar } },
                'kullaniciAdi puan soruIndex sinif sube okul sonGiris dersPuanlari'
            ).lean();
            const cocukMap = {};
            cocukDetay.forEach(c => { cocukMap[c.kullaniciAdi] = c; });
            iliskiler.forEach(i => {
                const d = cocukMap[i.ogrenciAdi] || {};
                const kayit = {
                    iliskiId:    i._id,
                    ogrenciAdi:  i.ogrenciAdi,
                    durum:       i.durum,
                    puan:        d.puan || 0,
                    soruIndex:   d.soruIndex || 0,
                    sinif:       d.sinif || '',
                    sube:        d.sube || '',
                    okul:        d.okul || '',
                    dersPuanlari: d.dersPuanlari || []
                };
                if (i.durum === 'kabul')      veliCocuklar.push(kayit);
                else if (i.durum === 'beklemede') veliBekleyenler.push(kayit);
            });
            // Veli davet kodları (kullanılmamış)
            veliDavetKodlari = await ReferansKodu.find({
                olusturan: k.kullaniciAdi,
                tip: 'veli',
                kullanildi: false
            }).sort({ olusturmaTarih: -1 }).lean();
            // v4.6.0: Bugünkü aktivite — her çocuk için kaç soru çözdü, aktif mi?
            // v4.6.1: Günlük hedef ilerlemesi — her çocuk için toplamBugun/toplamHedef
            if (veliCocuklar.length > 0) {
                const { takipEdilenAktivite } = require('../services/aktivite');
                const { gunlukHedefHesap } = require('../services/gunlukHedef');
                const akt = await takipEdilenAktivite(veliCocuklar.map(c => c.ogrenciAdi));
                akt.detayListe.forEach(d => { veliAktiviteMap[d.kullaniciAdi] = d; });
                for (const c of veliCocuklar) {
                    try {
                        const hd = await gunlukHedefHesap(c.ogrenciAdi);
                        veliHedefMap[c.ogrenciAdi] = { toplamBugun: hd.toplamBugun, toplamHedef: hd.toplamHedef, toplamTamamlandi: hd.toplamTamamlandi };
                    } catch (e2) { /* hedef yüklenemezse boş bırak */ }
                }
            }
        } catch (e) {
            console.error('[panel] veli verisi:', e.message);
        }
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
        demo,
        demoSiniflar,
        ogretmen,
        davetEdilenler,
        modIdx,
        gunlukHedefData,
        toplamSoru: cozulmemisSorular.length,
        landingStats,
        digerSinifSoruSayilari,
        cozulmemisDersDagilim,
        tumDersler,
        enZayifKonu,
        dersFiltre,
        eksikFiltre,
        eksikBilgiVar,
        kurum,
        kurumOgretmenler,
        kurumOgrenciler,
        bekleyenIstekler,
        kurumSiniflar,
        kurumSinifDetay,
        oğretmenIcinKurum,
        oğretmenIstekDurum,
        ogrenciIcinKurum,
        ogrenciIstekDurum,
        atandigimSiniflar,
        veliCocuklar,
        veliBekleyenler,
        veliDavetKodlari,
        veliAktiviteMap,
        veliHedefMap,
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
        // v4.3.33: Demo hesabı — cevap verir, doğru/yanlış bandı görür ama
        // HİÇBİR ŞEY KAYDEDİLMEZ. CevapKaydi yok, puan yok, süre yok, zorluk
        // güncellenmez. Aynı soru tekrar tekrar cevaplanabilir.
        if (k && k.rol === 'demo' && s) {
            const demoDogru = parseInt(secilenIndex) === s.dogruCevapIndex;
            const zD = (typeof s.zorlukKatsayisi === 'number') ? s.zorlukKatsayisi : 3;
            const demoIdx = req.body.idx != null ? req.body.idx : req.query.idx;
            return res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) +
                '?mod=soru&basla=true&sonuc=' + (demoDogru ? 'dogru' : 'yanlis') +
                '&z=' + encodeURIComponent(zD.toFixed(1)) +
                (demoIdx != null ? '&idx=' + encodeURIComponent(demoIdx) : ''));
        }
        if (s && k) {
            const T_ogr = Math.max(parseInt(gecenSure) || 1, 1);
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
            let kazanilanPuan = 0;

            // v4.4.0: Bu soru daha önce geçilmiş mi? Eğer evetse:
            //   - puanı 1/5'e indir (2. çözüm)
            //   - 3. ve sonraki çözümlerde 0 (gecisSayisi >= 2 olunca)
            //   - kayıtta ikinciKezMi=true bayrağı → cron istatistik dışlar
            let ikinciKezMi = false;
            let gecisSayisi = 0;
            if (k.gecilenSorular && k.gecilenSorular.length > 0) {
                const gecKayit = k.gecilenSorular.find(g => String(g.soruId) === String(s._id));
                if (gecKayit) {
                    ikinciKezMi = true;
                    gecisSayisi = gecKayit.gecisSayisi || 1;
                }
            }

            if (dogruMu) {
                // v4.3.50: Anlık puanda Z artık sorunun mevcut cron Z'sinden
                // gelir (s.zorlukKatsayisi). Dünkü cron'un belirlediği Z bugün
                // anlık puanda da kullanılır. Yarın 05:10'da Z yenilenince
                // bütün doğru cevaplar tekrar hesaplanır (kullaniciPuanHesapla).
                // Böylece ilk-son çözen ayrımı kalkar, tek fark süre.
                const eskiSureleri = [...(s.cozumSureleriTum || [])];
                const T_ref = s.ortalamaSure || 60;
                const T_min = 10;
                // v4.5.4: Alt sınır clamp. T_min bir alt sınırdır: 10 sn ve
                // altında çözen herkes 10 sn'de çözmüş sayılır (tavan puan).
                // Önceden T_min yalnız logMax'i belirliyordu, T_ogr'ye
                // uygulanmıyordu; 2 sn'de basan, 10 sn'de çözenden fazla puan
                // alıyordu. Şimdi efektif süre en az T_min.
                const T_ogr_eff = Math.max(T_ogr, T_min);
                const logHiz = Math.log2(1 + (T_ref / T_ogr_eff));
                const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
                const hizBileseni = logMax * Math.tanh(logHiz / logMax);
                const Z_katsayi = (typeof s.zorlukKatsayisi === 'number') ? s.zorlukKatsayisi : 3;
                const sigmaSure = stdSapma(eskiSureleri);
                const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);
                const kazanilanPuanHesap = Math.max(Z_katsayi * T_ref * hizBileseni * GE, 0);
                kazanilanPuan = kazanilanPuanHesap;

                // v4.4.0: ikinciKezMi ise puanı azalt
                // v4.4.1: Sınırsız 1/5^gecisSayisi formülü. Yuvarlama yok,
                //   tam ondalıklı saklanır. (EJS otomatik toString eder.)
                //   2. çözüm  (gecisSayisi=1): puan / 5
                //   3. çözüm  (gecisSayisi=2): puan / 25
                //   4. çözüm  (gecisSayisi=3): puan / 125
                //   n. çözüm  (gecisSayisi=n-1): puan / 5^(n-1)
                if (ikinciKezMi && gecisSayisi >= 1) {
                    // v4.8.8: 3. ve sonraki gecislerde (gecisSayisi>=3) puan 0;
                    //   oncesinde 1/5 (gecisSayisi=1) ve 1/25 (gecisSayisi=2).
                    kazanilanPuan = (gecisSayisi >= 3) ? 0 : (kazanilanPuan / Math.pow(5, gecisSayisi));
                }
                // 4 basamağa yuvarla (saklama optimizasyonu, görüntüde de
                // 4 basamağa kadar olur)
                kazanilanPuan = Math.round(kazanilanPuan * 10000) / 10000;

                k.puan += kazanilanPuan;

                // v4.4.0: ikinciKezMi olan cevap sorunun istatistiklerine
                // (hamPuan, ortSure, dogruOrani) etki etmez. Bu blok atlanır.
                if (!ikinciKezMi) {
                    // Sorunun ham puan ortalamasını güncelle
                    const oncekiHP = s.hamPuan;
                    const oncekiDogru = s.dogruSayisi || 0;
                    if (oncekiHP === null || oncekiHP === undefined || oncekiDogru === 0) {
                        s.hamPuan = kazanilanPuan;
                    } else {
                        s.hamPuan = ((oncekiHP * oncekiDogru) + kazanilanPuan) / (oncekiDogru + 1);
                    }
                }
            }

            // v4.4.0: ikinciKezMi olan cevap sorunun ortalama süre/doğru sayısına
            // da etki etmez — bu blok da atlanır.
            if (!ikinciKezMi) {
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
            // v4.4.0: ikinciKezMi flag'i — cron istatistik dışında tutar
            await new CevapKaydi({
                soruId: soruId,
                kullaniciAdi: kullaniciAdi,
                dogruMu: dogruMu,
                sure: T_ogr,
                kazanilanPuan: kazanilanPuan,
                ikinciKezMi: ikinciKezMi
            }).save();

            // v4.4.0: Soru çözüldüyse gecilenSorular listesinden sil
            // (geçti, çözdü, döngü tamamlandı). gecisSayisi=1 ise 2. çözümde silinir,
            // gecisSayisi>=2 ise hâlâ 0 puan alır ama listeden de silinmez —
            // çünkü öğrenci hâlâ "geçilmiş soru" olarak bunu tekrar yapabilir
            // ve cron'da hâlâ ikinciKezMi olarak işaretli kalır.
            // En sade davranış: 2+ çözümde sil. Aşağıdaki kullaniciKayitGuncelle
            // bloğunda yapılır.
            if (ikinciKezMi) {
                k.gecilenSorular = (k.gecilenSorular || []).filter(g => String(g.soruId) !== String(s._id));
                k.markModified('gecilenSorular');
                await k.save();
            }

            // v4.3.32: Cevap sonucunu yeni soru sayfasına taşı (üst bant pop-up için).
            // sonuc=dogru|yanlis, z=sorunun güncel zorluk katsayısı.
            const zDeg = (typeof s.zorlukKatsayisi === 'number') ? s.zorlukKatsayisi : 3;
            const sonucParam = dogruMu ? 'dogru' : 'yanlis';
            return res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) +
                '?basla=true&sonuc=' + sonucParam + '&z=' + encodeURIComponent(zDeg.toFixed(1)));
        }
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

// v4.4.0: Soru atlama endpoint'i. Hiçbir cevap kaydı oluşturmaz, hiçbir istatistik
// değişmez. Sadece Kullanici.gecilenSorular listesi güncellenir, soru bir
// sonraki sıralamada o ders/ünite/konu'nun en sonuna iter. 2. çözümde puan /5,
// 3+ çözümde 0 puan.
router.post('/gec', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, soruId } = req.body;
        if (!kullaniciAdi || !soruId) {
            return res.status(400).send("<script>alert('Eksik veri'); window.history.back();</script>");
        }
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send("<script>alert('Kullanıcı bulunamadı'); window.history.back();</script>");
        // Öğretmen/moderatör/demo soru geçmez (zaten soru çözmez)
        if (k.rol !== 'ogrenci') {
            return res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
        }
        if (!k.gecilenSorular) k.gecilenSorular = [];
        const mevcut = k.gecilenSorular.find(g => String(g.soruId) === String(soruId));
        if (mevcut) {
            mevcut.gecisSayisi = (mevcut.gecisSayisi || 1) + 1;
            mevcut.sonGecisTarihi = new Date();
        } else {
            k.gecilenSorular.push({
                soruId: soruId,
                gecisSayisi: 1,
                sonGecisTarihi: new Date()
            });
        }
        k.markModified('gecilenSorular');
        await k.save();
        return res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true&gec=1');
    } catch (err) {
        console.error('[/gec] hata:', err);
        res.status(500).send("Hata: " + err.message);
    }
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

// v4.3.10: Kurum arama — il/ilçeye göre o bölgedeki kurumları listeler.
// Profil sayfasındaki kurum arama formundan kullanılır (öğretmen + öğrenci).
router.get('/kurum/arama', oturumKontrol, async (req, res) => {
    try {
        const il   = (req.query.il   || '').trim();
        const ilce = (req.query.ilce || '').trim();
        if (!il || !ilce) return res.json({ ok: true, sonuclar: [] });
        const kurumlar = await Kurum.find({ il, ilce }, 'ad tip il ilce olusturanKullaniciAdi').limit(50).lean();
        res.json({ ok: true, sonuclar: kurumlar });
    } catch (err) { res.status(500).json({ ok: false, hata: err.message }); }
});

// v4.3.7-3.11: Öğretmen/öğrenci kuruma katılma isteği atar.
// v4.3.11 değişikliği: kurumId yerine okul/il/ilçe alır (kullanıcı listeden seçer).
// Sunucu tarafında bu üçüyle Kurum belgesi aranır:
//   • Kurum varsa → istek atılır + kullanıcı beyanı güncellenir
//   • Kurum yoksa → sadece kullanıcı beyanı güncellenir (kurum yöneticisi henüz
//     kayıt olmamış demektir; kullanıcı normal şekilde devam eder)
router.post('/kurum/istek-gonder', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, okul, il, ilce } = req.body;
        const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil';
        if (!okul || !il || !ilce) {
            return res.send("<script>alert('Lütfen il, ilçe ve okul seç.'); window.location.href='" + geri + "';</script>");
        }
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k) return res.status(404).send('Kullanıcı bulunamadı.');
        if (k.rol !== 'ogretmen' && k.rol !== 'ogrenci' && k.rol !== 'kurumsal') {
            return res.send("<script>alert('Bu rol istek atamaz.'); window.location.href='" + geri + "';</script>");
        }
        // Beyanı güncelle (her durumda — kayıtlı kurum yoksa bile)
        k.okul = okul;
        k.il   = il;
        k.ilce = ilce;
        await k.save();
        // O ilçede o adlı bir kurum kayıtlı mı?
        const kurum = await Kurum.findOne({ ad: okul, il, ilce });
        if (!kurum) {
            // Kayıtlı kurum yok — sadece beyan güncellendi, istek atılmaz
            return res.send("<script>alert('Okul bilgilerin güncellendi. Bu okul için henüz kurumsal yönetici kayıt olmamış.'); window.location.href='" + geri + "';</script>");
        }
        // Mevcut istek var mı?
        const mevcut = await KurumUyelikIstek.findOne({ kullaniciAdi, kurumId: kurum._id });
        if (mevcut) {
            if (mevcut.durum === 'beklemede') {
                return res.send("<script>alert('Bu kuruma zaten istek atmışsın, kurum yöneticisinin yanıtı bekleniyor.'); window.location.href='" + geri + "';</script>");
            }
            // red/cikarildi/kabul olsa bile yeniden aç (manuel istek)
            mevcut.durum = 'beklemede';
            mevcut.istekTarih = new Date();
            mevcut.yanitTarih = null;
            mevcut.yanitlayan = '';
            await mevcut.save();
        } else {
            await new KurumUyelikIstek({
                kullaniciAdi,
                kullaniciRol: k.rol,
                kurumId: kurum._id
            }).save();
        }
        res.send("<script>alert('İsteğin kurum yöneticisine iletildi. Onay bekleniyor.'); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.7: Kurumsal kullanıcı bir bekleyen isteği yanıtlar (kabul/red)
router.post('/kurum/istek-yanitla', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, istekId, yanit } = req.body;
        const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=kurumUyeleri';
        if (!['kabul', 'red'].includes(yanit)) return res.redirect(geri);
        const yanitlayan = await Kullanici.findOne({ kullaniciAdi });
        if (!yanitlayan || yanitlayan.rol !== 'kurumsal' || !yanitlayan.yonettigiKurumId) {
            return res.status(403).send('Yetki yok.');
        }
        const istek = await KurumUyelikIstek.findById(istekId);
        if (!istek) return res.send("<script>alert('İstek bulunamadı.'); window.location.href='" + geri + "';</script>");
        if (String(istek.kurumId) !== String(yanitlayan.yonettigiKurumId)) {
            return res.status(403).send('Bu istek senin kurumuna ait değil.');
        }
        if (istek.durum !== 'beklemede') {
            return res.send("<script>alert('Bu istek daha önce yanıtlanmış.'); window.location.href='" + geri + "';</script>");
        }
        istek.durum = yanit;
        istek.yanitTarih = new Date();
        istek.yanitlayan = kullaniciAdi;
        await istek.save();
        // v4.3.11-3.12: Red durumunda kullanıcının okul beyanı silinir (çıkarma ile aynı).
        // v4.3.12: Şube de silinir. İl/ilçe kalır.
        // Bu sayede reddedilen kullanıcı kurumun okulu/sınıfı adıyla beyanda kalamaz.
        if (yanit === 'red') {
            try {
                await Kullanici.findOneAndUpdate(
                    { kullaniciAdi: istek.kullaniciAdi },
                    { okul: '', sube: '' }
                );
            } catch (e) {
                console.error('[istek-yanitla] red okul/sube temizleme:', e.message);
            }
        }
        // Kabulse, isteyenin bagliKurumId'sini ayarla
        if (yanit === 'kabul') {
            await Kullanici.findOneAndUpdate(
                { kullaniciAdi: istek.kullaniciAdi },
                { bagliKurumId: istek.kurumId }
            );
            // v4.3.11: Eğer onaylanan kullanıcı öğretmen ise — takip ettiği (kabul'lü)
            // ve aynı okulu beyan eden öğrenciler için otomatik 'beklemede' istek
            // oluşur. Kurumsal yönetici her birini ayrı onaylar. (v4.3.10'da kaldırılmıştı,
            // geri getirildi.)
            if (istek.kullaniciRol === 'ogretmen') {
                try {
                    const kurum = await Kurum.findById(istek.kurumId).lean();
                    if (kurum) {
                        const iliskiler = await TakipIliski.find({
                            ogretmenAdi: istek.kullaniciAdi,
                            durum: 'kabul'
                        }, 'ogrenciAdi').lean();
                        if (iliskiler.length > 0) {
                            const ogrAdlar = iliskiler.map(i => i.ogrenciAdi);
                            // v4.3.12: Aday öğrenciler iki yoldan birinde olabilir:
                            //   a) Hâlâ okul=kurum.ad ile beyan etmiş ve bagliKurumId boş
                            //   b) Daha önce bu kuruma istek atıp red/cikarildi olmuş (okul boş)
                            // Adayları geniş tutuyoruz; her birini elden geçiriyoruz.
                            const adaylar = await Kullanici.find({
                                kullaniciAdi: { $in: ogrAdlar },
                                rol: 'ogrenci',
                                bagliKurumId: null
                            }, 'kullaniciAdi okul il ilce').lean();
                            for (const ogr of adaylar) {
                                try {
                                    // v4.3.12: Öğretmen yeniden kuruma katıldığında takip ettiği
                                    // öğrenciler için otomatik istek üretilir. Eski red/cikarildi
                                    // istekleri yeniden 'beklemede'ye çevrilir — öğretmenin
                                    // tekrar başvurusu öğrenciler için yeni bir tetikleyicidir.
                                    const mevcut = await KurumUyelikIstek.findOne({
                                        kullaniciAdi: ogr.kullaniciAdi,
                                        kurumId: kurum._id
                                    });
                                    // Öğrencinin bu kuruma dahil olabilmesi için:
                                    //   a) Mevcut beyanı kurumun okuluyla eşleşiyor olmalı, VEYA
                                    //   b) Daha önce bu kuruma istek atmış olmalı (red/cikarildi)
                                    var beyanEslesiyor = (ogr.okul === kurum.ad && ogr.il === kurum.il && ogr.ilce === kurum.ilce);
                                    if (!beyanEslesiyor && !mevcut) continue;

                                    if (!mevcut) {
                                        await new KurumUyelikIstek({
                                            kullaniciAdi: ogr.kullaniciAdi,
                                            kullaniciRol: 'ogrenci',
                                            kurumId: kurum._id
                                        }).save();
                                    } else if (mevcut.durum !== 'beklemede' && mevcut.durum !== 'kabul') {
                                        // red veya cikarildi → yeniden beklemede yap
                                        mevcut.durum = 'beklemede';
                                        mevcut.istekTarih = new Date();
                                        mevcut.yanitTarih = null;
                                        mevcut.yanitlayan = '';
                                        await mevcut.save();
                                    }
                                } catch (e) {
                                    if (e.code !== 11000) {
                                        console.error('[istek-yanitla] ogrenci istegi:', e.message);
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('[istek-yanitla] ogrenci toplama:', e.message);
                }
            }
        }
        const mesaj = yanit === 'kabul' ? istek.kullaniciAdi + ' kuruma eklendi.' : 'İstek reddedildi.';
        res.send("<script>alert('" + mesaj + "'); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.7: Kurumsal kullanıcı bir üyeyi kurumdan çıkarır (bagliKurumId temizler)
// v4.3.7-3.10: Kurumsal kullanıcı bir üyeyi kurumdan çıkarır.
// v4.3.10 değişikliği:
//  • Üyenin okul beyanı da silinir (kurumsal yöneticinin onaylamadığı bir kullanıcı,
//    kurumun okul adıyla beyanda bulunmaya devam edemez).
//  • İlgili istek kaydı silinmek yerine durum='cikarildi' olarak güncellenir,
//    böylece kullanıcı tekrar istek atana kadar profile'da neden çıkarıldığı
//    görünür ve lazy fix tekrar istek üretmez.
router.post('/kurum/uye-cikar', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, uyeKullaniciAdi } = req.body;
        const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=kurumUyeleri';
        const yonetici = await Kullanici.findOne({ kullaniciAdi });
        if (!yonetici || yonetici.rol !== 'kurumsal' || !yonetici.yonettigiKurumId) {
            return res.status(403).send('Yetki yok.');
        }
        const uye = await Kullanici.findOne({ kullaniciAdi: uyeKullaniciAdi });
        if (!uye) return res.send("<script>alert('Üye bulunamadı.'); window.location.href='" + geri + "';</script>");
        if (String(uye.bagliKurumId) !== String(yonetici.yonettigiKurumId)) {
            return res.send("<script>alert('Bu üye senin kurumunda değil.'); window.location.href='" + geri + "';</script>");
        }
        // v4.3.10-3.12: Üyenin bagliKurumId temizlenir + okul beyanı silinir.
        // v4.3.12: Şube de silinir (öğrenci sıralamada şubeye girmesin).
        // il/ilçe kalır.
        uye.bagliKurumId = null;
        uye.okul = '';
        uye.sube = '';
        await uye.save();
        // İstek kaydını sil değil, 'cikarildi' olarak işaretle
        await KurumUyelikIstek.findOneAndUpdate(
            { kullaniciAdi: uyeKullaniciAdi, kurumId: yonetici.yonettigiKurumId },
            { durum: 'cikarildi', yanitTarih: new Date(), yanitlayan: kullaniciAdi },
            { upsert: true }
        );
        res.send("<script>alert(\"" + uyeKullaniciAdi + " kurumdan çıkarıldı.\"); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.13: "Eksik istekleri yeniden tara" — kurumsal kullanıcı kuruma uygun olabilecek
// kullanıcılar için bekleyen istek olmayanları yakalar ve istek oluşturur.
//   • O kurumun okul/il/ilçesini beyan etmiş öğretmen+öğrenciler aranır.
//   • Bunlardan henüz kuruma bağlı değil ve hiç istek atılmamış olanlara
//     'beklemede' istek oluşturulur.
//   • 'red'/'cikarildi' olanlar atlanır (kullanıcı manuel istek atmalı).
//   • Mevcut 'beklemede'/'kabul' olanlara dokunulmaz.
router.post('/kurum/yeniden-tara', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi } = req.body;
        const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=kurumUyeleri';
        const yonetici = await Kullanici.findOne({ kullaniciAdi });
        if (!yonetici || yonetici.rol !== 'kurumsal' || !yonetici.yonettigiKurumId) {
            return res.status(403).send('Yetki yok.');
        }
        const kurum = await Kurum.findById(yonetici.yonettigiKurumId).lean();
        if (!kurum) return res.send("<script>alert('Kurum bulunamadı.'); window.location.href='" + geri + "';</script>");
        // O kuruma uyan kullanıcılar (öğretmen + öğrenci), henüz kuruma bağlı olmayanlar
        const adaylar = await Kullanici.find({
            rol: { $in: ['ogretmen', 'ogrenci'] },
            okul: kurum.ad,
            il:   kurum.il,
            ilce: kurum.ilce,
            bagliKurumId: null
        }, 'kullaniciAdi rol').lean();
        let yeniSayi = 0;
        for (const u of adaylar) {
            try {
                const mevcut = await KurumUyelikIstek.findOne({
                    kullaniciAdi: u.kullaniciAdi,
                    kurumId: kurum._id
                });
                if (mevcut) continue; // Hangi durumda olursa olsun dokunma
                await new KurumUyelikIstek({
                    kullaniciAdi: u.kullaniciAdi,
                    kullaniciRol: u.rol,
                    kurumId: kurum._id
                }).save();
                yeniSayi++;
            } catch (e) {
                if (e.code !== 11000) {
                    console.error('[yeniden-tara] istek olusturma:', e.message);
                }
            }
        }
        const mesaj = yeniSayi > 0
            ? yeniSayi + ' yeni bekleyen istek oluşturuldu.'
            : 'Eksik istek bulunamadı. Tüm uygun kullanıcılar zaten taranmış.';
        res.send("<script>alert(\"" + mesaj + "\"); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.20: Sınıfa öğretmen ata.
// Kurumsal yönetici bir sınıfa öğretmen atar. Atanan öğretmen:
//   • KurumSinif.atananOgretmenler dizisine eklenir
//   • O sınıftaki tüm öğrencileri TakipIliski'ye (durum:'kabul', kaynak:'sinif')
//     otomatik takip eder — öğrenci onayı gerekmez.
// Atanabilir öğretmen: kuruma bağlı (onaylı) öğretmen VEYA kurumsal yöneticinin kendisi.
router.post('/kurum/sinif-ogretmen-ata', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, sinifId, ogretmenAdi } = req.body;
        const yonetici = await Kullanici.findOne({ kullaniciAdi });
        if (!yonetici || yonetici.rol !== 'kurumsal' || !yonetici.yonettigiKurumId) {
            return res.status(403).send('Yetki yok.');
        }
        const sinif = await KurumSinif.findById(sinifId);
        if (!sinif) return res.status(404).send('Sınıf bulunamadı.');
        if (String(sinif.kurumId) !== String(yonetici.yonettigiKurumId)) {
            return res.status(403).send('Bu sınıf senin kurumuna ait değil.');
        }
        const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=kurumSinif&sinif=' + sinif.sinif + '&sube=' + encodeURIComponent(sinif.sube);
        // Atanacak öğretmen: kuruma bağlı öğretmen veya yöneticinin kendisi
        const ogr = await Kullanici.findOne({ kullaniciAdi: ogretmenAdi });
        if (!ogr) return res.send("<script>alert('Öğretmen bulunamadı.'); window.location.href='" + geri + "';</script>");
        const kuruma_bagli_ogretmen = (ogr.rol === 'ogretmen' && String(ogr.bagliKurumId) === String(yonetici.yonettigiKurumId));
        const yoneticinin_kendisi = (ogr.kullaniciAdi === yonetici.kullaniciAdi);
        if (!kuruma_bagli_ogretmen && !yoneticinin_kendisi) {
            return res.send("<script>alert('Sadece kuruma bağlı öğretmenler veya kurum yöneticisi atanabilir.'); window.location.href='" + geri + "';</script>");
        }
        // Zaten atanmışsa
        if (sinif.atananOgretmenler.includes(ogretmenAdi)) {
            return res.send("<script>alert('Bu öğretmen zaten bu sınıfa atanmış.'); window.location.href='" + geri + "';</script>");
        }
        sinif.atananOgretmenler.push(ogretmenAdi);
        await sinif.save();
        // O sınıftaki öğrencileri otomatik takibe al (kaynak:'sinif', durum:'kabul')
        const siniftakiler = await Kullanici.find({
            bagliKurumId: yonetici.yonettigiKurumId,
            rol: 'ogrenci',
            sinif: sinif.sinif,
            sube: sinif.sube
        }, 'kullaniciAdi').lean();
        let takipSayi = 0;
        for (const o of siniftakiler) {
            try {
                const mevcut = await TakipIliski.findOne({ ogretmenAdi, ogrenciAdi: o.kullaniciAdi });
                if (mevcut) {
                    // Bireysel takip varsa dokunma; yoksa kabul'e çek
                    if (mevcut.durum !== 'kabul') {
                        mevcut.durum = 'kabul';
                        mevcut.kaynak = 'sinif';
                        mevcut.yanitTarih = new Date();
                        await mevcut.save();
                        takipSayi++;
                    }
                } else {
                    await new TakipIliski({
                        ogretmenAdi,
                        ogrenciAdi: o.kullaniciAdi,
                        isteyenRol: 'ogretmen',
                        durum: 'kabul',
                        kaynak: 'sinif',
                        yanitTarih: new Date()
                    }).save();
                    takipSayi++;
                }
            } catch (e) {
                if (e.code !== 11000) console.error('[sinif-ogretmen-ata] takip:', e.message);
            }
        }
        res.send("<script>alert('" + ogretmenAdi + " sınıfa atandı. " + takipSayi + " öğrenci takibe alındı.'); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.20: Sınıftan öğretmen çıkar.
// Öğretmen KurumSinif.atananOgretmenler'den çıkarılır + o sınıfın öğrencileriyle
// olan 'sinif' kaynaklı takip ilişkileri silinir. 'bireysel' takipler korunur.
router.post('/kurum/sinif-ogretmen-cikar', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, sinifId, ogretmenAdi } = req.body;
        const yonetici = await Kullanici.findOne({ kullaniciAdi });
        if (!yonetici || yonetici.rol !== 'kurumsal' || !yonetici.yonettigiKurumId) {
            return res.status(403).send('Yetki yok.');
        }
        const sinif = await KurumSinif.findById(sinifId);
        if (!sinif) return res.status(404).send('Sınıf bulunamadı.');
        if (String(sinif.kurumId) !== String(yonetici.yonettigiKurumId)) {
            return res.status(403).send('Bu sınıf senin kurumuna ait değil.');
        }
        const geri = '/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=kurumSinif&sinif=' + sinif.sinif + '&sube=' + encodeURIComponent(sinif.sube);
        sinif.atananOgretmenler = (sinif.atananOgretmenler || []).filter(a => a !== ogretmenAdi);
        await sinif.save();
        // O sınıftaki öğrencilerle 'sinif' kaynaklı takipleri sil
        const siniftakiler = await Kullanici.find({
            bagliKurumId: yonetici.yonettigiKurumId,
            rol: 'ogrenci',
            sinif: sinif.sinif,
            sube: sinif.sube
        }, 'kullaniciAdi').lean();
        const ogrAdlar = siniftakiler.map(o => o.kullaniciAdi);
        let silinen = 0;
        if (ogrAdlar.length > 0) {
            const sonuc = await TakipIliski.deleteMany({
                ogretmenAdi,
                ogrenciAdi: { $in: ogrAdlar },
                kaynak: 'sinif'
            });
            silinen = sonuc.deletedCount || 0;
        }
        res.send("<script>alert('" + ogretmenAdi + " sınıftan çıkarıldı. " + silinen + " sınıf takibi kaldırıldı.'); window.location.href='" + geri + "';</script>");
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.31: Kurum yöneticisi davet linki üretir. Kendi seçtiği tipte
// (öğrenci / öğretmen / veli) sınırsız davet kodu oluşturabilir.
router.post('/kurum/davet-uret', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, tip } = req.body;
        const yonetici = await Kullanici.findOne({ kullaniciAdi });
        // Kurumsal rolü kontrolü — rolListesi'nde 'kurumsal' olmalı
        const kurumsalMi = yonetici && (
            yonetici.rol === 'kurumsal' ||
            (Array.isArray(yonetici.rolListesi) && yonetici.rolListesi.includes('kurumsal'))
        );
        if (!kurumsalMi) {
            return res.status(403).send('Bu işlem için kurum yöneticisi olmalısınız.');
        }
        const gecerliTipler = ['ogrenci', 'ogretmen', 'veli'];
        const secilenTip = gecerliTipler.includes(tip) ? tip : 'ogrenci';
        const { referansKoduUret } = require('./auth');
        await referansKoduUret(kullaniciAdi, 1, secilenTip);
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=profil');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// v4.3.28: Veli davet linki üret. Veli "Yeni davet linki üret" butonuna basar,
// tip:'veli' bir referans kodu oluşur. Bu kodla kaydolan öğrenci, veliyi onaysız
// takibe alır (kayit-yap içinde işlenir).
router.post('/veli/davet-uret', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi } = req.body;
        const veli = await Kullanici.findOne({ kullaniciAdi });
        if (!veli || veli.rol !== 'veli') {
            return res.status(403).send('Yetki yok.');
        }
        const { referansKoduUret } = require('./auth');
        await referansKoduUret(kullaniciAdi, 1, 'veli');
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi));
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

// Şube güncelleme
// v4.3.34: Demo hesabı sınıf seviyesini değiştirir. Soru çözme ekranının
// üstündeki dropdown'dan gelir. Demo o sınıfın sorularını görmeye başlar,
// soru indexi sıfırlanır (ilk sorudan başlar).
router.post('/demo/sinif-degistir', oturumKontrol, async (req, res) => {
    try {
        const { kullaniciAdi, sinif } = req.body;
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (!k || k.rol !== 'demo') {
            return res.status(403).send('Bu işlem yalnızca demo hesabı içindir.');
        }
        if (req.session.kullaniciAdi !== kullaniciAdi) {
            return res.status(403).send('Yetkisiz işlem.');
        }
        const yeniSinif = String(sinif || '').trim();
        if (yeniSinif) {
            k.sinif = yeniSinif;
            await k.save();
        }
        // Sınıf değişince ilk sorudan başla — idx=0
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?mod=soru&basla=true&idx=0');
    } catch (err) { res.status(500).send('Hata: ' + err.message); }
});

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