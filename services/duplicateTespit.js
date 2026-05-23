// services/duplicateTespit.js
// v4.3.68: Tekrar eden soru tespiti — SADECE OKUMA.
// Hiçbir veri değiştirmez, sadece olası duplicate çiftleri döner.
// Birleştirme/silme bir sonraki versiyonda (v4.3.69+).

/**
 * Metni normalize et: boşluk fazlalığını sil, küçük harf, noktalama sadeleştir.
 * "12 + 3 = ?" ile "12+3=?" eşleşsin diye.
 */
function normalize(s) {
    if (!s) return '';
    return String(s)
        .toLowerCase()
        .replace(/\s+/g, ' ')               // çoklu boşluk → tek
        .replace(/[.,;:!?"'`]/g, '')        // noktalama temizle
        .replace(/\s*([+\-*/=])\s*/g, '$1') // 12 + 3 → 12+3
        .trim();
}

/**
 * İki dizinin sıralı bir şekilde benzerlik yüzdesi.
 * Levenshtein yerine basit token eşleşmesi — performans için.
 */
function metinBenzerlik(a, b) {
    a = normalize(a);
    b = normalize(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    // En uzun olanı baz al
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    // Bigram benzerliği (Dice katsayısı'na yakın, basit varyant)
    const bigramsA = new Set();
    const bigramsB = new Set();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));
    for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.substring(i, i + 2));
    if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
    let kesisim = 0;
    bigramsA.forEach(bg => { if (bigramsB.has(bg)) kesisim++; });
    return (2 * kesisim) / (bigramsA.size + bigramsB.size);
}

/**
 * Soru için "imza" üret: normalize edilmiş metin + seçenekler.
 * Aynı imzaya sahip iki soru "tam eşleşme" sayılır.
 */
function soruImza(soru) {
    const metin = normalize(soru.soruMetni);
    const secenekler = (soru.secenekler || []).map(s => normalize(s.metin)).join('|');
    return { metin, secenekler, tam: metin + '||' + secenekler };
}

/**
 * Tüm soruları tara, duplicate aday çiftleri bul.
 * @param {Array} sorular - { _id, soruMetni, secenekler, ders, konu, soruNo, sinif } dizisi
 * @param {Object} options
 *   - benzerlikEsigi: 0-1 arası, varsayılan 0.85
 *   - sadeceAyniDers: aynı dersteki soruları kıyasla (varsayılan true)
 * @returns {Array} duplicate çiftleri:
 *   [{ a, b, tip, benzerlik }, ...]
 *   tip: 'tam' | 'metin' | 'secenekler' | 'benzer'
 */
function duplicateBul(sorular, options = {}) {
    const benzerlikEsigi = options.benzerlikEsigi || 0.85;
    const sadeceAyniDers = options.sadeceAyniDers !== false;

    if (!Array.isArray(sorular) || sorular.length < 2) return [];

    // Önce imza haritası — tam eşleşmeyi O(n) bul
    const imzaMap = {};
    const sorularDetay = sorular.map(s => {
        const imza = soruImza(s);
        return { s, imza };
    });

    const ciftler = [];
    const eklendi = new Set(); // 'idA_idB' tekrarını engelle

    function ciftEkle(a, b, tip, benzerlik) {
        const idA = String(a._id);
        const idB = String(b._id);
        const key = idA < idB ? idA + '_' + idB : idB + '_' + idA;
        if (eklendi.has(key)) return;
        eklendi.add(key);
        ciftler.push({
            a: a,
            b: b,
            tip,
            benzerlik: Number((benzerlik * 100).toFixed(1))
        });
    }

    // Tam eşleşme (metin + seçenekler aynı)
    sorularDetay.forEach(({ s, imza }) => {
        if (!imza.metin) return;
        if (!imzaMap[imza.tam]) imzaMap[imza.tam] = [];
        imzaMap[imza.tam].push(s);
    });
    Object.values(imzaMap).forEach(grup => {
        if (grup.length < 2) return;
        for (let i = 0; i < grup.length; i++) {
            for (let j = i + 1; j < grup.length; j++) {
                if (sadeceAyniDers && grup[i].ders !== grup[j].ders) continue;
                ciftEkle(grup[i], grup[j], 'tam', 1.0);
            }
        }
    });

    // Sadece metin eşleşmesi (seçenekler farklı olabilir)
    const metinMap = {};
    sorularDetay.forEach(({ s, imza }) => {
        if (!imza.metin) return;
        if (!metinMap[imza.metin]) metinMap[imza.metin] = [];
        metinMap[imza.metin].push(s);
    });
    Object.values(metinMap).forEach(grup => {
        if (grup.length < 2) return;
        for (let i = 0; i < grup.length; i++) {
            for (let j = i + 1; j < grup.length; j++) {
                if (sadeceAyniDers && grup[i].ders !== grup[j].ders) continue;
                ciftEkle(grup[i], grup[j], 'metin', 1.0);
            }
        }
    });

    // Sadece seçenek eşleşmesi (metinler farklı, şıklar aynı)
    const secenekMap = {};
    sorularDetay.forEach(({ s, imza }) => {
        if (!imza.secenekler) return;
        if (!secenekMap[imza.secenekler]) secenekMap[imza.secenekler] = [];
        secenekMap[imza.secenekler].push(s);
    });
    Object.values(secenekMap).forEach(grup => {
        if (grup.length < 2) return;
        for (let i = 0; i < grup.length; i++) {
            for (let j = i + 1; j < grup.length; j++) {
                if (sadeceAyniDers && grup[i].ders !== grup[j].ders) continue;
                ciftEkle(grup[i], grup[j], 'secenekler', 1.0);
            }
        }
    });

    // Benzer (eşik üstü ama tam değil) — O(n²) tarama. n=138 için sorunsuz.
    // n>500 olunca optimize gerekir.
    for (let i = 0; i < sorularDetay.length; i++) {
        for (let j = i + 1; j < sorularDetay.length; j++) {
            const sa = sorularDetay[i].s;
            const sb = sorularDetay[j].s;
            if (sadeceAyniDers && sa.ders !== sb.ders) continue;
            // Zaten tam veya tek-alan eşleşme listede ise atla
            const idA = String(sa._id), idB = String(sb._id);
            const key = idA < idB ? idA + '_' + idB : idB + '_' + idA;
            if (eklendi.has(key)) continue;
            const benzerlik = metinBenzerlik(sa.soruMetni, sb.soruMetni);
            if (benzerlik >= benzerlikEsigi) {
                ciftEkle(sa, sb, 'benzer', benzerlik);
            }
        }
    }

    // Tipe göre sırala: tam → metin → secenekler → benzer
    const tipSirasi = { tam: 0, metin: 1, secenekler: 2, benzer: 3 };
    ciftler.sort((x, y) => {
        if (tipSirasi[x.tip] !== tipSirasi[y.tip]) return tipSirasi[x.tip] - tipSirasi[y.tip];
        return y.benzerlik - x.benzerlik;
    });

    return ciftler;
}

module.exports = {
    normalize,
    metinBenzerlik,
    soruImza,
    duplicateBul
};
