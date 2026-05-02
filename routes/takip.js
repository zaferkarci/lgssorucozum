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
        // Kullanıcı adı zorunlu — diğer alanlar daraltıcı filtre
        const { il, ilce, okul, q } = req.query;
        if (!q || !q.trim()) {
            return res.json({ ok: true, sonuclar: [], mesaj: 'Aramak için kullanıcı adı zorunludur.' });
        }

        if (il && il.trim())   filtre.il = il.trim();
        if (ilce && ilce.trim()) filtre.ilce = ilce.trim();
        if (okul && okul.trim()) filtre.okul = okul.trim();
        // Kullanıcı adında kısmi eşleşme (case-insensitive)
        const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filtre.kullaniciAdi = regex;

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

// Takip isteği gönderir
// - Öğretmen → öğrenciAdi belirtir (req.body.ogrenciAdi)
// - Öğrenci  → ogretmenAdi belirtir (req.body.ogretmenAdi)
router.post('/takip/istek-gonder', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.status(401).json({ ok: false, hata: 'Oturum bulunamadı.' });
        if (benim.rol !== 'ogretmen' && benim.rol !== 'ogrenci') {
            return res.status(403).json({ ok: false, hata: 'Sadece öğretmen veya öğrenciler takip isteği gönderebilir.' });
        }

        let ogretmenAdi, ogrenciAdi;
        if (benim.rol === 'ogretmen') {
            ogretmenAdi = benim.kullaniciAdi;
            ogrenciAdi = (req.body.ogrenciAdi || '').trim();
            if (!ogrenciAdi) return res.json({ ok: false, hata: 'Öğrenci adı gerekli.' });
            const hedef = await Kullanici.findOne({ kullaniciAdi: ogrenciAdi }).lean();
            if (!hedef || hedef.rol !== 'ogrenci') return res.json({ ok: false, hata: 'Geçerli bir öğrenci bulunamadı.' });
        } else {
            // Öğrenci → öğretmene istek
            ogrenciAdi = benim.kullaniciAdi;
            ogretmenAdi = (req.body.ogretmenAdi || '').trim();
            if (!ogretmenAdi) return res.json({ ok: false, hata: 'Öğretmen adı gerekli.' });
            const hedef = await Kullanici.findOne({ kullaniciAdi: ogretmenAdi }).lean();
            if (!hedef || hedef.rol !== 'ogretmen') return res.json({ ok: false, hata: 'Geçerli bir öğretmen bulunamadı.' });
        }

        // Mevcut kayıt var mı?
        const mevcut = await TakipIliski.findOne({ ogretmenAdi, ogrenciAdi });
        if (mevcut) {
            if (mevcut.durum === 'kabul')     return res.json({ ok: false, hata: 'Bu kişiyle zaten takip ilişkin var.' });
            if (mevcut.durum === 'beklemede') return res.json({ ok: false, hata: 'İstek zaten beklemede.' });
            // Reddedilmişse yeniden açılır
            mevcut.durum = 'beklemede';
            mevcut.isteyenRol = benim.rol;
            mevcut.istekTarih = new Date();
            mevcut.yanitTarih = null;
            await mevcut.save();
            return res.json({ ok: true, mesaj: 'İstek yeniden gönderildi.' });
        }

        await new TakipIliski({
            ogretmenAdi,
            ogrenciAdi,
            isteyenRol: benim.rol
        }).save();
        res.json({ ok: true, mesaj: 'Takip isteği gönderildi.' });
    } catch (err) {
        console.error('[takip-istek-gonder] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Bekleyen takip isteğine yanıt verir (kabul/red)
// İsteyen değilim, alıcıyım — tek kontrol bu
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

        // Yanıtlayabilen taraf: isteyenin tersi (öğrenci başlattıysa öğretmen yanıtlar, vice versa)
        const benTarafim = (iliski.ogretmenAdi === benim.kullaniciAdi) ? 'ogretmen' :
                          (iliski.ogrenciAdi  === benim.kullaniciAdi) ? 'ogrenci' : null;
        if (!benTarafim) {
            return res.status(403).json({ ok: false, hata: 'Bu istek size ait değil.' });
        }
        // Bekleyen istekte: sadece "isteyen değilim" olan taraf yanıtlayabilir
        // Kabul edilmiş ilişkide: her iki taraf da "Takipten çıkar" diyebilir
        if (iliski.durum === 'beklemede' && benTarafim === iliski.isteyenRol) {
            return res.status(403).json({ ok: false, hata: 'Kendi gönderdiğiniz isteğe yanıt veremezsiniz.' });
        }
        if (iliski.durum === 'red') {
            return res.json({ ok: false, hata: 'Bu istek zaten reddedilmiş.' });
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

// Bekleyen istek sayısı (her iki rol için, üst menü rozetinde gösterilir)
router.get('/api/takip/bekleyen-istekler', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, sayi: 0 });

        // "Bana gelen" = isteyenRol benim rolümün tersi
        const filtre = (benim.rol === 'ogretmen')
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'beklemede', isteyenRol: 'ogrenci' }
            : { ogrenciAdi:  benim.kullaniciAdi, durum: 'beklemede', isteyenRol: 'ogretmen' };
        const sayi = await TakipIliski.countDocuments(filtre);
        res.json({ ok: true, sayi });
    } catch (err) {
        res.json({ ok: false, sayi: 0 });
    }
});

