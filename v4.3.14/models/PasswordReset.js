const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
    kullaniciAdi: { type: String, index: true },
    email: String,
    token: { type: String, unique: true, index: true },
    expires: { type: Date, index: true }
});

// TTL index — süresi geçen kayıtlar otomatik silinir
PasswordResetSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', PasswordResetSchema);
