// --- LGS HAZIRLIK PLATFORMU - VERSİYON 2.0.6 (Soru Listesinde Ham Puan) ---

const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

// --- MODELLER ---
const Kullanici = mongoose.model('Kullanici', new mongoose.Schema({
    kullaniciAdi: { type: String, unique: true }, 
    sifre: String, 
    il: String, ilce: String, okul: String,
    sinif: { type: Number, default: 8 },
    soruIndex: { type: Number, default: 0 }, 
    puan: { type: Number, default: 0 },
    toplamSure: { type: Number, default: 0 },
    cozumSureleri: [{ soruId: String, sure: Number }]
}));

const Soru = mongoose.model('Soru', new mongoose.Schema({
    sinif: String, ders: String, konu: String, soruOnculu: String, 
    soruMetni: String, soruResmi: String, 
    secenekler: [{ metin: String, gorsel: String }],
    dogruCevapIndex: Number,
    cozulmeSayisi: { type: Number, default: 0 },
    dogruSayisi: { type: Number, default: 0 },
    ortalamaSure: { type: Number, default: 0 },
    // --- v1.5: Yeni alanlar ---
    hamPuan: { type: Number, default: null },       // null = henüz hesaplanmadı (varsayılan kullanılır)
    zorlukKatsayisi: { type: Number, default: 3 },  // 1-5 arası, başlangıçta orta
    cozumSureleriTum: [Number],                     // standart sapma hesabı için tüm süreler
    dogruCevapSureleri: [Number]                    // sadece doğru cevap verenlerin süreleri
}));

const Okul = mongoose.model('Okul', new mongoose.Schema({
    il: String, ilce: String, ad: String
}));

// --- v1.5: YARDIMCI FONKSİYONLAR ---

// Standart sapma hesabı
function stdSapma(dizi) {
    if (!dizi || dizi.length < 2) return 0;
    const ort = dizi.reduce((a, b) => a + b, 0) / dizi.length;
    return Math.sqrt(dizi.reduce((a, b) => a + Math.pow(b - ort, 2), 0) / dizi.length);
}

// Ham puan hesabı (tek soru için)
function hamPuanHesapla(soru) {
    if (!soru.cozulmeSayisi || soru.cozulmeSayisi === 0) return null;

    const T_ref = soru.ortalamaSure || 60;
    const T_ogr = T_ref; // ham puan soruya ait genel istatistikten hesaplanır, öğrenci süresinden değil

    // 1. Süre bileşeni
    const sureBileseni = Math.log2(1 + (T_ref / T_ogr)); // kendi ortalamasına göre = log2(2) = 1 (sabit)
    // Not: ham puan hesabında T_ogr yerine sorunun kendi ortalama süresini kullanıyoruz.
    // Öğrencinin kazandığı puan hesabında T_ogr devreye girer (aşağıda).

    // 2. Başarı bileşeni (düşük başarı = zor soru = yüksek ham puan)
    const basariBileseni = 1 - (soru.dogruSayisi / soru.cozulmeSayisi);

    // 3. Standart sapma faktörü
    const sigmaSure = stdSapma(soru.cozumSureleriTum || []);
    const sigmaBasari = soru.cozulmeSayisi > 1
        ? stdSapma(
            Array(soru.dogruSayisi).fill(1).concat(
                Array(soru.cozulmeSayisi - soru.dogruSayisi).fill(0)
            )
          )
        : 0;
    const sapmaFaktoru = 1 + ((sigmaSure / (T_ref || 1)) + sigmaBasari) / 2;

    // 4. Ham puan
    const SABIT_CARPAN = 100;
    return sureBileseni * basariBileseni * sapmaFaktoru * SABIT_CARPAN;
}

// --- v1.7: Kademe bazlı zorluk katsayısı ---

// Doğru oranı kademesi (D): düşük oran = zor = yüksek kademe
function dogruOraniKademesi(oran) {
    if (oran <= 0.20) return 5;
    if (oran <= 0.40) return 4;
    if (oran <= 0.60) return 3;
    if (oran <= 0.80) return 2;
    return 1;
}

// Süre kademesi (tek süre için)
function sureKademesi(sure) {
    if (sure <= 30)  return 1;
    if (sure <= 60)  return 2;
    if (sure <= 90)  return 3;
    if (sure <= 120) return 4;
    return 5;
}

