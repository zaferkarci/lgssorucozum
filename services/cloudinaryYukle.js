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
async function gorselYukle(dataUri, klasor = 'lgs-sorular') {
    yapilandir();
    if (!dataUri) throw new Error('Görsel verisi boş.');
    const giris = String(dataUri).startsWith('data:')
        ? dataUri
        : ('data:image/png;base64,' + dataUri);
    const sonuc = await cloudinary.uploader.upload(giris, {
        folder: klasor,
        resource_type: 'image'
    });
    return sonuc.secure_url;
}

module.exports = { gorselYukle };
