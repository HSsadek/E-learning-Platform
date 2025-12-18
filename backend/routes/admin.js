const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Announcement = require('../models/Announcement');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

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

        // Son aktiviteler
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role createdAt');

        const recentCourses = await Course.find({ status: 'pending' })
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                totalUsers,
                totalStudents,
                totalTeachers,
                totalCourses,
                pendingCourses,
                totalRevenue: totalRevenue[0]?.total || 0
            },
            recentActivities: {
                recentUsers,
                recentCourses
            }
        });
    } catch (error) {
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

module.exports = router;