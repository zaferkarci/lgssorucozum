// Takip ilişkisi route'ları (Öğretmen ↔ Öğrenci)
const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const TakipIliski = require('../models/TakipIliski');

// Oturum kontrolü helper - panel.js'tekiyle uyumlu
function oturumGerekli(req, res, next) {
    if (!req.session || !req.session.kullaniciAdi) return res.status(401).json({ ok: false, hata: 'Oturum gerekli' });
    next();
}

// Arama yapanın oturumdaki rolü (öğretmen ise öğrenci arar, öğrenci ise öğretmen arar).
// Filtreler: il, ilçe, okul, kullaniciAdi (kısmi eşleşme)
router.get('/api/takip/ara', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, hata: 'Kullanıcı bulunamadı' });

        const aranacakRol = (benim.rol === 'ogretmen') ? 'ogrenci' : 'ogretmen';
        const filtre = { rol: aranacakRol };
        // En az 1 filtre kriteri zorunlu (boş listede tüm kullanıcılar dönmesin)
        const { il, ilce, okul, q } = req.query;
        const enAz1Filtre = (il && il.trim()) || (ilce && ilce.trim()) || (okul && okul.trim()) || (q && q.trim());
        if (!enAz1Filtre) return res.json({ ok: true, sonuclar: [], mesaj: 'En az bir filtre kriteri girin.' });

        if (il && il.trim())   filtre.il = il.trim();
        if (ilce && ilce.trim()) filtre.ilce = ilce.trim();
        if (okul && okul.trim()) filtre.okul = okul.trim();
        if (q && q.trim()) {
            // Kullanıcı adında kısmi eşleşme (case-insensitive)
            const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filtre.kullaniciAdi = regex;
        }

        const sonuclar = await Kullanici.find(filtre, 'kullaniciAdi sinif sube il ilce okul rol')
            .limit(50)
            .lean();

        // Mevcut takip ilişkilerini de getir (zaten istek gönderilmişleri işaretlemek için)
        const adlar = sonuclar.map(s => s.kullaniciAdi);
        let mevcutIliskiler = [];
        if (benim.rol === 'ogretmen') {
            mevcutIliskiler = await TakipIliski.find({ ogretmenAdi: benim.kullaniciAdi, ogrenciAdi: { $in: adlar } }).lean();
        } else {
            mevcutIliskiler = await TakipIliski.find({ ogrenciAdi: benim.kullaniciAdi, ogretmenAdi: { $in: adlar } }).lean();
        }
        const iliskiMap = {};
        mevcutIliskiler.forEach(i => {
            const anahtar = (benim.rol === 'ogretmen') ? i.ogrenciAdi : i.ogretmenAdi;
            iliskiMap[anahtar] = i.durum;
        });

        const zenginSonuclar = sonuclar.map(s => ({
            kullaniciAdi: s.kullaniciAdi,
            sinif: s.sinif,
            sube: s.sube,
            il: s.il,
            ilce: s.ilce,
            okul: s.okul,
            rol: s.rol,
            iliskiDurum: iliskiMap[s.kullaniciAdi] || null
        }));

        res.json({ ok: true, sonuclar: zenginSonuclar, benimRol: benim.rol });
    } catch (err) {
        console.error('[takip-ara] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Öğretmen → öğrenciye takip isteği gönderir
router.post('/takip/istek-gonder', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim || benim.rol !== 'ogretmen') {
            return res.status(403).json({ ok: false, hata: 'Sadece öğretmenler takip isteği gönderebilir.' });
        }

        const ogrenciAdi = (req.body.ogrenciAdi || '').trim();
        if (!ogrenciAdi) return res.json({ ok: false, hata: 'Öğrenci adı gerekli.' });

        const ogrenci = await Kullanici.findOne({ kullaniciAdi: ogrenciAdi }).lean();
        if (!ogrenci || ogrenci.rol !== 'ogrenci') {
            return res.json({ ok: false, hata: 'Geçerli bir öğrenci bulunamadı.' });
        }

        // Mevcut bir kayıt var mı?
        const mevcut = await TakipIliski.findOne({ ogretmenAdi: benim.kullaniciAdi, ogrenciAdi });
        if (mevcut) {
            if (mevcut.durum === 'kabul')      return res.json({ ok: false, hata: 'Zaten bu öğrenciyi takip ediyorsunuz.' });
            if (mevcut.durum === 'beklemede')  return res.json({ ok: false, hata: 'İstek zaten beklemede.' });
            // Reddedilmişse yeniden istek gönderilebilir → durumu sıfırla
            mevcut.durum = 'beklemede';
            mevcut.istekTarih = new Date();
            mevcut.yanitTarih = null;
            await mevcut.save();
            return res.json({ ok: true, mesaj: 'İstek yeniden gönderildi.' });
        }

        await new TakipIliski({
            ogretmenAdi: benim.kullaniciAdi,
            ogrenciAdi
        }).save();
        res.json({ ok: true, mesaj: 'Takip isteği gönderildi.' });
    } catch (err) {
        console.error('[takip-istek-gonder] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Öğrenci → bekleyen takip isteğine yanıt verir (kabul/red)
router.post('/takip/yanitla', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.status(401).json({ ok: false, hata: 'Oturum bulunamadı.' });

        const { iliskiId, yanit } = req.body;
        if (!['kabul', 'red'].includes(yanit)) {
            return res.json({ ok: false, hata: 'Geçersiz yanıt.' });
        }

        const iliski = await TakipIliski.findById(iliskiId);
        if (!iliski) return res.json({ ok: false, hata: 'İstek bulunamadı.' });

        // Yetki kontrolü: öğretmen → öğrenci ise sadece öğrenci yanıtlar; öğrenci → öğretmen ise sadece öğretmen yanıtlar
        const yanitlayicıAdi = (iliski.ogretmenAdi === benim.kullaniciAdi) ? null : iliski.ogrenciAdi;
        // Yani: bekleyen isteği sadece "diğer taraf" yanıtlayabilir
        const dogruYanitlayici = (iliski.ogretmenAdi !== benim.kullaniciAdi);
        if (!dogruYanitlayici && iliski.ogrenciAdi !== benim.kullaniciAdi) {
            return res.status(403).json({ ok: false, hata: 'Bu istek size ait değil.' });
        }
        // Öğretmenin gönderdiği isteğe öğrenci yanıt verir
        if (iliski.ogretmenAdi === benim.kullaniciAdi) {
            return res.status(403).json({ ok: false, hata: 'Kendi gönderdiğiniz isteğe yanıt veremezsiniz.' });
        }

        if (iliski.durum !== 'beklemede') {
            return res.json({ ok: false, hata: 'Bu istek zaten yanıtlanmış.' });
        }

        iliski.durum = yanit;
        iliski.yanitTarih = new Date();
        await iliski.save();

        res.json({ ok: true, mesaj: yanit === 'kabul' ? 'İstek kabul edildi.' : 'İstek reddedildi.' });
    } catch (err) {
        console.error('[takip-yanitla] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Öğrenci için bekleyen istekleri getir (panel.ejs'te badge için)
router.get('/api/takip/bekleyen-istekler', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, sayi: 0 });

        // Bekleyen istekler: bana (öğrenci/öğretmen fark etmez) gelmiş, durumu beklemede
        const filtre = (benim.rol === 'ogretmen')
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'beklemede' } // bu fazda bu hiç olmayacak
            : { ogrenciAdi: benim.kullaniciAdi, durum: 'beklemede' };
        const sayi = await TakipIliski.countDocuments(filtre);
        res.json({ ok: true, sayi });
    } catch (err) {
        res.json({ ok: false, sayi: 0 });
    }
});

