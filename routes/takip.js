// Takip ilişkisi route'ları (Öğretmen ↔ Öğrenci)
const express = require('express');
const router = express.Router();
const Kullanici = require('../models/Kullanici');
const TakipIliski = require('../models/TakipIliski');
const KurumSinif = require('../models/KurumSinif');
const { lgsAgirlikliOrtalama } = require('../services/lgsOrtalama');

// Oturum kontrolü helper - panel.js'tekiyle uyumlu
function oturumGerekli(req, res, next) {
    if (!req.session || !req.session.kullaniciAdi) return res.status(401).json({ ok: false, hata: 'Oturum gerekli' });
    next();
}

// v4.5.5: Admin, bir öğretmenin panelinden gelerek öğrenci istatistiğini de
// görüntüleyebilmeli. oturumGerekli'yi global değiştirmemek için (onu ~10 route
// kullanıyor) yalnızca öğrenci-detay route'una özel bu admin-duyarlı gate var.
// panel.js'teki oturumKontrol ile aynı admin bypass mantığını uygular.
// Normal kullanıcı → req.adminGorunum=false; admin → true.
function oturumVeyaAdmin(req, res, next) {
    // v4.5.6: Admin kontrolü kullaniciAdi'den ÖNCE. Aksi halde admin oturumunda
    // bir kullaniciAdi da varsa (örn. admin panelden gezerken) admin, normal
    // kullanıcı sanılıp takip-ilişkisi duvarına çarpıyordu. adminGirisli yalnızca
    // admin kimlik doğrulamasıyla set edilir; normal kullanıcıya sızmaz.
    if (req.session && req.session.adminGirisli === true) { req.adminGorunum = true; return next(); }
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
    if (req.session && req.session.kullaniciAdi) { req.adminGorunum = false; return next(); }
    return res.status(401).json({ ok: false, hata: 'Oturum gerekli' });
}

