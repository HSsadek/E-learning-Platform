const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// Admin kullanıcısı oluştur (sadece geliştirme için)
router.post('/create-admin', async (req, res) => {
    try {
        // Admin zaten var mı kontrol et
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin kullanıcısı zaten mevcut' });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash('admin123', 12);

        // Admin kullanıcısı oluştur
        const admin = new User({
            name: 'Admin',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();

        // JWT token oluştur
        const token = jwt.sign(
            { userId: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Admin kullanıcısı oluşturuldu',
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kullanıcı kayıt
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Kullanıcı zaten var mı kontrol et
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu email zaten kullanılıyor' });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 12);

        // Rol kontrolü - öğretmen başvurusu
        let userRole = role || 'student';
        let teacherApplication = null;
        let message = 'Kullanıcı başarıyla oluşturuldu';

        if (role === 'teacher') {
            userRole = 'pending_teacher';
            teacherApplication = {
                status: 'pending',
                appliedAt: new Date()
            };
            message = 'Öğretmen başvurunuz alındı. Admin onayı bekleniyor.';
        }

        // Yeni kullanıcı oluştur
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: userRole,
            teacherApplication
        });

        await user.save();

        // JWT token oluştur (pending_teacher için de student yetkisi ver)
        const tokenRole = userRole === 'pending_teacher' ? 'student' : userRole;
        const token = jwt.sign(
            { userId: user._id, role: tokenRole },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: userRole,
                profileImage: user.profileImage,
                teacherApplication: teacherApplication
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kullanıcı giriş
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Geçersiz email veya şifre' });
        }

        // Ban kontrolü
        if (user.isBanned) {
            return res.status(403).json({ 
                message: 'Hesabınız engellenmiştir.', 
                banReason: user.banReason 
            });
        }

        // Şifreyi kontrol et
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Geçersiz email veya şifre' });
        }

        // Son giriş tarihini güncelle
        user.lastLogin = new Date();
        await user.save();

        // JWT token oluştur (pending_teacher için student yetkisi ver)
        const tokenRole = user.role === 'pending_teacher' ? 'student' : user.role;
        const token = jwt.sign(
            { userId: user._id, role: tokenRole },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                effectiveRole: tokenRole // Gerçek yetki seviyesi
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Şifre sıfırlama talebi - Token gönder
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            // Güvenlik için kullanıcı bulunamasa bile aynı mesajı döndür
            return res.json({ 
                message: 'Eğer bu email adresi kayıtlıysa, şifre sıfırlama linki gönderildi.' 
            });
        }

        // Random token oluştur
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Token'ı hashleyerek kaydet (güvenlik için)
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Token'ı ve süresini kaydet (1 saat geçerli)
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 saat
        await user.save();

        // Email gönder
        try {
            await sendPasswordResetEmail(user.email, resetToken, user.name);
            console.log(`Şifre sıfırlama linki ${email} adresine gönderildi`);
            
            res.json({ 
                message: 'Şifre sıfırlama linki email adresinize gönderildi. Lütfen email kutunuzu kontrol edin.'
            });
        } catch (emailError) {
            // Email gönderilemezse token'ı temizle
            user.passwordResetToken = null;
            user.passwordResetExpires = null;
            await user.save();
            
            console.error('Email gönderme hatası:', emailError);
            return res.status(500).json({ 
                message: 'Email gönderilemedi. Lütfen daha sonra tekrar deneyin.' 
            });
        }
    } catch (error) {
        console.error('Şifre sıfırlama hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Token doğrulama
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Token'ı hashle
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Token'ı ve süresini kontrol et
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                valid: false,
                message: 'Geçersiz veya süresi dolmuş token' 
            });
        }

        res.json({ 
            valid: true,
            message: 'Token geçerli',
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Yeni şifre belirleme
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token ve yeni şifre gereklidir' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
        }

        // Token'ı hashle
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Token'ı ve süresini kontrol et
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Geçersiz veya süresi dolmuş token. Lütfen yeni bir şifre sıfırlama talebi oluşturun.' 
            });
        }

        // Yeni şifreyi hashle ve kaydet
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        console.log(`${user.email} kullanıcısının şifresi başarıyla sıfırlandı`);

        res.json({ 
            message: 'Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.' 
        });
    } catch (error) {
        console.error('Şifre sıfırlama hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;