// Zorluk katsayısını hesapla ve kaydet
async function zorlukGuncelle(soruId) {
    const MINIMUM_COZUM = 50;
    const tumSorular = await Soru.find();

    for (const s of tumSorular) {
        let Z_final = 3; // varsayılan: orta

        if (s.cozulmeSayisi > 0) {
            // 1. D kademesi: doğru cevap oranından
            const dogruOrani = s.dogruSayisi / s.cozulmeSayisi;
            const D = dogruOraniKademesi(dogruOrani);

            // 2. S kademesi: doğru cevap verenlerin sürelerinin kademe ortalaması
            const dogruSureleri = s.dogruCevapSureleri || [];
            const S = dogruSureleri.length > 0
                ? dogruSureleri.reduce((acc, sure) => acc + sureKademesi(sure), 0) / dogruSureleri.length
                : 3; // veri yoksa orta

            // 3. Standart sapma faktörü (sadece doğru cevaplayanların sürelerinden)
            const sigma = stdSapma(dogruSureleri);
            const sigma_n = Math.min(sigma / 60, 1); // normalize: 60sn = max etki

            // 4. Z_base: D ağırlıklı (0.6) + S (0.4)
            const Z_base = (D * 0.6) + (S * 0.4);

            // 5. Z_final: sigma faktörü eklenir (max +0.5)
            const Z_ham = Z_base + sigma_n * 0.5;

            // 6. Kademeli geçiş: 50 çözüm altında varsayılanla karıştır
            const agirlik = Math.min(s.cozulmeSayisi / MINIMUM_COZUM, 1);
            Z_final = (agirlik * Z_ham) + ((1 - agirlik) * 3);
        }

        s.zorlukKatsayisi = Math.min(Math.max(Math.round(Z_final * 10) / 10, 1), 5);
        await s.save();
    }
}

// --- YOLLAR ---
app.get('/', (req, res) => {
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif;"><div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;"><h2 style="color:#1a73e8;">LGS Hazırlık</h2><form action="/giris" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;"><button style="width:100%; padding:12px; background:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">GİRİŞ YAP</button></form><p>Hesabınız yok mu? <a href="/kayit">Kayıt Ol</a></p></div></div>`);
});

app.get('/kayit', (req, res) => {
    res.send(`<div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; font-family:sans-serif; padding:20px;"><div style="background:white; padding:30px; border-radius:15px; width:450px;"><h2 style="color:#1a73e8; text-align:center;">Yeni Kayıt</h2><form action="/kayit-yap" method="POST"><input name="kullaniciAdi" placeholder="Kullanıcı Adı" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifre" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><input type="password" name="sifreTekrar" placeholder="Şifre Tekrar" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><br><select name="sinif" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">Sınıf Seçiniz</option>${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${s === 8 ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select><select name="il" id="ilSelect" onchange="ilDegisti()" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İl Seçiniz...</option></select><select name="ilce" id="ilceSelect" required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;"><option value="">İlçe Seçiniz</option></select><input name="okul" id="okulInput" placeholder="Okulunuzun Adı" required autocomplete="off" style="width:100%; padding:10px; margin-bottom:5px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;"><div id="okulOneri" style="border:1px solid #ddd; border-radius:6px; background:white; max-height:150px; overflow-y:auto; display:none; margin-bottom:15px;"></div><br><button style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDI TAMAMLA</button></form></div></div><script>
let ilIdMap = {};
fetch('https://turkiyeapi.dev/api/v1/provinces?fields=id,name')
  .then(r => r.json())
  .then(data => {
    const ilSelect = document.getElementById('ilSelect');
    (data.data || []).sort((a,b) => a.name.localeCompare(b.name, 'tr')).forEach(il => {
      ilIdMap[il.name] = il.id;
      const opt = document.createElement('option');
      opt.value = il.name;
      opt.textContent = il.name;
      ilSelect.appendChild(opt);
    });
  })
  .catch(() => {
    const ilSelect = document.getElementById('ilSelect');
    ilSelect.innerHTML += '<option value="">İller yüklenemedi</option>';
  });

function ilDegisti() {
  const ilAdi = document.getElementById('ilSelect').value;
  const ilceSelect = document.getElementById('ilceSelect');
  ilceSelect.innerHTML = '<option value="">İlçe Yükleniyor...</option>';
  document.getElementById('okulOneri').style.display = 'none';
  const ilId = ilIdMap[ilAdi];
  if (!ilId) return;
  fetch('https://turkiyeapi.dev/api/v1/provinces/' + ilId + '?fields=districts')
    .then(r => r.json())
    .then(data => {
      ilceSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';
      const districts = (data.data && data.data.districts) ? data.data.districts : [];
      districts.sort((a,b) => a.name.localeCompare(b.name, 'tr')).forEach(ilce => {
        ilceSelect.innerHTML += '<option value="' + ilce.name + '">' + ilce.name + '</option>';
      });
    })
    .catch(() => {
      ilceSelect.innerHTML = '<option value="">İlçeler yüklenemedi</option>';
    });
}

document.addEventListener('DOMContentLoaded', function() {
  const okulInput = document.getElementById('okulInput');
  const okulOneri = document.getElementById('okulOneri');
  if (!okulInput) return;
  okulInput.addEventListener('input', function() {
    const il = document.getElementById('ilSelect').value;
    const ilce = document.getElementById('ilceSelect').value;
    const aranan = this.value.trim();
    if (!aranan || aranan.length < 2) { okulOneri.style.display='none'; return; }
    fetch('/api/okullar?il=' + encodeURIComponent(il) + '&ilce=' + encodeURIComponent(ilce))
      .then(r => r.json())
      .then(liste => {
        const filtreli = liste.filter(o => o.toLowerCase().includes(aranan.toLowerCase()));
        if (filtreli.length === 0) { okulOneri.style.display='none'; return; }
        okulOneri.innerHTML = filtreli.map(o => {
          const div = document.createElement('div');
          div.style.cssText = 'padding:8px 10px; cursor:pointer; border-bottom:1px solid #eee;';
          div.textContent = o;
          div.onmouseover = function(){ this.style.background='#f0f2f5'; };
          div.onmouseout = function(){ this.style.background='white'; };
          div.onclick = function(){ okulInput.value = o; okulOneri.style.display='none'; };
          return div.outerHTML;
        }).join('');
        okulOneri.style.display = 'block';
      })
      .catch(() => { okulOneri.style.display='none'; });
  });
  document.addEventListener('click', function(e) {
    if (e.target !== okulInput) okulOneri.style.display = 'none';
  });
});
</script>`);
});