// Bana gelen bekleyen istekler (kim gönderdiyse karşı rolü ile detay)
router.get('/api/takip/gelenler', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, hata: 'Oturum bulunamadı' });

        const filtre = (benim.rol === 'ogretmen')
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'beklemede', isteyenRol: 'ogrenci' }
            : { ogrenciAdi:  benim.kullaniciAdi, durum: 'beklemede', isteyenRol: 'ogretmen' };
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
                ogretmenIl:   (benim.rol === 'ogretmen') ? null : d.il,
                ogretmenIlce: (benim.rol === 'ogretmen') ? null : d.ilce,
                ogrenciOkul:  (benim.rol === 'ogretmen') ? d.okul : null,
                ogrenciIl:    (benim.rol === 'ogretmen') ? d.il : null,
                ogrenciIlce:  (benim.rol === 'ogretmen') ? d.ilce : null,
                ogrenciSinif: (benim.rol === 'ogretmen') ? d.sinif : null,
                ogrenciSube:  (benim.rol === 'ogretmen') ? d.sube : null
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

// Öğretmenin takip ettiği bir öğrencinin detaylı istatistikleri
// Erişim: yalnızca kabul edilmiş takip ilişkisi varsa
router.get('/api/takip/ogrenci-istatistik/:ogrenciAdi', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim || benim.rol !== 'ogretmen') {
            return res.status(403).json({ ok: false, hata: 'Sadece öğretmenler erişebilir.' });
        }

        const ogrenciAdi = req.params.ogrenciAdi;
        // Yetki: kabul edilmiş ilişki olmalı
        const iliski = await TakipIliski.findOne({
            ogretmenAdi: benim.kullaniciAdi,
            ogrenciAdi,
            durum: 'kabul'
        });
        if (!iliski) {
            return res.status(403).json({ ok: false, hata: 'Bu öğrenciyi takip etmek için onay alınmamış.' });
        }

        const ogrenci = await Kullanici.findOne({ kullaniciAdi: ogrenciAdi }).lean();
        if (!ogrenci) return res.json({ ok: false, hata: 'Öğrenci bulunamadı.' });

        // Cevap kayıtlarını al ve ders bazlı istatistikleri hesapla
        const CevapKaydi = require('../models/CevapKaydi');
        const Soru = require('../models/Soru');
        const cevaplar = await CevapKaydi.find({ kullaniciAdi: ogrenciAdi }).lean();
        const soruIds = cevaplar.map(c => c.soruId);
        const sorular = soruIds.length ? await Soru.find({ _id: { $in: soruIds } }, 'ders konu').lean() : [];
        const soruMap = {};
        sorular.forEach(s => { soruMap[String(s._id)] = s; });

        const dersIstat = {};
        let toplamDogru = 0, toplamYanlis = 0, toplamSure = 0;
        cevaplar.forEach(c => {
            const sb = soruMap[String(c.soruId)];
            if (!sb) return;
            const ders = sb.ders || 'Diğer';
            if (!dersIstat[ders]) dersIstat[ders] = { dogru: 0, yanlis: 0, sure: 0 };
            if (c.dogruMu) { dersIstat[ders].dogru++; toplamDogru++; }
            else           { dersIstat[ders].yanlis++; toplamYanlis++; }
            dersIstat[ders].sure += c.sure || 0;
            toplamSure += c.sure || 0;
        });

        res.json({
            ok: true,
            ogrenci: {
                kullaniciAdi: ogrenci.kullaniciAdi,
                sinif: ogrenci.sinif,
                sube: ogrenci.sube,
                il: ogrenci.il,
                ilce: ogrenci.ilce,
                okul: ogrenci.okul,
                puan: ogrenci.puan || 0,
                soruIndex: ogrenci.soruIndex || 0,
                dersPuanlari: ogrenci.dersPuanlari || [],
                siralamaCache: ogrenci.siralamaCache || null
            },
            istatistik: {
                toplamCevap: cevaplar.length,
                toplamDogru,
                toplamYanlis,
                ortSure: cevaplar.length ? Math.round(toplamSure / cevaplar.length) : 0,
                dersIstat
            }
        });
    } catch (err) {
        console.error('[takip-ogrenci-istatistik] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

// Öğretmen için: takip ettiği öğrencinin tam istatistik sayfası (ayrı HTML view)
// Erişim: yalnızca kabul edilmiş takip ilişkisi varsa
router.get('/takip/ogrenci/:ogrenciAdi', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim || benim.rol !== 'ogretmen') {
            return res.status(403).send('<div style="font-family:sans-serif; padding:40px; text-align:center;"><h2>Erişim engellendi</h2><p>Bu sayfayı yalnızca öğretmenler görüntüleyebilir.</p></div>');
        }

        const ogrenciAdi = req.params.ogrenciAdi;
        const iliski = await TakipIliski.findOne({
            ogretmenAdi: benim.kullaniciAdi,
            ogrenciAdi,
            durum: 'kabul'
        });
        if (!iliski) {
            return res.status(403).send('<div style="font-family:sans-serif; padding:40px; text-align:center;"><h2>Erişim engellendi</h2><p>Bu öğrenciyle henüz onaylanmış bir takip ilişkin yok.</p><a href="/panel/' + encodeURIComponent(benim.kullaniciAdi) + '?mod=takip" style="color:#1a73e8;">← Takip Sayfasına Dön</a></div>');
        }

        const ogrenci = await Kullanici.findOne({ kullaniciAdi: ogrenciAdi }).lean();
        if (!ogrenci) return res.status(404).send('Öğrenci bulunamadı.');

        const CevapKaydi = require('../models/CevapKaydi');
        const Soru = require('../models/Soru');
        const cevaplar = await CevapKaydi.find({ kullaniciAdi: ogrenciAdi }).lean();
        const soruIds = cevaplar.map(c => c.soruId);
        const sorular = soruIds.length ? await Soru.find({ _id: { $in: soruIds } }, 'ders').lean() : [];
        const soruMap = {};
        sorular.forEach(s => { soruMap[String(s._id)] = s; });

        const dersIstat = {};
        let toplamDogru = 0, toplamYanlis = 0, toplamSure = 0;
        cevaplar.forEach(c => {
            const sb = soruMap[String(c.soruId)];
            if (!sb) return;
            const ders = sb.ders || 'Diğer';
            if (!dersIstat[ders]) dersIstat[ders] = { dogru: 0, yanlis: 0, sure: 0 };
            if (c.dogruMu) { dersIstat[ders].dogru++; toplamDogru++; }
            else           { dersIstat[ders].yanlis++; toplamYanlis++; }
            dersIstat[ders].sure += c.sure || 0;
            toplamSure += c.sure || 0;
        });

        res.render('takip-ogrenci-detay', {
            ogretmenAdi: benim.kullaniciAdi,
            ogrenci: {
                kullaniciAdi: ogrenci.kullaniciAdi,
                sinif: ogrenci.sinif,
                sube: ogrenci.sube,
                il: ogrenci.il,
                ilce: ogrenci.ilce,
                okul: ogrenci.okul,
                puan: ogrenci.puan || 0,
                soruIndex: ogrenci.soruIndex || 0,
                siralamaCache: ogrenci.siralamaCache || null
            },
            istatistik: {
                toplamCevap: cevaplar.length,
                toplamDogru,
                toplamYanlis,
                ortSure: cevaplar.length ? Math.round(toplamSure / cevaplar.length) : 0,
                dersIstat
            },
            encodeURIComponent
        });
    } catch (err) {
        console.error('[takip-ogrenci-detay] hata:', err.message);
        res.status(500).send('<pre>' + err.message + '</pre>');
    }
});

module.exports = router;