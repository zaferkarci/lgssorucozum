const mongoose = require('mongoose');

module.exports = mongoose.model('Okul', new mongoose.Schema({
    il: String, ilce: String, ad: String
}));