app.post('/kayit-yap', async (req, res) => {
    const { kullaniciAdi, sifre, sifreTekrar, sinif, il, ilce, okul } = req.body;
    if (sifre !== sifreTekrar) return res.send("<script>alert('Şifreler uyuşmuyor!'); window.history.back();</script>");
    try {
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.send("<script>alert('Kullanıcı adı alınmış!'); window.history.back();</script>");
        await new Kullanici({ kullaniciAdi, sifre, sinif, il, ilce, okul }).save();
        res.send("<script>alert('Başarılı!'); window.location.href='/';</script>");
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

app.post('/giris', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.body.kullaniciAdi, sifre: req.body.sifre });
    if (!k) return res.send("<script>alert('Hata!'); window.history.back();</script>");
    res.redirect('/panel/' + encodeURIComponent(k.kullaniciAdi));
});

app.get('/panel/:kullaniciAdi', async (req, res) => {
    const k = await Kullanici.findOne({ kullaniciAdi: req.params.kullaniciAdi });
    if (!k) return res.send("Kullanıcı bulunamadı.");
    const mod = req.query.mod || 'soru';

    let icerik = "";
    if (mod === 'profil') {
        icerik = `<div style="background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><h2>Profil Bilgileri</h2><p><b>Kullanıcı Adı:</b> ${k.kullaniciAdi}</p><p><b>Sınıf:</b> ${k.sinif}. Sınıf</p><p><b>Okul:</b> ${k.okul}</p><p><b>İl/İlçe:</b> ${k.il} / ${k.ilce}</p><p><b>Toplam Puan:</b> ${k.puan}</p><p><b>Çözülen Soru:</b> ${k.soruIndex}</p></div>`;
    } else {
        const sorular = await Soru.find();
        if (!sorular.length) {
            icerik = `<div style="text-align:center; margin-top:50px;"><h2>Soru bulunamadı.</h2><p>Lütfen admin panelinden soru ekleyiniz.</p></div>`;
        } else if (!req.query.basla) {
            icerik = `<div style="text-align:center; margin-top:100px;"><h1 style="color:#1a73e8;">Hazır mısın?</h1><p>Sıradaki soruyu çözmek için butona tıkla.</p><a href="/panel/${k.kullaniciAdi}?mod=soru&basla=true" style="display:inline-block; padding:15px 40px; background:#34a853; color:white; text-decoration:none; border-radius:30px; font-weight:bold; font-size:18px;">SORU ÇÖZMEYE BAŞLA</a></div>`;
        } else {
            const soru = sorular[k.soruIndex % sorular.length];

            // --- v1.5: Zorluk etiketi zorlukKatsayisi alanından okunuyor ---
            const zorlukKatsayisi = soru.zorlukKatsayisi || 3;
            let zorlukEtiketi = "Orta"; let zorlukRengi = "#f39c12";
            if (zorlukKatsayisi < 1.5)      { zorlukEtiketi = "Çok Kolay"; zorlukRengi = "#27ae60"; }
            else if (zorlukKatsayisi < 2.5) { zorlukEtiketi = "Kolay";     zorlukRengi = "#2ecc71"; }
            else if (zorlukKatsayisi < 3.5) { zorlukEtiketi = "Orta";      zorlukRengi = "#f39c12"; }
            else if (zorlukKatsayisi < 4.5) { zorlukEtiketi = "Zor";       zorlukRengi = "#e67e22"; }
            else                            { zorlukEtiketi = "Çok Zor";   zorlukRengi = "#c0392b"; }

            const harfler = ["A","B","C","D"];
            icerik = `<div style="max-width:800px; margin:auto; font-family:sans-serif; padding:20px; background:#fff; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);"><div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #eee;"><span><b>${k.kullaniciAdi}</b> | Puan: ${k.puan}</span><div style="color:red; font-weight:bold;">⏱️ <span id="timer">00:00</span> / 05:00 dk</div></div><div style="margin-bottom:15px;"><span style="background:${zorlukRengi}; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold;">Zorluk: ${zorlukEtiketi}</span> <span style="background:#3498db; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold; margin-left:5px;">Ders: ${soru.ders}</span>${soru.konu ? `<span style="background:#8e44ad; color:white; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:bold; margin-left:5px;">Konu: ${soru.konu}</span>` : ""}</div>${soru.soruOnculu ? `<div style="background:#f1f3f4; padding:15px; border-radius:8px; margin-bottom:15px;">${soru.soruOnculu}</div>` : ""}${soru.soruResmi ? `<div style="text-align:center; margin-bottom:15px;"><img src="${soru.soruResmi}" style="max-width:100%; border-radius:8px;"></div>` : ""}<h2 style="font-size:20px; color:#202124; margin-bottom:20px;">${soru.soruMetni}</h2><div style="display:grid; gap:10px;">${[0,1,2,3].map(i => { const s = soru.secenekler[i]; if(!s) return ""; return `<form method="POST" action="/cevap" style="margin:0;"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="soruId" value="${soru._id}"><input type="hidden" name="secilenIndex" value="${i}"><input type="hidden" name="gecenSure" id="gs${i}" value="0"><button type="submit" onclick="document.getElementById('gs${i}').value=saniye;" style="width:100%; text-align:left; padding:15px; background:white; border:2px solid #f1f3f4; border-radius:10px; cursor:pointer; display:block;"><b>${harfler[i]})</b> ${s.metin || ""} ${s.gorsel ? `<br><img src="${s.gorsel}" style="max-width:150px; margin-top:5px;">` : ""}</button></form>`; }).join('')}</div></div><script>
const SORU_KEY = 'lgs_soru_baslangic_${soru._id}';
const simdi = Date.now();
const kayitli = localStorage.getItem(SORU_KEY);
const baslangic = kayitli ? parseInt(kayitli) : simdi;
if (!kayitli) localStorage.setItem(SORU_KEY, baslangic);
let saniye = Math.floor((simdi - baslangic) / 1000);
if (saniye >= 300) {
    localStorage.removeItem(SORU_KEY);
    window.location.href='/panel/${encodeURIComponent(k.kullaniciAdi)}?basla=true';
}
let timerInterval = setInterval(() => {
    saniye = Math.floor((Date.now() - baslangic) / 1000);
    let dk = Math.floor(saniye/60); let sn = saniye%60;
    document.getElementById('timer').innerText = (dk<10?'0'+dk:dk)+':'+(sn<10?'0'+sn:sn);
    if (saniye >= 300) {
        clearInterval(timerInterval);
        localStorage.removeItem(SORU_KEY);
        window.location.href='/panel/${encodeURIComponent(k.kullaniciAdi)}?basla=true';
    }
}, 1000);
document.querySelectorAll('button[type=submit]').forEach(btn => {
    btn.addEventListener('click', function() {
        localStorage.removeItem(SORU_KEY);
    });
});
</script>`;
        }
    }

    res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#1a73e8; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">LGS Hazırlık</h2><a href="/panel/${k.kullaniciAdi}?mod=soru" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soru'?'#1557b0':''};">📖 Soru Çöz</a><a href="/panel/${k.kullaniciAdi}?mod=profil" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='profil'?'#1557b0':''};">👤 Profilim</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış Yap</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
});

