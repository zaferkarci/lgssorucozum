// services/cloudinaryYukle.js  —  v4.7.0
// Kırpılan soru görsellerini Cloudinary'ye yükler, kalıcı secure_url döndürür.
// Gerekli env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
const cloudinary = require('cloudinary').v2;

let yapilandirildi = false;
function yapilandir() {
    if (yapilandirildi) return;
    const cloud  = process.env.CLOUDINARY_CLOUD_NAME;
    const key    = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret) {
        throw new Error('Cloudinary env değişkenleri tanımlı değil (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
    }
    cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret });
    yapilandirildi = true;
}

// dataUri: "data:image/png;base64,..." ya da düz base64. Döner: https secure_url
// v4.17.28: secenek.publicId verilirse dosya bu adla kaydedilir (ör. yuksek cozunurluklu kesitler: hd_..._d250)
async function gorselYukle(dataUri, klasor = 'lgs-sorular', secenek = {}) {
    yapilandir();
    if (!dataUri) throw new Error('Görsel verisi boş.');
    const giris = String(dataUri).startsWith('data:')
        ? dataUri
        : ('data:image/png;base64,' + dataUri);
    const ayar = { folder: klasor, resource_type: 'image' };
    if (secenek && secenek.publicId) ayar.public_id = secenek.publicId;
    const sonuc = await cloudinary.uploader.upload(giris, ayar);
    return sonuc.secure_url;
}

// v4.17.33: Soru gorseli teslim ayari (Cloudinary adres donusumu; dosyanin kendisi degismez):
//   - Tum soru gorselleri: saydam alanlar BEYAZ doldurulur (b_white, c_pad,w_1.0 ile ayni boyut). Telefonlarin
//     "karanlik mod"u sayfa zeminini koyulastirinca saydam PNG'deki siyah cizgiler kayboluyordu; CSS zemini de
//     koyulastirildigi icin tek guvenilir cozum gorselin kendisinin opak olmasi.
//   - Yuksek cozunurluklu (hd_) gorseller: ayrica f_auto,q_auto -> tarayici destekliyorsa WebP, otomatik kalite.
//     Piksel sayisi ayni kalir (hd-gorsel.js ekran boyutunu yine dosya adindaki yogunluktan hesaplar), dosya kuculur.
const ZEMIN_DONUSUM = 'b_white,c_pad,w_1.0';
const HD_DONUSUM = 'b_white,c_pad,w_1.0,f_auto,q_auto';
function gorselAdresiDuzenle(url) {
    const u = String(url || '');
    const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(u);
    if (!m) return u;                                   // Cloudinary disi adres: dokunma
    const kalan = m[2];
    const ilk = kalan.split('/')[0];
    if (!/^v\d+$/.test(ilk) && /^[a-z]{1,3}_/.test(ilk)) return u;   // zaten bir donusum var: dokunma
    const hd = /\/hd_[^/?#]*_d\d{3}\.[a-z0-9]+(?:[?#].*)?$/i.test(u);
    return m[1] + (hd ? HD_DONUSUM : ZEMIN_DONUSUM) + '/' + kalan;
}

module.exports = { gorselYukle, gorselAdresiDuzenle, ZEMIN_DONUSUM, HD_DONUSUM };