// Öğrenciye gelen bekleyen istekler (öğretmen detayıyla beraber)
router.get('/api/takip/gelenler', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, hata: 'Oturum bulunamadı' });

        const filtre = (benim.rol === 'ogretmen')
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'beklemede' }
            : { ogrenciAdi: benim.kullaniciAdi, durum: 'beklemede' };
        const istekler = await TakipIliski.find(filtre).sort({ istekTarih: -1 }).lean();

        const adlar = istekler.map(i => benim.rol === 'ogretmen' ? i.ogrenciAdi : i.ogretmenAdi);
        const detaylar = await Kullanici.find({ kullaniciAdi: { $in: adlar } }, 'kullaniciAdi okul il ilce sinif sube rol').lean();
        const detayMap = {};
        detaylar.forEach(d => { detayMap[d.kullaniciAdi] = d; });

        const zengin = istekler.map(i => {
            const karsiAd = (benim.rol === 'ogretmen') ? i.ogrenciAdi : i.ogretmenAdi;
            const d = detayMap[karsiAd] || {};
            return {
                _id: i._id,
                ogretmenAdi: i.ogretmenAdi,
                ogrenciAdi: i.ogrenciAdi,
                durum: i.durum,
                istekTarih: i.istekTarih,
                ogretmenOkul: (benim.rol === 'ogretmen') ? null : d.okul,
                ogretmenIl: (benim.rol === 'ogretmen') ? null : d.il,
                ogretmenIlce: (benim.rol === 'ogretmen') ? null : d.ilce
            };
        });
        res.json({ ok: true, istekler: zengin });
    } catch (err) {
        console.error('[takip-gelenler] hata:', err.message);
        res.json({ ok: false, hata: err.message });
    }
});

