const nodemailer = require('nodemailer');

// Email transporter oluştur
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // TLS kullan
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Şifre sıfırlama emaili gönder
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/#reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Şifre Sıfırlama - Online Okul',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">🎓 Online Okul</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333;">Merhaba ${userName},</h2>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Şifrenizi sıfırlamak için bir talep aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 15px 40px; 
                                  text-decoration: none; 
                                  border-radius: 25px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Şifremi Sıfırla
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 14px;">
                        Bu link <strong>1 saat</strong> içinde geçerliliğini yitirecektir.
                    </p>
                    
                    <p style="color: #999; font-size: 14px;">
                        Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        Link çalışmıyorsa, aşağıdaki URL'yi tarayıcınıza kopyalayın:<br>
                        <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    © ${new Date().getFullYear()} Online Okul. Tüm hakları saklıdır.
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendPasswordResetEmail
};
