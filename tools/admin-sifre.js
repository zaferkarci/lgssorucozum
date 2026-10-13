// v4.17.22: YONETICI SIFRESINI SUNUCUDA GUVENLI DEGISTIRME
//   Kullanim (sunucuda, elcezeri kullanicisiyla):
//       cd ~/lgssorucozum && node tools/admin-sifre.js
//       pm2 restart elcezeri
//   - Sifre ekrana yazilmaz (gizli giris). Isterseniz guclu rastgele sifre uretilir.
//   - .env'ye sifrenin kendisi DEGIL, yalniz bcrypt ozeti yazilir (ADMIN_PASSWORD_HASH).
//     Ozetten sifre geri elde edilemez. Eski duz metin ADMIN_PASSWORD satiri silinir.
//   - .env dosya izni 600 yapilir (yalniz sahibi okuyabilir).
//   - Acik yonetici oturumlari kapatilir (eski sifreyle acilmis oturum kalmaz).
//   - Sifre hicbir dosyaya, loga, sayfaya, git deposuna yazilmaz.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const KOK = path.join(__dirname, '..');
const ENV = path.join(KOK, '.env');

const ZAYIF = ['1234', 'admin', 'password', 'passw', 'sifre', 'qwerty', 'asdf', 'elcezeri', 'yonetici', 'abc123', 'lgssoru'];

// Boru/otomasyon (terminal degil) icin: tum satirlar tek okuyucudan siraya alinir
let _kuyruk = null, _bekleyen = [];
function _boruSatir() {
    if (!_kuyruk) {
        _kuyruk = [];
        const rl = readline.createInterface({ input: process.stdin, terminal: false });
        rl.on('line', l => { if (_bekleyen.length) _bekleyen.shift()(l); else _kuyruk.push(l); });
        rl.on('close', () => { while (_bekleyen.length) _bekleyen.shift()(''); });
    }
    return new Promise(coz => { if (_kuyruk.length) coz(_kuyruk.shift()); else _bekleyen.push(coz); });
}

function sor(soru) {
    if (!process.stdin.isTTY) { process.stdout.write(soru); return _boruSatir().then(c => { process.stdout.write('\n'); return c; }); }
    return new Promise(coz => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl.question(soru, c => { rl.close(); coz(c); });
    });
}

// Gizli giris: yazilan karakterler ekranda gorunmez
function gizliSor(soru) {
    if (!process.stdin.isTTY) return sor(soru); // boru/otomasyon icin (ekrana yine yazilmaz)
    return new Promise((coz, red) => {
        process.stdout.write(soru);
        const stdin = process.stdin;
        let deger = '';
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        const dinle = (veri) => {
            for (const ch of veri) {
                if (ch === '\r' || ch === '\n' || ch === '\u0004') {
                    stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', dinle);
                    process.stdout.write('\n');
                    return coz(deger);
                }
                if (ch === '\u0003') { // Ctrl+C
                    stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', dinle);
                    process.stdout.write('\nİptal edildi.\n');
                    return process.exit(1);
                }
                if (ch === '\u007f' || ch === '\b') { deger = deger.slice(0, -1); continue; }
                if (ch < ' ') continue;
                deger += ch;
            }
        };
        stdin.on('data', dinle);
    });
}

function gucluMu(sifre, kullanici) {
    const s = String(sifre || '');
    if (s.length < 12) return 'En az 12 karakter olmalı.';
    if (s.length > 72) return 'En fazla 72 karakter olabilir.';
    if (!/^[\x21-\x7e]+$/.test(s)) return 'Yalnız İngilizce harf, rakam ve sembol kullanın (Türkçe karakter ve boşluk tarayıcı girişinde sorun çıkarır).';
    let sinif = 0;
    if (/[a-z]/.test(s)) sinif++;
    if (/[A-Z]/.test(s)) sinif++;
    if (/[0-9]/.test(s)) sinif++;
    if (/[^A-Za-z0-9]/.test(s)) sinif++;
    if (sinif < 3) return 'Küçük harf, büyük harf, rakam ve sembolden en az 3 türü içermeli.';
    const k = String(kullanici || '').toLowerCase();
    if (k.length >= 3 && s.toLowerCase().includes(k)) return 'Kullanıcı adını içermemeli.';
    const kucuk = s.toLowerCase();
    for (const z of ZAYIF) if (kucuk.includes(z)) return 'Tahmin edilebilir bir kelime/dizi içeriyor ("' + z + '").';
    if (/(.)\1{3,}/.test(s)) return 'Aynı karakter 4 kez üst üste tekrar etmemeli.';
    return null;
}