// Öğrencinin kabul ettiği öğretmenler (beni takip edenler)
router.get('/api/takip/kabul-edilenler', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, hata: 'Oturum bulunamadı' });

        const filtre = (benim.rol === 'ogretmen')
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'kabul' } // bu fazda öğretmen takip ettiklerini görür
            : { ogrenciAdi: benim.kullaniciAdi, durum: 'kabul' };  // öğrenci beni takip eden öğretmenleri görür
        const iliskiler = await TakipIliski.find(filtre).sort({ yanitTarih: -1 }).lean();

        const adlar = iliskiler.map(i => benim.rol === 'ogretmen' ? i.ogrenciAdi : i.ogretmenAdi);
        const detaylar = await Kullanici.find({ kullaniciAdi: { $in: adlar } }, 'kullaniciAdi okul il ilce sinif sube rol puan soruIndex').lean();
        const detayMap = {};
        detaylar.forEach(d => { detayMap[d.kullaniciAdi] = d; });

        const zengin = iliskiler.map(i => {
            const karsiAd = (benim.rol === 'ogretmen') ? i.ogrenciAdi : i.ogretmenAdi;
            const d = detayMap[karsiAd] || {};
            return {
                _id: i._id,
                ogretmenAdi: i.ogretmenAdi,
                ogrenciAdi: i.ogrenciAdi,
                ogretmenOkul: (benim.rol === 'ogretmen') ? null : d.okul,
                ogretmenIl: (benim.rol === 'ogretmen') ? null : d.il,
                ogretmenIlce: (benim.rol === 'ogretmen') ? null : d.ilce,
                ogrenciOkul: (benim.rol === 'ogretmen') ? d.okul : null,
                ogrenciIl: (benim.rol === 'ogretmen') ? d.il : null,
                ogrenciIlce: (benim.rol === 'ogretmen') ? d.ilce : null,
                ogrenciSinif: (benim.rol === 'ogretmen') ? d.sinif : null,
                ogrenciSube: (benim.rol === 'ogretmen') ? d.sube : null,
                ogrenciPuan: (benim.rol === 'ogretmen') ? d.puan : null,
                ogrenciSoruIndex: (benim.rol === 'ogretmen') ? d.soruIndex : null
            };
        });
        res.json({ ok: true, takipciler: zengin });
    } catch (err) {
        console.error('[takip-kabul-edilenler] hata:', err.message);
        res.json({ ok: false, hata: err.message });
    }
});

module.exports = router;