app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });
        if (s && k) {
            const T_ogr = Math.max(parseInt(gecenSure) || 1, 1);
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;

            // --- v1.5: Puan hesaplama (istatistikler güncellenmeden ÖNCE, eski değerlerle) ---
            if (dogruMu) {
                const eskiCozulmeSayisi = s.cozulmeSayisi || 0;
                const eskiDogruSayisi = s.dogruSayisi || 0;
                const eskiSureleri = [...(s.cozumSureleriTum || [])];

                const T_ref = s.ortalamaSure || 60;
                const T_min = 10; // minimum anlamlı süre (sn)

                // 1. Hız bileşeni: orijinal LDP log2 + tanh üstten baskı (T_min altı yumuşak tavan)
                const logHiz = Math.log2(1 + (T_ref / T_ogr));
                const logMax = Math.log2(1 + (T_ref / T_min)) || 1;
                const hizBileseni = logMax * Math.tanh(logHiz / logMax);

                // 2. Zorluk bileşeni (eski istatistiklerle, hiç çözülmemişse orta zorluk varsay)
                const dogruOrani = eskiCozulmeSayisi > 0
                    ? eskiDogruSayisi / eskiCozulmeSayisi
                    : 0.5;
                const sigmaBasari = eskiCozulmeSayisi > 1
                    ? stdSapma(
                        Array(eskiDogruSayisi).fill(1).concat(
                            Array(eskiCozulmeSayisi - eskiDogruSayisi).fill(0)
                        )
                      )
                    : 0;
                const Z_katsayi = Math.min(1 + 4 * (1 - dogruOrani) * (1 + sigmaBasari), 5);

                // 3. Dinamik GE: süre standart sapmasına göre (0.02-0.10 arası)
                const sigmaSure = stdSapma(eskiSureleri);
                const GE = 0.02 + 0.08 * Math.min(sigmaSure / (T_ref || 1), 1);

                // 4. Final puan: Z × T_ref × hizBileseni × GE (orijinal LDP, tanh baskılı)
                const kazanilanPuan = Math.max(
                    Math.round(Z_katsayi * T_ref * hizBileseni * GE),
                    1
                );

                k.puan += kazanilanPuan;
            }

            // --- Soru istatistiklerini güncelle (puan hesabından SONRA) ---
            s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;
            if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;
            const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
            s.ortalamaSure = (eskiSureToplami + T_ogr) / s.cozulmeSayisi;
            s.cozumSureleriTum = s.cozumSureleriTum || [];
            s.cozumSureleriTum.push(T_ogr);
            // --- v1.7: Doğru cevap verilmişse süreyi dogruCevapSureleri'ne ekle ---
            if (dogruMu) {
                s.dogruCevapSureleri = s.dogruCevapSureleri || [];
                s.dogruCevapSureleri.push(T_ogr);
            }
            await s.save();

            k.toplamSure += T_ogr;
            k.cozumSureleri.push({ soruId: soruId, sure: T_ogr });
            k.soruIndex += 1;
            await k.save();

            // --- v1.5: Zorluk katsayılarını güncelle ---
            await zorlukGuncelle(soruId);
        }
        res.redirect('/panel/' + encodeURIComponent(kullaniciAdi) + '?basla=true');
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});