function rastgeleSifre(uzunluk) {
    // Karisan karakterler (0 O 1 l I) yok; semboller Turkce klavyede kolay yazilanlar
    const kucuk = 'abcdefghijkmnopqrstuvwxyz', buyuk = 'ABCDEFGHJKLMNPQRSTUVWXYZ', rakam = '23456789', sembol = '-_.!+=*?%';
    const hepsi = kucuk + buyuk + rakam + sembol;
    const sec = k => k[crypto.randomInt(k.length)];
    for (;;) {
        const d = [sec(kucuk), sec(buyuk), sec(rakam), sec(sembol)];
        while (d.length < uzunluk) d.push(sec(hepsi));
        for (let i = d.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
        const s = d.join('');
        if (!gucluMu(s, '')) return s;
    }
}

function envOku() {
    if (!fs.existsSync(ENV)) return { satirlar: [], degerler: {} };
    const metin = fs.readFileSync(ENV, 'utf8');
    let degerler = {};
    try { degerler = require('dotenv').parse(metin); } catch (e) { degerler = {}; }
    return { satirlar: metin.split(/\r?\n/), degerler, crlf: /\r\n/.test(metin) };
}

function envYaz(satirlar, crlf) {
    while (satirlar.length && satirlar[satirlar.length - 1].trim() === '') satirlar.pop();
    const metin = satirlar.join(crlf ? '\r\n' : '\n') + (crlf ? '\r\n' : '\n');
    const gecici = ENV + '.yeni-' + process.pid;
    fs.writeFileSync(gecici, metin, { mode: 0o600 });
    fs.renameSync(gecici, ENV);
    try { fs.chmodSync(ENV, 0o600); } catch (e) { /* windows */ }
}

async function oturumlariKapat(mongoUri) {
    if (!mongoUri) return 'MONGO_URI yok, oturumlar kapatılamadı (sunucu yeniden başlayınca eski şifre zaten geçmez; açık oturumlar için tekrar çalıştırın).';
    let mongoose;
    try { mongoose = require(path.join(KOK, 'node_modules', 'mongoose')); } catch (e) { mongoose = require('mongoose'); }
    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
        const r = await mongoose.connection.db.collection('sessions').deleteMany({ session: { $regex: '"adminGirisli":true' } });
        await mongoose.disconnect();
        return (r.deletedCount || 0) + ' açık yönetici oturumu kapatıldı.';
    } catch (e) {
        try { await mongoose.disconnect(); } catch (_) {}
        return 'Oturumlar kapatılamadı: ' + e.message;
    }
}

(async function () {
    console.log('');
    console.log('=== Yönetici şifresi değiştirme ===');
    console.log('Dosya: ' + ENV);
    const { satirlar, degerler, crlf } = envOku();
    if (!satirlar.length) console.log('(.env bulunamadı — yeni oluşturulacak)');

    const mevcutKullanici = degerler.ADMIN_USER || '';
    let kullanici = (await sor('Yönetici kullanıcı adı' + (mevcutKullanici ? ' [Enter = ' + mevcutKullanici + ']' : '') + ': ')).trim();
    if (!kullanici) kullanici = mevcutKullanici;
    if (!kullanici) { console.log('Kullanıcı adı gerekli.'); process.exit(1); }
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(kullanici)) { console.log('Kullanıcı adı 3-40 karakter; yalnız harf, rakam, nokta, alt çizgi, tire.'); process.exit(1); }

    const uret = (await sor('Güçlü rastgele şifre üretilsin mi? (E/h): ')).trim().toLowerCase();
    let sifre = '';
    if (uret === '' || uret === 'e' || uret === 'evet') {
        sifre = rastgeleSifre(20);
        console.log('');
        console.log('Yeni şifreniz (YALNIZ BİR KEZ gösterilir, şimdi şifre yöneticinize/kağıda kaydedin):');
        console.log('');
        console.log('    ' + sifre);
        console.log('');
        const tekrar = await gizliSor('Kaydettiğinizi doğrulamak için şifreyi yazın (görünmez): ');
        // Ekrandaki sifreyi temizle (terminal destekliyorsa)
        if (process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
        if (tekrar !== sifre) { console.log('Şifreler eşleşmedi. Hiçbir şey değişmedi; tekrar çalıştırın.'); process.exit(1); }
    } else {
        console.log('Kural: en az 12 karakter; küçük/büyük harf, rakam, sembolden en az 3 tür; Türkçe karakter ve boşluk yok.');
        for (let deneme = 0; deneme < 3 && !sifre; deneme++) {
            const s1 = await gizliSor('Yeni şifre (görünmez): ');
            const h = gucluMu(s1, kullanici);
            if (h) { console.log('✗ ' + h); continue; }
            const s2 = await gizliSor('Yeni şifre tekrar: ');
            if (s1 !== s2) { console.log('✗ Şifreler eşleşmedi.'); continue; }
            sifre = s1;
        }
        if (!sifre) { console.log('Hiçbir şey değişmedi.'); process.exit(1); }
    }

    const ozet = require(path.join(KOK, 'node_modules', 'bcrypt')).hashSync(sifre, 12);
    sifre = ''; // bellekte tutma

    // .env: ADMIN_PASSWORD ve ADMIN_PASSWORD_HASH satirlarini sil, ADMIN_USER guncelle, ozeti ekle
    const yeni = [];
    let kullaniciYazildi = false;
    for (const s of satirlar) {
        const t = s.replace(/^\s*export\s+/, '').trim();
        if (/^ADMIN_PASSWORD(_HASH)?\s*=/.test(t)) continue;
        if (/^ADMIN_USER\s*=/.test(t)) { yeni.push('ADMIN_USER=' + kullanici); kullaniciYazildi = true; continue; }
        yeni.push(s);
    }
    while (yeni.length && yeni[yeni.length - 1].trim() === '') yeni.pop();
    if (!kullaniciYazildi) yeni.push('ADMIN_USER=' + kullanici);
    yeni.push("ADMIN_PASSWORD_HASH='" + ozet + "'");
    envYaz(yeni, crlf);
    console.log('✓ .env güncellendi (şifre yerine yalnız özet yazıldı, dosya izni 600).');

    console.log('… ' + await oturumlariKapat(degerler.MONGO_URI || process.env.MONGO_URI));
    console.log('');
    console.log('Son adım — sunucuyu yeniden başlatın:');
    console.log('    pm2 restart elcezeri');
    console.log('');
    console.log('Sonra tarayıcıda /admin açın; yeni kullanıcı adı ve şifreyle girin.');
    console.log('(Tarayıcı eski şifreyi hatırlıyorsa sorun olmaz: eski kimlik reddedilir ve şifre yeniden sorulur.)');
    process.exit(0);
})().catch(e => { console.error('Hata:', e.message); process.exit(1); });
