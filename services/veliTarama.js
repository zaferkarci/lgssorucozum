// v4.17.20: VELI TAKIP TARAMASI
//   Velilerin (ve basili karttan kurulan ogretmen takiplerinin) cocuklari disindaki
//   ogrencileri gorup gormedigini tespit etmek icin her aktif/bekleyen takip
//   iliskisine supheli puani verir. Yalnizca OKUR; hicbir seyi degistirmez.
//
//   Isaretler (puan):
//     BASILI_KOD   +100  Ogrenci, takipcinin kendi kodu ile kaydolmus VE o kod basili
//                        karta dusmus (yazdirildi). Kart dagitildigi icin kesin supheli.
//     COK_COCUK    +30   Velinin takip ettigi cocuk sayisi esigin ustunde.
//     COK_VELI     +20   Ogrencinin 3+ velisi var.
//     FARKLI_IL    +25   Veli ve ogrenci farkli illerde (ikisinde de il dolu ise).
//     FARKLI_ILCE  +10   Ayni il, farkli ilce.
//     DAVET_LINKI  -20   Velinin basilmamis davet linki ile kaydolmus (normal yol).
//     OGR_KABUL    -40   Ogrenci takip istegini KENDISI kabul etmis.
//     OGR_ONAY     -100  Ogrenci "evet, velim" diye onaylamis.
//   Kategori: kesin >= 100, yuksek >= 40, orta >= 20, dusuk < 20.
//   Ogretmen takipleri yalnizca BASILI_KOD ile listelenir.
const TakipIliski = require('../models/TakipIliski');
const Kullanici = require('../models/Kullanici');
const ReferansKodu = require('../models/ReferansKodu');

function kategori(puan) {
    if (puan >= 100) return 'kesin';
    if (puan >= 40) return 'yuksek';
    if (puan >= 20) return 'orta';
    return 'dusuk';
}
const norm = s => String(s || '').trim().toLocaleLowerCase('tr');

