const nodemailer = require('nodemailer');

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function mailGonder(aliciEmail, konu, html) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Mail servisi yapılandırılmamış (GMAIL_USER/GMAIL_APP_PASSWORD eksik)');
    }
    const info = await transporter.sendMail({
        from: `"LGS Hazırlık Platformu" <${process.env.GMAIL_USER}>`,
        to: aliciEmail,
        subject: konu,
        html: html
    });
    return info;
}

async function sifreSifirlamaMailiGonder(aliciEmail, kullaniciAdi, sifirlamaLinki) {
    const konu = 'LGS Hazırlık — Şifre Sıfırlama';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a73e8;">Şifre Sıfırlama İsteği</h2>
            <p>Merhaba <b>${kullaniciAdi}</b>,</p>
            <p>LGS Hazırlık Platformu hesabınız için şifre sıfırlama isteği aldık.</p>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${sifirlamaLinki}" style="background: #1a73e8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Şifremi Sıfırla</a>
            </p>
            <p style="font-size: 13px; color: #666;">Bu bağlantı <b>1 saat</b> geçerlidir.</p>
            <p style="font-size: 13px; color: #666;">Bu isteği siz yapmadıysanız bu mesajı görmezden gelebilirsiniz. Hesabınız güvende kalacaktır.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">Bu otomatik bir mesajdır, yanıtlamayın.</p>
        </div>
    `;
    return await mailGonder(aliciEmail, konu, html);
}

// v4.2.5: Mail değiştirme doğrulama kodu
async function emailDogrulamaKoduGonder(aliciEmail, kullaniciAdi, kod) {
    const konu = 'LGS Hazırlık — Mail Doğrulama Kodu';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a73e8;">Mail Doğrulama</h2>
            <p>Merhaba <b>${kullaniciAdi}</b>,</p>
            <p>LGS Hazırlık Platformu hesabınızda mail adresinizi bu adresle değiştirmek istediniz.</p>
            <p style="font-size: 14px;">Aşağıdaki kodu doğrulama sayfasına girin:</p>
            <div style="text-align:center; margin:30px 0;">
                <div style="display:inline-block; background:#f0f7ff; border:2px solid #1a73e8; padding:18px 36px; border-radius:10px; font-size:32px; font-weight:bold; color:#1a73e8; letter-spacing:8px; font-family:'Courier New', monospace;">${kod}</div>
            </div>
            <p style="font-size: 13px; color: #666;">Bu kod <b>15 dakika</b> geçerlidir.</p>
            <p style="font-size: 13px; color: #666;">Bu isteği siz yapmadıysanız bu mesajı görmezden gelebilirsiniz. Mail adresiniz değişmez.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">Bu otomatik bir mesajdır, yanıtlamayın.</p>
        </div>
    `;
    return await mailGonder(aliciEmail, konu, html);
}

module.exports = { mailGonder, sifreSifirlamaMailiGonder, emailDogrulamaKoduGonder };
