const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Kullanıcı profilini getir
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('enrolledCourses', 'title description instructor');
        
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kullanıcı profilini güncelle
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, bio, phone, location, website, socialLinks } = req.body;
        
        // Email değişikliğine izin verilmiyor - sadece diğer alanları güncelle
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { name, bio, phone, location, website, socialLinks },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({ message: 'Profil başarıyla güncellendi', user });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Profil resmi yükle
router.post('/profile/upload-image', auth, async (req, res) => {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    
    // Multer konfigürasyonu
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadsDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
        }
    };

    const upload = multer({ 
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB limit
        }
    }).single('profileImage');

    upload(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Dosya seçilmedi' });
        }

        try {
            // Eski profil resmini sil
            const user = await User.findById(req.user.userId);
            if (user.profileImage) {
                const oldImagePath = path.join(__dirname, '../uploads', path.basename(user.profileImage));
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            // Yeni profil resmini kaydet
            const profileImageUrl = `/uploads/${req.file.filename}`;
            const updatedUser = await User.findByIdAndUpdate(
                req.user.userId,
                { profileImage: profileImageUrl },
                { new: true }
            ).select('-password');

            res.json({ 
                message: 'Profil resmi başarıyla yüklendi', 
                user: updatedUser,
                profileImage: profileImageUrl
            });
        } catch (error) {
            // Hata durumunda yüklenen dosyayı sil
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ message: 'Sunucu hatası', error: error.message });
        }
    });
});

// Profil resmini sil
router.delete('/profile/image', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        // Eski profil resmini diskten sil
        if (user.profileImage) {
            const path = require('path');
            const fs = require('fs');
            const imagePath = path.join(__dirname, '../uploads', path.basename(user.profileImage));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { profileImage: null },
            { new: true }
        ).select('-password');
        
        res.json({ message: 'Profil resmi silindi', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Şifre değiştir
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        
        // Mevcut şifreyi kontrol et
        const bcrypt = require('bcryptjs');
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Mevcut şifre yanlış' });
        }
        
        // Yeni şifreyi hashle
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        
        // Şifreyi güncelle
        user.password = hashedNewPassword;
        await user.save();
        
        res.json({ message: 'Şifre başarıyla değiştirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Belirli bir kullanıcıyı getir (sadece admin)
router.get('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }
        
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Tüm kullanıcıları getir (sadece admin)
router.get('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }
        
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;