async function veliTaramasi(opts) {
    const cocukEsik = Math.max(1, parseInt((opts && opts.cocukEsik) || 4, 10) || 4);
    const iliskiler = await TakipIliski.find({ durum: { $in: ['kabul', 'beklemede'] } }).lean();

    const adlar = new Set();
    iliskiler.forEach(i => { adlar.add(i.ogretmenAdi); adlar.add(i.ogrenciAdi); });
    const kullanicilar = await Kullanici.find({ kullaniciAdi: { $in: [...adlar] } },
        'kullaniciAdi rol il ilce okul sinif sube').lean();
    const km = {};
    kullanicilar.forEach(k => { km[k.kullaniciAdi] = k; });

    // Ogrencinin kayitta kullandigi kod
    const ogrAdlari = [...new Set(iliskiler.map(i => i.ogrenciAdi))];
    const kodlar = await ReferansKodu.find({ kullanan: { $in: ogrAdlari } },
        'kod olusturan oncekiOlusturan yazdirildi yazdirilmaTarih tip kullanan kullanimTarih').lean();
    const kodMap = {};
    kodlar.forEach(r => { kodMap[r.kullanan] = r; });

    const veliMi = i => {
        const t = km[i.ogretmenAdi];
        return (t && t.rol === 'veli') || i.isteyenRol === 'veli';
    };

    // Sayilar (yalniz kabul edilmis veli iliskileri)
    const cocukSay = {}, veliSay = {};
    iliskiler.forEach(i => {
        if (i.durum !== 'kabul' || !veliMi(i)) return;
        cocukSay[i.ogretmenAdi] = (cocukSay[i.ogretmenAdi] || 0) + 1;
        veliSay[i.ogrenciAdi] = (veliSay[i.ogrenciAdi] || 0) + 1;
    });

    const satirlar = [];
    for (const i of iliskiler) {
        const takipci = km[i.ogretmenAdi] || { kullaniciAdi: i.ogretmenAdi, rol: '?' };
        const ogr = km[i.ogrenciAdi] || { kullaniciAdi: i.ogrenciAdi, rol: '?' };
        const veli = veliMi(i);
        const kod = kodMap[i.ogrenciAdi] || null;
        const kodSahibi = kod ? (kod.oncekiOlusturan || kod.olusturan) : null;
        const kendiKodu = !!(kod && kodSahibi === i.ogretmenAdi);
        const isaretler = [];
        let puan = 0;
        const ekle = (kodAd, p, metin) => { isaretler.push({ kod: kodAd, puan: p, metin }); puan += p; };

        if (kendiKodu && kod.yazdirildi) {
            ekle('BASILI_KOD', 100, 'Basılı karttaki ' + (veli ? 'veli' : 'öğretmen') + ' koduyla (' + kod.kod + ') kaydolmuş');
        }
        if (!veli) {
            // Ogretmen: yalniz basili kod sizintisi raporlanir
            if (!isaretler.length) continue;
        } else {
            const n = cocukSay[i.ogretmenAdi] || 0;
            if (n > cocukEsik) ekle('COK_COCUK', 30, 'Velinin ' + n + ' çocuğu görünüyor');
            const v = veliSay[i.ogrenciAdi] || 0;
            if (v >= 3) ekle('COK_VELI', 20, 'Öğrencinin ' + v + ' velisi görünüyor');
            if (norm(takipci.il) && norm(ogr.il)) {
                if (norm(takipci.il) !== norm(ogr.il)) ekle('FARKLI_IL', 25, 'Farklı il: ' + takipci.il + ' / ' + ogr.il);
                else if (norm(takipci.ilce) && norm(ogr.ilce) && norm(takipci.ilce) !== norm(ogr.ilce)) ekle('FARKLI_ILCE', 10, 'Farklı ilçe: ' + takipci.ilce + ' / ' + ogr.ilce);
            }
            if (kendiKodu && !kod.yazdirildi) ekle('DAVET_LINKI', -20, 'Velinin kendi davet linkiyle kaydolmuş');
            if (!kendiKodu && i.durum === 'kabul' && i.isteyenRol === 'veli') ekle('OGR_KABUL', -40, 'Öğrenci takip isteğini kendisi kabul etmiş');
            if (i.ogrenciOnayTarih) ekle('OGR_ONAY', -100, 'Öğrenci "evet, velim" diye onaylamış');
        }
        const p = Math.max(0, puan);
        satirlar.push({
            id: String(i._id),
            takipci: i.ogretmenAdi, takipciRol: veli ? 'veli' : (takipci.rol || 'ogretmen'),
            takipciIl: takipci.il || '', takipciIlce: takipci.ilce || '',
            ogrenci: i.ogrenciAdi, ogrSinif: (ogr.sinif || '') + (ogr.sube ? '/' + ogr.sube : ''),
            ogrOkul: ogr.okul || '', ogrIl: ogr.il || '', ogrIlce: ogr.ilce || '',
            durum: i.durum, istekTarih: i.istekTarih,
            kod: kod ? kod.kod : '', kodYazdirildi: !!(kod && kod.yazdirildi),
            isaretler, puan: p, kategori: kategori(puan)
        });
    }
    const sira = { kesin: 0, yuksek: 1, orta: 2, dusuk: 3 };
    satirlar.sort((a, b) => (sira[a.kategori] - sira[b.kategori]) || (b.puan - a.puan) || a.takipci.localeCompare(b.takipci, 'tr'));

    const ozet = { toplam: satirlar.length, kesin: 0, yuksek: 0, orta: 0, dusuk: 0 };
    satirlar.forEach(s => { ozet[s.kategori]++; });

    // Basili karta dusmus, hala KULLANILMAMIS kullanici kodlari (dagitilmis kartlar)
    const basiliSahipliKod = await ReferansKodu.countDocuments({
        kullanildi: false, yazdirildi: true, olusturan: { $ne: 'admin' }
    });
    return { satirlar, ozet, basiliSahipliKod, cocukEsik };
}

module.exports = { veliTaramasi, kategori };