// v4.5.5: Admin görünümünde "← Takip Sayfasına Dön" linkinin döneceği öğretmen
// adını belirler. Öncelik: ?ogretmen= query paramı, sonra Referer'daki /panel/<ad>.
function adminOgretmenAdiBul(req) {
    if (req.query && req.query.ogretmen) return String(req.query.ogretmen);
    const ref = req.headers.referer || '';
    const m = ref.match(/\/panel\/([^/?#]+)/);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    return '';
}

// Arama yapanın oturumdaki rolü (öğretmen ise öğrenci arar, öğrenci ise öğretmen arar).
// Filtreler: il, ilçe, okul, kullaniciAdi (kısmi eşleşme)
router.get('/api/takip/ara', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
        if (!benim) return res.json({ ok: false, hata: 'Kullanıcı bulunamadı' });

        // v4.3.28: Veli de öğrenci arar (öğretmen gibi). Öğretmen/veli → öğrenci,
        // öğrenci → öğretmen aranır.
        const ogrenciArayan = (benim.rol === 'ogretmen' || benim.rol === 'veli');
        const aranacakRol = ogrenciArayan ? 'ogrenci' : 'ogretmen';
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
        if (ogrenciArayan) {
            mevcutIliskiler = await TakipIliski.find({ ogretmenAdi: benim.kullaniciAdi, ogrenciAdi: { $in: adlar } }).lean();
        } else {
            mevcutIliskiler = await TakipIliski.find({ ogrenciAdi: benim.kullaniciAdi, ogretmenAdi: { $in: adlar } }).lean();
        }
        const iliskiMap = {};
        mevcutIliskiler.forEach(i => {
            const anahtar = ogrenciArayan ? i.ogrenciAdi : i.ogretmenAdi;
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
        if (benim.rol !== 'ogretmen' && benim.rol !== 'ogrenci' && benim.rol !== 'veli') {
            return res.status(403).json({ ok: false, hata: 'Bu rol takip isteği gönderemez.' });
        }

        let ogretmenAdi, ogrenciAdi;
        // v4.3.28: Veli, TakipIliski'de 'ogretmenAdi' slotunda durur (öğrenciyi takip
        // eden taraf). isteyenRol='veli' ile öğretmenden ayrılır.
        if (benim.rol === 'ogretmen' || benim.rol === 'veli') {
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

        // v4.3.28: Veli öğrenci slotunda istek almaz (hep gönderir). Veli için
        // "bana gelen istek" yok — sayı 0 döner.
        const ogrenciArayan = (benim.rol === 'ogretmen' || benim.rol === 'veli');
        const filtre = ogrenciArayan
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'beklemede', isteyenRol: 'ogrenci' }
            : { ogrenciAdi:  benim.kullaniciAdi, durum: 'beklemede', isteyenRol: { $in: ['ogretmen', 'veli'] } };
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

        // v4.3.28: Öğrenciye hem öğretmen hem veli isteği gelebilir.
        const ogrenciArayan = (benim.rol === 'ogretmen' || benim.rol === 'veli');
        const filtre = ogrenciArayan
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'beklemede', isteyenRol: 'ogrenci' }
            : { ogrenciAdi:  benim.kullaniciAdi, durum: 'beklemede', isteyenRol: { $in: ['ogretmen', 'veli'] } };
        const istekler = await TakipIliski.find(filtre).sort({ istekTarih: -1 }).lean();

        const adlar = istekler.map(i => ogrenciArayan ? i.ogrenciAdi : i.ogretmenAdi);
        const detaylar = await Kullanici.find({ kullaniciAdi: { $in: adlar } }, 'kullaniciAdi okul il ilce sinif sube rol').lean();
        const detayMap = {};
        detaylar.forEach(d => { detayMap[d.kullaniciAdi] = d; });

        const zengin = istekler.map(i => {
            const karsiAd = ogrenciArayan ? i.ogrenciAdi : i.ogretmenAdi;
            const d = detayMap[karsiAd] || {};
            return {
                _id: i._id,
                ogretmenAdi: i.ogretmenAdi,
                ogrenciAdi: i.ogrenciAdi,
                durum: i.durum,
                istekTarih: i.istekTarih,
                isteyenRol: i.isteyenRol,
                ogretmenOkul: ogrenciArayan ? null : d.okul,
                ogretmenIl:   ogrenciArayan ? null : d.il,
                ogretmenIlce: ogrenciArayan ? null : d.ilce,
                ogretmenRol:  ogrenciArayan ? null : d.rol,
                ogrenciOkul:  ogrenciArayan ? d.okul : null,
                ogrenciIl:    ogrenciArayan ? d.il : null,
                ogrenciIlce:  ogrenciArayan ? d.ilce : null,
                ogrenciSinif: ogrenciArayan ? d.sinif : null,
                ogrenciSube:  ogrenciArayan ? d.sube : null
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

        // v4.3.28: Veli, öğretmen gibi takip ettiklerini (çocuklarını) görür.
        const ogrenciArayan = (benim.rol === 'ogretmen' || benim.rol === 'veli');
        const filtre = ogrenciArayan
            ? { ogretmenAdi: benim.kullaniciAdi, durum: 'kabul' }
            : { ogrenciAdi: benim.kullaniciAdi, durum: 'kabul' };
        const iliskiler = await TakipIliski.find(filtre).sort({ yanitTarih: -1 }).lean();

        const adlar = iliskiler.map(i => ogrenciArayan ? i.ogrenciAdi : i.ogretmenAdi);
        const detaylar = await Kullanici.find({ kullaniciAdi: { $in: adlar } }, 'kullaniciAdi okul il ilce sinif sube rol puan soruIndex').lean();
        const detayMap = {};
        detaylar.forEach(d => { detayMap[d.kullaniciAdi] = d; });

        const zengin = iliskiler.map(i => {
            const karsiAd = ogrenciArayan ? i.ogrenciAdi : i.ogretmenAdi;
            const d = detayMap[karsiAd] || {};
            return {
                _id: i._id,
                ogretmenAdi: i.ogretmenAdi,
                ogrenciAdi: i.ogrenciAdi,
                kaynak: i.kaynak || 'bireysel',
                ogretmenOkul: ogrenciArayan ? null : d.okul,
                ogretmenIl: ogrenciArayan ? null : d.il,
                ogretmenIlce: ogrenciArayan ? null : d.ilce,
                ogretmenRol: ogrenciArayan ? null : d.rol,
                ogrenciOkul: ogrenciArayan ? d.okul : null,
                ogrenciIl: ogrenciArayan ? d.il : null,
                ogrenciIlce: ogrenciArayan ? d.ilce : null,
                ogrenciSinif: ogrenciArayan ? d.sinif : null,
                ogrenciSube: ogrenciArayan ? d.sube : null,
                ogrenciPuan: ogrenciArayan ? d.puan : null,
                ogrenciSoruIndex: ogrenciArayan ? d.soruIndex : null
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
        if (!benim || (benim.rol !== 'ogretmen' && benim.rol !== 'kurumsal' && benim.rol !== 'veli')) {
            return res.status(403).json({ ok: false, hata: 'Sadece öğretmen, kurum yöneticisi ve veliler erişebilir.' });
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
// Veriler: panel.js'in istatistik sekmesi mantığıyla bire bir aynı şekilde hesaplanır
router.get('/takip/ogrenci/:ogrenciAdi', oturumVeyaAdmin, async (req, res) => {
    try {
        const ogrenciAdi = req.params.ogrenciAdi;
        const adminGorunum = req.adminGorunum === true;
        let benim = null;

        if (!adminGorunum) {
            // Normal akış (öğretmen/veli/kurumsal): rol + onaylı takip ilişkisi şart.
            benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi }).lean();
            if (!benim || (benim.rol !== 'ogretmen' && benim.rol !== 'kurumsal' && benim.rol !== 'veli')) {
                return res.status(403).send('<div style="font-family:sans-serif; padding:40px; text-align:center;"><h2>Erişim engellendi</h2><p>Bu sayfayı yalnızca öğretmenler, kurum yöneticileri ve veliler görüntüleyebilir.</p></div>');
            }

            const iliski = await TakipIliski.findOne({
                ogretmenAdi: benim.kullaniciAdi,
                ogrenciAdi,
                durum: 'kabul'
            });
            let erisimVar = !!iliski;

            // v4.5.7: Sınıf-bazlı erişim. Öğretmen/kurumsal, öğrencinin bağlı olduğu
            // kuruma ait sinif+sube sınıfına atanmışsa (KurumSinif.atananOgretmenler)
            // takip ilişkisi şart değildir.
            if (!erisimVar && (benim.rol === 'ogretmen' || benim.rol === 'kurumsal')) {
                const ob = await Kullanici.findOne({ kullaniciAdi: ogrenciAdi }, 'bagliKurumId sinif sube').lean();
                if (ob && ob.bagliKurumId && ob.sinif != null && ob.sube) {
                    const sinifKaydi = await KurumSinif.findOne({
                        kurumId: ob.bagliKurumId,
                        sinif: ob.sinif,
                        sube: ob.sube,
                        atananOgretmenler: benim.kullaniciAdi
                    }).lean();
                    if (sinifKaydi) erisimVar = true;
                }
            }

            if (!erisimVar) {
                return res.status(403).send('<div style="font-family:sans-serif; padding:40px; text-align:center;"><h2>Erişim engellendi</h2><p>Bu öğrenciyle onaylanmış bir takip ilişkin yok ve atandığın bir sınıfta da değil.</p><a href="/panel/' + encodeURIComponent(benim.kullaniciAdi) + '?mod=takip" style="color:#1a73e8;">← Takip Sayfasına Dön</a></div>');
            }
        }
        // v4.5.5: Admin görünümünde rol/ilişki şartı atlanır — admin tüm öğrencileri görebilir.

        const ogrenci = await Kullanici.findOne({ kullaniciAdi: ogrenciAdi }).lean();
        if (!ogrenci) return res.status(404).send('Öğrenci bulunamadı.');

        // panel.js'teki istatistik hesaplama mantığının BİRE BİR aynısı:
        const CevapKaydi = require('../models/CevapKaydi');
        const Soru = require('../models/Soru');
        const tumCevaplar = await CevapKaydi.find({ kullaniciAdi: ogrenciAdi }).lean();
        const soruIdleri = [...new Set(tumCevaplar.map(c => String(c.soruId)))];
        const cevapSorular = soruIdleri.length > 0
            ? await Soru.find({ _id: { $in: soruIdleri } }, 'ders unite konu sinif soruNo soruMetni soruOnculu1 soruOnculu1Resmi soruOnculu2 soruOnculu2Resmi soruOnculu3 soruOnculu3Resmi soruResmi secenekler dogruCevapIndex tabloBaslik sikDizilimi _id').lean()
            : [];
        const soruBilgiMap = {};
        cevapSorular.forEach(s => { soruBilgiMap[String(s._id)] = s; });

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

        // v4.3.65: services/lgsOrtalama.js'e taşındı, geriye dönük uyumluluk için sarmal
        function ortToplamHesapla(kullanici) {
            return lgsAgirlikliOrtalama(kullanici.dersPuanlari || []);
        }

        // v4.3.57: Sayfalama - 30 cevap/sayfa, ?sayfa=N parametresi
        // tumCevaplar tarih sırasına (yeni→eski) göre sıralanır
        const tumCevaplarSirali = [...tumCevaplar].sort(function(a, b) {
            return new Date(b.tarih || 0) - new Date(a.tarih || 0);
        });
        const SAYFA_BOYUTU = 30;
        const toplamSayfa = Math.max(1, Math.ceil(tumCevaplarSirali.length / SAYFA_BOYUTU));
        let sayfa = parseInt(req.query.sayfa) || 1;
        if (sayfa < 1) sayfa = 1;
        if (sayfa > toplamSayfa) sayfa = toplamSayfa;
        const sayfaBasi = (sayfa - 1) * SAYFA_BOYUTU;
        const sayfaCevaplar = tumCevaplarSirali.slice(sayfaBasi, sayfaBasi + SAYFA_BOYUTU);

        // v4.5.1: Görüntülenen öğrencinin günlük hedef verisi
        // (öğretmen/veli/kurumsal panelden takip ediyorsa öğrencinin durumunu görsün)
        let gunlukHedefData = null;
        try {
            if (ogrenci.rol === 'ogrenci' || ogrenci.rol === 'demo') {
                const { gunlukHedefHesap } = require('../services/gunlukHedef');
                gunlukHedefData = await gunlukHedefHesap(ogrenci.kullaniciAdi);
            }
        } catch (e) {
            console.warn('[takip-ogrenci-detay] gunlukHedef hesaplanamadi:', e.message);
        }

        res.render('takip-ogrenci-detay', {
            k: ogrenci,
            tumCevaplar,
            sayfaCevaplar,
            sayfa, toplamSayfa, sayfaBoyutu: SAYFA_BOYUTU, toplamCevap: tumCevaplarSirali.length,
            soruBilgiMap,
            dersIstatMap,
            ortToplamHesapla,
            ogretmenAdi: benim ? benim.kullaniciAdi : adminOgretmenAdiBul(req),
            gunlukHedefData,
            encodeURIComponent
        });
    } catch (err) {
        console.error('[takip-ogrenci-detay] hata:', err.message, err.stack);
        res.status(500).send('<pre>' + (err.message || err) + '</pre>');
    }
});

// v4.3.69: Aktivite özeti API — takip ettiği öğrencilerin bugünkü hareketleri.
// Öğretmen, kurumsal, veli için.
router.get('/takip/aktivite-bugun', oturumGerekli, async (req, res) => {
    try {
        const benim = await Kullanici.findOne({ kullaniciAdi: req.session.kullaniciAdi });
        if (!benim) return res.status(404).json({ ok: false, hata: 'Kullanici bulunamadi' });
        if (!['ogretmen', 'kurumsal', 'veli'].includes(benim.rol)) {
            return res.status(403).json({ ok: false, hata: 'Yetkisiz' });
        }

        // Bu kişi takip ettiği öğrencileri bul (durum: kabul)
        const iliskiler = await TakipIliski.find({
            ogretmenAdi: benim.kullaniciAdi,
            durum: 'kabul'
        }, 'ogrenciAdi').lean();
        const ogrAdlari = iliskiler.map(i => i.ogrenciAdi);

        const { takipEdilenAktivite } = require('../services/aktivite');
        const aktivite = await takipEdilenAktivite(ogrAdlari);

        res.json({
            ok: true,
            rol: benim.rol,
            takipEdilenSayisi: ogrAdlari.length,
            ...aktivite
        });
    } catch (err) {
        console.error('[takip/aktivite-bugun] hata:', err.message);
        res.status(500).json({ ok: false, hata: err.message });
    }
});

module.exports = router;