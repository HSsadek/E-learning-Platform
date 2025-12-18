const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const Progress = require('../models/Progress');
const Question = require('../models/Question');
const teacherAuth = require('../middleware/teacherAuth');

const router = express.Router();

// Öğretmen dashboard'u
router.get('/dashboard', teacherAuth, async (req, res) => {
    try {
        const teacherId = req.user.userId;
        
        // Öğretmenin kursları
        const courses = await Course.find({ instructor: teacherId });
        const courseIds = courses.map(c => c._id);
        
        // İstatistikler
        const totalCourses = courses.length;
        const approvedCourses = courses.filter(c => c.status === 'approved').length;
        const pendingCourses = courses.filter(c => c.status === 'pending').length;
        const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
        
        // Toplam gelir
        const totalRevenue = courses.reduce((sum, course) => {
            return sum + (course.price * course.students.length);
        }, 0);
        
        // Son sorular
        const recentQuestions = await Question.find({ 
            course: { $in: courseIds },
            isAnswered: false 
        })
        .populate('student', 'name email')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(5);
        
        // En popüler kurslar
        const popularCourses = courses
            .sort((a, b) => b.students.length - a.students.length)
            .slice(0, 5);

        res.json({
            stats: {
                totalCourses,
                approvedCourses,
                pendingCourses,
                totalStudents,
                totalRevenue
            },
            recentQuestions,
            popularCourses
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Öğretmenin kurslarını listele
router.get('/courses', teacherAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const teacherId = req.user.userId;
        
        let query = { instructor: teacherId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const courses = await Course.find(query)
            .populate('students', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Course.countDocuments(query);

        res.json({
            courses,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Yeni kurs oluştur
router.post('/courses', teacherAuth, async (req, res) => {
    try {
        const course = new Course({
            ...req.body,
            instructor: req.user.userId,
            status: 'draft' // Başlangıçta taslak olarak oluştur
        });

        await course.save();
        await course.populate('instructor', 'name email');
        
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs güncelle
router.put('/courses/:id', teacherAuth, async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.id, 
            instructor: req.user.userId 
        });

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı veya yetkiniz yok' });
        }

        // Onaylanmış kurslar sadece belirli alanları güncelleyebilir
        if (course.status === 'approved') {
            const allowedFields = ['description', 'lessons'];
            const updates = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });
            Object.assign(course, updates);
        } else {
            Object.assign(course, req.body);
        }

        await course.save();
        await course.populate('instructor', 'name email');
        
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kursu onaya gönder
router.put('/courses/:id/submit', teacherAuth, async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.id, 
            instructor: req.user.userId 
        });

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı veya yetkiniz yok' });
        }

        if (course.status !== 'draft') {
            return res.status(400).json({ message: 'Sadece taslak kurslar onaya gönderilebilir' });
        }

        course.status = 'pending';
        await course.save();
        
        res.json({ message: 'Kurs onaya gönderildi', course });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs öğrencilerini ve ilerlemelerini getir
router.get('/courses/:id/students', teacherAuth, async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.id, 
            instructor: req.user.userId 
        }).populate('students', 'name email createdAt');

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı veya yetkiniz yok' });
        }

        // Öğrenci ilerlemelerini getir
        const studentsWithProgress = await Promise.all(
            course.students.map(async (student) => {
                const progress = await Progress.findOne({
                    student: student._id,
                    course: course._id
                });

                return {
                    ...student.toObject(),
                    progress: progress ? {
                        progressPercentage: progress.progressPercentage,
                        completedLessons: progress.completedLessons.length,
                        totalLessons: progress.totalLessons,
                        lastAccessedAt: progress.lastAccessedAt
                    } : {
                        progressPercentage: 0,
                        completedLessons: 0,
                        totalLessons: course.lessons.length,
                        lastAccessedAt: null
                    }
                };
            })
        );

        res.json({
            course: {
                _id: course._id,
                title: course.title,
                totalStudents: course.students.length
            },
            students: studentsWithProgress
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs sorularını getir
router.get('/courses/:id/questions', teacherAuth, async (req, res) => {
    try {
        const { answered = 'all' } = req.query;
        
        const course = await Course.findOne({ 
            _id: req.params.id, 
            instructor: req.user.userId 
        });

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı veya yetkiniz yok' });
        }

        let query = { course: req.params.id };
        if (answered === 'true') {
            query.isAnswered = true;
        } else if (answered === 'false') {
            query.isAnswered = false;
        }

        const questions = await Question.find(query)
            .populate('student', 'name email')
            .populate('answer.answeredBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Soruyu yanıtla
router.put('/questions/:id/answer', teacherAuth, async (req, res) => {
    try {
        const { content } = req.body;
        
        const question = await Question.findById(req.params.id)
            .populate('course', 'instructor');

        if (!question) {
            return res.status(404).json({ message: 'Soru bulunamadı' });
        }

        // Sadece kurs sahibi yanıtlayabilir
        if (question.course.instructor.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Bu soruyu yanıtlama yetkiniz yok' });
        }

        question.answer = {
            content,
            answeredBy: req.user.userId,
            answeredAt: new Date()
        };
        question.isAnswered = true;

        await question.save();
        await question.populate('answer.answeredBy', 'name email');
        
        res.json({ message: 'Soru yanıtlandı', question });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs duyurusu gönder
router.post('/courses/:id/announcement', teacherAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        
        const course = await Course.findOne({ 
            _id: req.params.id, 
            instructor: req.user.userId 
        }).populate('students', 'name email');

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı veya yetkiniz yok' });
        }

        // Burada gerçek bir uygulamada email/bildirim servisi kullanılır
        // Şimdilik sadece başarı mesajı döndürüyoruz
        
        res.json({ 
            message: `"${title}" başlıklı duyuru ${course.students.length} öğrenciye gönderildi`,
            recipients: course.students.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Gelir analizi
router.get('/earnings', teacherAuth, async (req, res) => {
    try {
        const teacherId = req.user.userId;
        
        const courses = await Course.find({ 
            instructor: teacherId,
            status: 'approved'
        });

        const earnings = courses.map(course => ({
            courseId: course._id,
            title: course.title,
            price: course.price,
            studentsCount: course.students.length,
            totalRevenue: course.price * course.students.length,
            platformFee: (course.price * course.students.length) * 0.1, // %10 komisyon
            netEarning: (course.price * course.students.length) * 0.9
        }));

        const totalRevenue = earnings.reduce((sum, e) => sum + e.totalRevenue, 0);
        const totalPlatformFee = earnings.reduce((sum, e) => sum + e.platformFee, 0);
        const totalNetEarning = earnings.reduce((sum, e) => sum + e.netEarning, 0);

        res.json({
            summary: {
                totalRevenue,
                totalPlatformFee,
                totalNetEarning,
                coursesCount: courses.length
            },
            courseEarnings: earnings
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;