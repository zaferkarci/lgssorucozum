// v4.17.20: Kullaniciya SISTEM bildirimi (panel > Mesajlar).
//   Mesaj koleksiyonuna kaynak:'sistem' kaydi olarak yazilir:
//   - okundu:true  -> admin gelen kutusunda okunmamis sayilmaz
//   - ogrenciOkudu:false -> kullanicinin ust menusunde "yeni" rozeti cikar
//   Admin mesaj listesinde kaynak:'sistem' kayitlari gosterilmez.
const Mesaj = require('../models/Mesaj');
const Kullanici = require('../models/Kullanici');

async function sistemBildirimiGonder(alici, metin, konu) {
    try {
        if (!alici || !metin) return false;
        const k = await Kullanici.findOne({ kullaniciAdi: alici }, 'kullaniciAdi email').lean();
        if (!k) return false;
        await new Mesaj({
            adSoyad: 'Sistem',
            email: k.email || '-',
            konu: konu || 'Sistem bildirimi',
            mesaj: String(metin).slice(0, 4000),
            kullaniciAdi: k.kullaniciAdi,
            kaynak: 'sistem',
            okundu: true,
            ogrenciOkudu: false
        }).save();
        return true;
    } catch (e) {
        console.error('[sistemBildirim]', e.message);
        return false;
    }
}

module.exports = { sistemBildirimiGonder };