app.get('/admin', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        let editSoru = null; if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);
        const tumSorular = await Soru.find();
        const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "T.C. İnkılâp Tarihi", "İngilizce", "Din Kültürü"];
        const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');
        const tumKullanicilar = await Kullanici.find({}, 'kullaniciAdi puan soruIndex sinif il ilce okul');

        let icerik = "";
        if (mod === 'soruEkle') {
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>${editSoru ? 'Soru Düzenle' : 'Yeni Soru Ekle'}</h3><form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST">${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}Sınıf: <select name="sinif">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select> Ders: <select name="ders">${dersler.map(d => `<option value="${d}" ${editSoru && editSoru.ders === d ? 'selected' : ''}>${d}</option>`).join('')}</select><br><br><input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruOnculu" placeholder="Öncül (Opsiyonel)" style="width:98%; height:60px; padding:10px; margin-bottom:10px; border:1px solid #ddd;">${editSoru ? editSoru.soruOnculu : ''}</textarea><input name="soruResmi" placeholder="Soru Görsel URL (Opsiyonel)" value="${editSoru ? editSoru.soruResmi : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><div style="background:#f0f2f5; padding:8px; border-radius:6px; margin-bottom:5px; display:flex; flex-wrap:wrap; gap:4px;" id="toolbar">
<button type="button" onclick="ekle(\'soruMetni\',\'<sup></sup>\',4)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;" title="Üst simge">x²</button>
<button type="button" onclick="ekle(\'soruMetni\',\'<sub></sub>\',5)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;" title="Alt simge">x₂</button>
<button type="button" onclick="ekle(\'soruMetni\',\'√\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">√</button>
<button type="button" onclick="ekle(\'soruMetni\',\'π\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">π</button>
<button type="button" onclick="ekle(\'soruMetni\',\'±\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">±</button>
<button type="button" onclick="ekle(\'soruMetni\',\'×\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">×</button>
<button type="button" onclick="ekle(\'soruMetni\',\'÷\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">÷</button>
<button type="button" onclick="ekle(\'soruMetni\',\'≤\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">≤</button>
<button type="button" onclick="ekle(\'soruMetni\',\'≥\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">≥</button>
<button type="button" onclick="ekle(\'soruMetni\',\'≠\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">≠</button>
<button type="button" onclick="ekle(\'soruMetni\',\'∞\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">∞</button>
<button type="button" onclick="ekle(\'soruMetni\',\'°\',0)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white;">°</button>
<button type="button" onclick="ekle(\'soruMetni\',\'<b></b>\',3)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white; font-weight:bold;">B</button>
<button type="button" onclick="ekle(\'soruMetni\',\'<i></i>\',3)" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:white; font-style:italic;">I</button>
<button type="button" onclick="onizlemeGoster()" style="padding:4px 10px; border:1px solid #1a73e8; border-radius:4px; cursor:pointer; background:#1a73e8; color:white; margin-left:auto;">Önizle</button>
</div>
<textarea name="soruMetni" id="soruMetni" placeholder="Soru Metni (HTML desteklenir: &lt;sup&gt;2&lt;/sup&gt; → üst simge)" style="width:98%; height:80px; padding:10px; margin-bottom:5px; border:1px solid #ddd;" required>${editSoru ? editSoru.soruMetni : ''}</textarea>
<div id="onizleme" style="display:none; background:#fffbe6; border:1px solid #f0c040; border-radius:6px; padding:10px; margin-bottom:10px; font-size:15px;"></div>
<script>
function ekle(alanId, html, imlecGeri) {
  const ta = document.getElementById(alanId);
  const bas = ta.selectionStart, son = ta.selectionEnd;
  const secili = ta.value.substring(bas, son);
  let eklenen = html;
  if (secili && imlecGeri > 0) {
    eklenen = html.slice(0, html.length - imlecGeri) + secili + html.slice(html.length - imlecGeri);
  }
  ta.value = ta.value.substring(0, bas) + eklened + ta.value.substring(son);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = bas + eklened.length - (secili ? 0 : imlecGeri);
}
function onizlemeGoster() {
  const metin = document.getElementById(\'soruMetni\').value;
  const div = document.getElementById(\'onizleme\');
  div.innerHTML = metin;
  div.style.display = div.style.display === \'none\' ? \'block\' : \'none\';
}
</script><div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px;"><p>Şıklar (Doğru seçeneği işaretleyin):</p>${[0,1,2,3].map(i => `<div style="margin-bottom:8px; display:flex; align-items:center; gap:10px;"><b>${String.fromCharCode(65+i)}:</b> <input name="metin${i}" placeholder="Metin" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].metin : ''}" style="flex:2;"> <input name="gorsel${i}" placeholder="Görsel URL" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].gorsel : ''}" style="flex:1;"> <input type="radio" name="dogruCevap" value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''} required></div>`).join('')}</div><button style="background:#34a853; color:white; padding:12px 30px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDET</button></form></div>`;
        } else if (mod === 'kullanicilar') {
            const filIl = req.query.il || '';
            const filIlce = req.query.ilce || '';
            const filOkul = req.query.okul || '';
            const filtreliKullanicilar = tumKullanicilar.filter(k => {
                return (!filIl || k.il === filIl) && (!filIlce || k.ilce === filIlce) && (!filOkul || k.okul === filOkul);
            });
            const iller = [...new Set(tumKullanicilar.map(k => k.il).filter(Boolean))].sort();
            const ilceler = filIl ? [...new Set(tumKullanicilar.filter(k => k.il === filIl).map(k => k.ilce).filter(Boolean))].sort() : [];
            const okullar = filIlce ? [...new Set(tumKullanicilar.filter(k => k.ilce === filIlce).map(k => k.okul).filter(Boolean))].sort() : [];
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;">
<h3>Kullanıcı Listesi (Toplam: ${filtreliKullanicilar.length})</h3>
<form method="GET" action="/admin" style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
<input type="hidden" name="mod" value="kullanicilar">
<select name="il" onchange="this.form.submit()" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
<option value="">Tüm İller</option>${iller.map(il => `<option value="${il}" ${filIl===il?'selected':''}>${il}</option>`).join('')}
</select>
<select name="ilce" onchange="this.form.submit()" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
<option value="">Tüm İlçeler</option>${ilceler.map(ilce => `<option value="${ilce}" ${filIlce===ilce?'selected':''}>${ilce}</option>`).join('')}
</select>
<select name="okul" onchange="this.form.submit()" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
<option value="">Tüm Okullar</option>${okullar.map(okul => `<option value="${okul}" ${filOkul===okul?'selected':''}>${okul}</option>`).join('')}
</select>
</form>
<table style="width:100%; border-collapse:collapse; font-size:13px;">
<thead><tr style="background:#f8f9fa;"><th style="padding:10px; border:1px solid #eee; text-align:left;">Kullanıcı Adı</th><th style="padding:10px; border:1px solid #eee;">Sınıf</th><th style="padding:10px; border:1px solid #eee;">İl</th><th style="padding:10px; border:1px solid #eee;">İlçe</th><th style="padding:10px; border:1px solid #eee;">Okul</th><th style="padding:10px; border:1px solid #eee;">Çözülen</th><th style="padding:10px; border:1px solid #eee;">Puan</th><th style="padding:10px; border:1px solid #eee;">İşlem</th></tr></thead>
<tbody>${filtreliKullanicilar.sort((a,b)=>b.puan-a.puan).map(k => `<tr><td style="padding:8px; border:1px solid #eee;">${k.kullaniciAdi}</td><td style="padding:8px; border:1px solid #eee; text-align:center;">${k.sinif}</td><td style="padding:8px; border:1px solid #eee;">${k.il||'-'}</td><td style="padding:8px; border:1px solid #eee;">${k.ilce||'-'}</td><td style="padding:8px; border:1px solid #eee;">${k.okul||'-'}</td><td style="padding:8px; border:1px solid #eee; text-align:center;">${k.soruIndex}</td><td style="padding:8px; border:1px solid #eee; text-align:center; font-weight:bold; color:#1a73e8;">${k.puan}</td><td style="padding:8px; border:1px solid #eee; text-align:center;"><form action="/kullanici-sil" method="POST" style="display:inline;"><input type="hidden" name="kullaniciAdi" value="${k.kullaniciAdi}"><input type="hidden" name="il" value="${filIl}"><input type="hidden" name="ilce" value="${filIlce}"><input type="hidden" name="okul" value="${filOkul}"><button onclick="return confirm('${k.kullaniciAdi} silinsin mi?')" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">SİL</button></form></td></tr>`).join('')}
</tbody></table></div>`;
        } else if (mod === 'okullar') {
            const tumOkullar = await Okul.find().sort({ il: 1, ilce: 1, ad: 1 });
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>Okul Yönetimi</h3>
<form action="/okul-ekle" method="POST" style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; align-items:flex-end;">
<div><label style="font-size:12px; color:#666;">İl</label><br><select name="il" id="adminIlSelect" onchange="adminIlDegisti()" required style="padding:8px; border:1px solid #ddd; border-radius:6px; min-width:120px;"><option value="">İl Seçiniz</option></select></div>
<div><label style="font-size:12px; color:#666;">İlçe</label><br><select name="ilce" id="adminIlceSelect" required style="padding:8px; border:1px solid #ddd; border-radius:6px; min-width:120px;"><option value="">İlçe Seçiniz</option></select></div>
<div><label style="font-size:12px; color:#666;">Okul Adı</label><br><input name="ad" placeholder="Okul adını giriniz" required style="padding:8px; border:1px solid #ddd; border-radius:6px; min-width:250px;"></div>
<button style="background:#34a853; color:white; padding:9px 20px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">EKLE</button>
</form>
<table style="width:100%; border-collapse:collapse; font-size:13px;">
<thead><tr style="background:#f8f9fa;"><th style="padding:10px; border:1px solid #eee; text-align:left;">İl</th><th style="padding:10px; border:1px solid #eee;">İlçe</th><th style="padding:10px; border:1px solid #eee; text-align:left;">Okul Adı</th><th style="padding:10px; border:1px solid #eee;">İşlem</th></tr></thead>
<tbody>${tumOkullar.map(o => `<tr><td style="padding:8px; border:1px solid #eee;">${o.il}</td><td style="padding:8px; border:1px solid #eee;">${o.ilce}</td><td style="padding:8px; border:1px solid #eee;">${o.ad}</td><td style="padding:8px; border:1px solid #eee; text-align:center;"><form action="/okul-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${o._id}"><button onclick="return confirm('${o.ad} silinsin mi?')" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">SİL</button></form></td></tr>`).join('')}
</tbody></table></div>
<script>
let adminIlIdMap = {};
fetch('https://turkiyeapi.dev/api/v1/provinces?fields=id,name')
  .then(r => r.json()).then(data => {
    const sel = document.getElementById('adminIlSelect');
    (data.data||[]).sort((a,b)=>a.name.localeCompare(b.name,'tr')).forEach(il => {
      adminIlIdMap[il.name] = il.id;
      sel.innerHTML += '<option value="'+il.name+'">'+il.name+'</option>';
    });
  });
function adminIlDegisti() {
  const ilAdi = document.getElementById('adminIlSelect').value;
  const ilceSelect = document.getElementById('adminIlceSelect');
  ilceSelect.innerHTML = '<option value="">İlçe Yükleniyor...</option>';
  const ilId = adminIlIdMap[ilAdi];
  if (!ilId) return;
  fetch('https://turkiyeapi.dev/api/v1/provinces/'+ilId+'?fields=districts')
    .then(r=>r.json()).then(data => {
      ilceSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';
      ((data.data&&data.data.districts)||[]).sort((a,b)=>a.name.localeCompare(b.name,'tr')).forEach(ilce => {
        ilceSelect.innerHTML += '<option value="'+ilce.name+'">'+ilce.name+'</option>';
      });
    });
}
</script>`;
        } else if (mod === 'sifirla') {
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3 style="color:red;">⚠️ Veri Sıfırlama</h3><p>Bu işlem tüm kullanıcıların puan, soru ve istatistik verilerini sıfırlar. Kullanıcı hesapları silinmez. Soru içerikleri silinmez, sadece istatistikler sıfırlanır.</p><p><b>Bu işlem geri alınamaz!</b></p><form action="/sifirla" method="POST"><button onclick="return confirm('Emin misiniz? Bu işlem geri alınamaz!')" style="background:red; color:white; padding:12px 30px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">SIFIRLA</button></form></div>`;
        } else {
            icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>Tüm Sorular</h3><div style="display:grid; gap:10px;">${tumSorular.map((s, i) => `<div style="padding:15px; background:#fff; border:1px solid #eee; border-radius:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${i+1}.</b> [${s.sinif}. Sınıf - ${s.ders}] ${s.soruMetni.substring(0,50)}... <small style="color:#888;">Z:${(s.zorlukKatsayisi||3).toFixed(1)} | HP:${s.hamPuan !== null && s.hamPuan !== undefined ? Number(s.hamPuan).toFixed(1) : "-"}</small></span><div><a href="/admin?duzenle=${s._id}&mod=soruEkle" style="color:#1a73e8; font-weight:bold; text-decoration:none; margin-right:10px;">DÜZENLE</a><form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">SİL</button></form></div></div>`).join('')}</div></div>`;
        }

        res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#202124; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">🛠️ Admin</h2><a href="/admin?mod=soruListesi" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soruListesi'?'#3c4043':''};">📋 Soruları Listele</a><a href="/admin?mod=soruEkle" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soruEkle'?'#3c4043':''};">➕ Yeni Soru Ekle</a><a href="/admin?mod=kullanicilar" style="display:block; color:white; text-decoration:none; padding:15px; margin-top:10px; border-radius:8px; background:${mod==='kullanicilar'?'#3c4043':''};">👥 Kullanıcılar</a><a href="/admin?mod=sifirla" style="display:block; color:#ffaaaa; text-decoration:none; padding:15px; margin-top:10px; border-radius:8px; background:${mod==='sifirla'?'#3c4043':''};">🗑️ Veri Sıfırla</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış Yap</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/soru-ekle', async (req, res) => {
    await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
    res.redirect('/admin?mod=soruListesi');
});

app.post('/soru-guncelle', async (req, res) => {
    await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) });
    res.redirect('/admin?mod=soruListesi');
});

app.post('/soru-sil', async (req, res) => {
    await Soru.findByIdAndDelete(req.body.id);
    res.redirect('/admin?mod=soruListesi');
});

app.post('/kullanici-sil', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        try {
            await Kullanici.findOneAndDelete({ kullaniciAdi: req.body.kullaniciAdi });
            const params = new URLSearchParams({ mod: 'kullanicilar', il: req.body.il || '', ilce: req.body.ilce || '', okul: req.body.okul || '' }).toString();
            res.redirect('/admin?' + params);
        } catch (err) { res.status(500).send('Hata: ' + err.message); }
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/sifirla', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        try {
            await Kullanici.updateMany({}, { $set: { soruIndex: 0, puan: 0, toplamSure: 0, cozumSureleri: [] } });
            await Soru.updateMany({}, { $set: { cozulmeSayisi: 0, dogruSayisi: 0, ortalamaSure: 0, hamPuan: null, zorlukKatsayisi: 3, cozumSureleriTum: [], dogruCevapSureleri: [] } });
            res.send('<script>alert("Tüm veriler sıfırlandı!"); window.location.href="/admin?mod=soruListesi";</script>');
        } catch (err) { res.status(500).send('Hata: ' + err.message); }
    } else { res.status(401).send('Yetkisiz!'); }
});

app.get('/api/okullar', async (req, res) => {
    try {
        const { il, ilce } = req.query;
        const filtre = {};
        if (il) filtre.il = il;
        if (ilce) filtre.ilce = ilce;
        const okullar = await Okul.find(filtre, 'ad').sort({ ad: 1 });
        res.json(okullar.map(o => o.ad));
    } catch (err) { res.status(500).json([]); }
});

app.post('/okul-ekle', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        try {
            const varMi = await Okul.findOne({ il: req.body.il, ilce: req.body.ilce, ad: req.body.ad });
            if (!varMi) await new Okul({ il: req.body.il, ilce: req.body.ilce, ad: req.body.ad }).save();
            res.redirect('/admin?mod=okullar');
        } catch (err) { res.status(500).send('Hata: ' + err.message); }
    } else { res.status(401).send('Yetkisiz!'); }
});

app.post('/okul-sil', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
    const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = credentials.split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
        try {
            await Okul.findByIdAndDelete(req.body.id);
            res.redirect('/admin?mod=okullar');
        } catch (err) { res.status(500).send('Hata: ' + err.message); }
    } else { res.status(401).send('Yetkisiz!'); }
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));