const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Announcement = require('../models/Announcement');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

console.log('🚀 Admin routes yüklendi!'); // Debug

// Kategori resmi için multer konfigürasyonu
const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const categoriesDir = path.join(__dirname, '../uploads/categories');
        if (!fs.existsSync(categoriesDir)) {
            fs.mkdirSync(categoriesDir, { recursive: true });
        }
        cb(null, categoriesDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const categoryImageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const categoryUpload = multer({
    storage: categoryStorage,
    fileFilter: categoryImageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Dashboard istatistikleri
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalCourses = await Course.countDocuments({ status: 'approved' });
        const pendingCourses = await Course.countDocuments({ status: 'pending' });
        const totalRevenue = await Course.aggregate([
            { $match: { status: 'approved', price: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$price', { $size: '$students' }] } } } }
        ]);

        // Bekleyen öğretmen başvuruları
        const pendingTeachers = await User.countDocuments({ role: 'pending_teacher' });

        // Son aktiviteler
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role createdAt');

        const recentCourses = await Course.find({ status: 'pending' })
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        // Bekleyen öğretmen başvuruları
        const recentTeacherApplications = await User.find({ role: 'pending_teacher' })
            .sort({ 'teacherApplication.appliedAt': -1 })
            .limit(5)
            .select('name email teacherApplication');

        res.json({
            stats: {
                totalUsers,
                totalStudents,
                totalTeachers,
                totalCourses,
                pendingCourses,
                pendingTeachers,
                totalRevenue: totalRevenue[0]?.total || 0
            },
            recentActivities: {
                recentUsers,
                recentCourses,
                recentTeacherApplications
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Test route (auth olmadan) - en üstte
router.get('/test-simple', (req, res) => {
    console.log('🧪 Simple test route çağrıldı!');
    res.json({ message: 'Simple test başarılı!' });
});

// Belirli bir kullanıcıyı getir
router.get('/users/:id', (req, res, next) => {
    console.log('🔍 Admin users/:id route HIT! ID:', req.params.id);
    next();
}, adminAuth, async (req, res) => {
    try {
        console.log('✅ AdminAuth geçildi, kullanıcı araniyor, ID:', req.params.id);
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            console.log('❌ Kullanıcı bulunamadı, ID:', req.params.id);
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        
        console.log('✅ Kullanıcı bulundu:', user.name);
        res.json(user);
    } catch (error) {
        console.error('💥 Admin users/:id hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Tüm kullanıcıları listele
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        
        let query = {};
        if (role && role !== 'all') {
            query.role = role;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .populate('enrolledCourses', 'title')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kullanıcı rolünü güncelle
router.put('/users/:id/role', adminAuth, async (req, res) => {
    try {
        const { role } = req.body;
        
        if (!['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Geçersiz rol' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        res.json({ message: 'Kullanıcı rolü güncellendi', user });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kullanıcıyı banla/ban kaldır
router.put('/users/:id/ban', adminAuth, async (req, res) => {
    try {
        const { isBanned, banReason } = req.body;
        
        const updateData = {
            isBanned,
            banReason: isBanned ? banReason : null,
            bannedAt: isBanned ? new Date() : null
        };

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        res.json({ 
            message: isBanned ? 'Kullanıcı banlandı' : 'Kullanıcının banı kaldırıldı', 
            user 
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Bekleyen kursları listele
router.get('/courses/pending', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find({ status: 'pending' })
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 });

        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kursu onayla/reddet
router.put('/courses/:id/approve', adminAuth, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Geçersiz durum' });
        }

        const updateData = {
            status,
            approvedBy: req.user.userId,
            approvedAt: new Date()
        };

        if (status === 'rejected') {
            updateData.rejectionReason = rejectionReason;
        }

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('instructor', 'name email');

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }

        res.json({ 
            message: status === 'approved' ? 'Kurs onaylandı' : 'Kurs reddedildi', 
            course 
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kategorileri yönet
router.get('/categories', adminAuth, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kategori resmi yükle
router.post('/categories/upload-image', adminAuth, categoryUpload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Resim dosyası gerekli' });
        }
        
        const imagePath = '/uploads/categories/' + req.file.filename;
        res.json({ imagePath });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

router.post('/categories', adminAuth, async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

router.put('/categories/:id', adminAuth, async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!category) {
            return res.status(404).json({ message: 'Kategori bulunamadı' });
        }
        
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

router.delete('/categories/:id', adminAuth, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({ message: 'Kategori bulunamadı' });
        }
        
        // Eski resmi sil
        if (category.image) {
            const imagePath = path.join(__dirname, '..', category.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Kategori silindi' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Duyuru yönetimi
router.get('/announcements', adminAuth, async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

router.post('/announcements', adminAuth, async (req, res) => {
    try {
        const announcement = new Announcement({
            ...req.body,
            createdBy: req.user.userId
        });
        
        await announcement.save();
        await announcement.populate('createdBy', 'name email');
        
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

router.put('/announcements/:id', adminAuth, async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('createdBy', 'name email');
        
        if (!announcement) {
            return res.status(404).json({ message: 'Duyuru bulunamadı' });
        }
        
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

router.delete('/announcements/:id', adminAuth, async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        
        if (!announcement) {
            return res.status(404).json({ message: 'Duyuru bulunamadı' });
        }
        
        res.json({ message: 'Duyuru silindi' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Bekleyen öğretmen başvurularını listele
router.get('/teacher-applications', adminAuth, async (req, res) => {
    try {
        const applications = await User.find({ role: 'pending_teacher' })
            .sort({ 'teacherApplication.appliedAt': -1 })
            .select('name email teacherApplication createdAt');

        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Öğretmen başvurusunu onayla/reddet
router.put('/teacher-applications/:id/review', adminAuth, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Geçersiz durum' });
        }

        const user = await User.findById(req.params.id);
        
        if (!user || user.role !== 'pending_teacher') {
            return res.status(404).json({ message: 'Bekleyen öğretmen başvurusu bulunamadı' });
        }

        // Başvuru durumunu güncelle
        user.teacherApplication.status = status;
        user.teacherApplication.reviewedAt = new Date();
        user.teacherApplication.reviewedBy = req.user.userId;
        
        if (status === 'approved') {
            user.role = 'teacher';
        } else {
            user.teacherApplication.rejectionReason = rejectionReason;
            // Reddedilen başvuru için role'ü student yap
            user.role = 'student';
        }

        await user.save();

        res.json({ 
            message: status === 'approved' ? 
                'Öğretmen başvurusu onaylandı. Kullanıcının yeniden giriş yapması gerekiyor.' : 
                'Öğretmen başvurusu reddedildi',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                teacherApplication: user.teacherApplication
            },
            requireRelogin: status === 'approved' // Frontend'e yeniden giriş gerektiğini bildir
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;