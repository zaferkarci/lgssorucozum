// --- LGS HAZIRLIK PLATFORMU - VERSİYON 3.0.2 (Modüler Yapı) ---
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = process.env.PORT || 10000;
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI).then(() => console.log("✅ MongoDB Bağlandı")).catch(err => console.error("❌ Hata:", err.message));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/panel'));
app.use('/', require('./routes/admin'));
app.use('/', require('./routes/pdfyukle'));

// Ünite Excel şablonu indir
app.get('/unite-sablon-indir', (req, res) => {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const veri = [
        ['Sınıf', 'Ders', 'Ünite', 'Ünite Adı', 'Alt Konu'],
        [8, 'Matematik', '1. Ünite', 'Çarpanlar ve Katlar', 'Çarpanlar ve Katlar'],
        [null, null, null, null, 'Üslü İfadeler'],
        [8, 'Matematik', '2. Ünite', 'Cebirsel İfadeler', 'Cebirsel İfadeler'],
        [null, null, null, null, 'Denklemler'],
        [8, 'Fen Bilimleri', '1. Ünite', 'Mevsimler ve İklim', 'Mevsimlerin Oluşumu'],
        [null, null, null, null, 'İklim ve Hava Hareketleri'],
        [8, 'Türkçe', '1. Ünite', 'Sözcükte Anlam', 'Sözcükte Anlam'],
        [null, null, null, null, 'Cümlede Anlam'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(veri);
    ws['!cols'] = [{wch:8},{wch:18},{wch:12},{wch:30},{wch:35}];
    XLSX.utils.book_append_sheet(wb, ws, 'Ünite ve Konular');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="unite_konular_sablonu.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));
