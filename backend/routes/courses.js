const express = require('express');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

const router = express.Router();

// Tüm kursları getir (sadece onaylanmış)
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find({ status: 'approved' })
            .populate('instructor', 'name email')
            .select('-lessons'); // Detay sayfası için lessons'ı gizle
        
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Belirli bir kursu getir
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'name email')
            .populate('students', 'name email');
        
        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }
        
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Yeni kurs oluştur (sadece öğretmen ve admin)
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }

        const course = new Course({
            ...req.body,
            instructor: req.user.userId
        });

        await course.save();
        await course.populate('instructor', 'name email');
        
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kursa kayıt ol
router.post('/:id/enroll', auth, async (req, res) => {
    try {
        const Course = require('../models/Course');
        const Progress = require('../models/Progress');
        const User = require('../models/User');
        const Payment = require('../models/Payment');
        
        const { paymentMethod, paymentData } = req.body;
        
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }

        // Sadece onaylanmış kurslara kayıt olunabilir
        if (course.status !== 'approved') {
            return res.status(400).json({ message: 'Bu kurs henüz onaylanmamış' });
        }

        // Zaten kayıtlı mı kontrol et
        if (course.students.includes(req.user.userId)) {
            return res.status(400).json({ message: 'Bu kursa zaten kayıtlısınız' });
        }

        // Ödeme kaydı oluştur (ücretli kurslar için)
        let paymentRecord = null;
        if (course.price > 0) {
            paymentRecord = new Payment({
                user: req.user.userId,
                course: course._id,
                amount: course.price,
                method: paymentMethod,
                status: paymentMethod === 'bank-transfer' ? 'pending' : 'completed',
                paymentData: paymentData,
                createdAt: new Date()
            });
            await paymentRecord.save();
        }

        // Kursa kayıt ol
        course.students.push(req.user.userId);
        await course.save();

        // Kullanıcının enrolledCourses listesini güncelle
        await User.findByIdAndUpdate(req.user.userId, {
            $push: { enrolledCourses: course._id }
        });

        // Progress kaydı oluştur
        const progress = new Progress({
            student: req.user.userId,
            course: course._id,
            totalLessons: course.lessons.length,
            completedLessons: [],
            progressPercentage: 0
        });
        await progress.save();

        let message = 'Kursa başarıyla kayıt oldunuz';
        if (paymentMethod === 'bank-transfer') {
            message = 'Kayıt işleminiz alındı. Havale/EFT işlemi sonrası dekont göndermeyi unutmayın.';
        } else if (paymentMethod === 'credit-card') {
            message = 'Ödeme başarılı! Kursa başarıyla kayıt oldunuz.';
        }

        res.json({ 
            message,
            paymentId: paymentRecord?._id,
            enrollmentStatus: paymentMethod === 'bank-transfer' ? 'pending_payment' : 'active'
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Ders tamamla
router.post('/:id/complete-lesson', auth, async (req, res) => {
    try {
        const { lessonIndex } = req.body;
        const Progress = require('../models/Progress');
        const Course = require('../models/Course');
        
        // Kursu al ve toplam ders sayısını kontrol et
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }
        
        let progress = await Progress.findOne({
            student: req.user.userId,
            course: req.params.id
        });

        if (!progress) {
            return res.status(404).json({ message: 'Bu kursa kayıtlı değilsiniz' });
        }

        // totalLessons değerini her zaman güncelle (kurs ders sayısı değişmiş olabilir)
        progress.totalLessons = course.lessons.length;

        // Ders zaten tamamlanmış mı kontrol et
        const alreadyCompleted = progress.completedLessons.some(
            lesson => lesson.lessonIndex === lessonIndex
        );

        if (!alreadyCompleted) {
            progress.completedLessons.push({
                lessonIndex,
                completedAt: new Date()
            });
        }
        
        progress.lastAccessedAt = new Date();
        await progress.save();

        res.json({ 
            message: alreadyCompleted ? 'Bu ders zaten tamamlanmış' : 'Ders tamamlandı',
            progressPercentage: progress.progressPercentage,
            completedLessons: progress.completedLessons.length,
            totalLessons: progress.totalLessons
        });
    } catch (error) {
        console.error('Ders tamamlama hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Soru sor
router.post('/:id/ask-question', auth, async (req, res) => {
    try {
        const { title, content, lesson } = req.body;
        const Question = require('../models/Question');
        
        const question = new Question({
            course: req.params.id,
            lesson,
            student: req.user.userId,
            title,
            content
        });

        await question.save();
        await question.populate('student', 'name email');

        res.status(201).json({ message: 'Soru gönderildi', question });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;