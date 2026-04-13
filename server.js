// --- LGS HAZIRLIK PLATFORMU - VERSİYON 3.0 ---

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

// --- MODELLER ---
const Kullanici = require('./models/Kullanici');
const Soru = require('./models/Soru');
const Okul = require('./models/Okul');

// --- ROUTE'LAR ---
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/panel'));
app.use('/', require('./routes/admin'));

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda hazır!`));