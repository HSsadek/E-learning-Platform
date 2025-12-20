const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

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

// Şifre sıfırlama
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı' });
        }

        // Yeni rastgele şifre oluştur
        const newPassword = crypto.randomBytes(4).toString('hex'); // 8 karakterlik rastgele şifre
        
        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Kullanıcının şifresini güncelle
        user.password = hashedPassword;
        await user.save();

        // Gerçek bir uygulamada burada email gönderme servisi kullanılır
        // Şimdilik console'a yazdırıyoruz ve başarı mesajı dönüyoruz
        console.log(`Yeni şifre ${email} adresine gönderildi: ${newPassword}`);
        
        // Demo amaçlı - gerçek uygulamada şifreyi response'da göndermemelisiniz!
        res.json({ 
            message: 'Yeni şifreniz email adresinize gönderildi',
            // Demo için şifreyi gösteriyoruz - gerçek uygulamada bu olmamalı!
            temporaryPassword: newPassword,
            note: 'Demo amaçlı şifre gösteriliyor. Gerçek uygulamada email ile gönderilir.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;