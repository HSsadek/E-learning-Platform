const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const Progress = require('../models/Progress');
const Question = require('../models/Question');
const Review = require('../models/Review');
const auth = require('../middleware/auth');

const router = express.Router();

// Öğrenci dashboard'u
router.get('/dashboard', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        // Öğrencinin kayıtlı olduğu kurslar
        const student = await User.findById(studentId)
            .populate({
                path: 'enrolledCourses',
                populate: {
                    path: 'instructor',
                    select: 'name email'
                }
            });

        if (!student) {
            return res.status(404).json({ message: 'Öğrenci bulunamadı' });
        }

        // Her kurs için ilerleme bilgisini al
        const coursesWithProgress = await Promise.all(
            student.enrolledCourses.map(async (course) => {
                const progress = await Progress.findOne({
                    student: studentId,
                    course: course._id
                });

                return {
                    ...course.toObject(),
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

        // İstatistikler
        const totalCourses = coursesWithProgress.length;
        const completedCourses = coursesWithProgress.filter(c => c.progress.progressPercentage === 100).length;
        const inProgressCourses = coursesWithProgress.filter(c => c.progress.progressPercentage > 0 && c.progress.progressPercentage < 100).length;
        const totalLessonsCompleted = coursesWithProgress.reduce((sum, c) => sum + c.progress.completedLessons, 0);

        // Son erişilen kurslar
        const recentCourses = coursesWithProgress
            .filter(c => c.progress.lastAccessedAt)
            .sort((a, b) => new Date(b.progress.lastAccessedAt) - new Date(a.progress.lastAccessedAt))
            .slice(0, 5);

        res.json({
            stats: {
                totalCourses,
                completedCourses,
                inProgressCourses,
                totalLessonsCompleted
            },
            courses: coursesWithProgress,
            recentCourses
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs detaylarını getir (öğrenci perspektifinden)
router.get('/courses/:id', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        const courseId = req.params.id;

        const course = await Course.findById(courseId)
            .populate('instructor', 'name email')
            .populate('students', 'name');

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }

        // Öğrenci bu kursa kayıtlı mı?
        const isEnrolled = course.students.some(student => student._id.toString() === studentId);

        let progress = null;
        let reviews = [];

        if (isEnrolled) {
            // İlerleme bilgisini al
            progress = await Progress.findOne({
                student: studentId,
                course: courseId
            });
        }

        // Kurs yorumlarını al
        reviews = await Review.find({ course: courseId })
            .populate('student', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        // Ortalama puan hesapla
        const averageRating = reviews.length > 0 
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
            : 0;

        res.json({
            course: {
                ...course.toObject(),
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount: reviews.length
            },
            isEnrolled,
            progress: progress ? {
                progressPercentage: progress.progressPercentage,
                completedLessons: progress.completedLessons,
                totalLessons: progress.totalLessons,
                lastAccessedAt: progress.lastAccessedAt
            } : null,
            reviews
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Ders içeriğini getir (sadece kayıtlı öğrenciler)
router.get('/courses/:id/lesson/:lessonIndex', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        const courseId = req.params.id;
        const lessonIndex = parseInt(req.params.lessonIndex);

        const course = await Course.findById(courseId)
            .populate('instructor', 'name email');

        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }

        // Öğrenci bu kursa kayıtlı mı?
        const isEnrolled = course.students.includes(studentId);
        if (!isEnrolled) {
            return res.status(403).json({ message: 'Bu kursa kayıtlı değilsiniz' });
        }

        // Ders var mı?
        if (lessonIndex < 0 || lessonIndex >= course.lessons.length) {
            return res.status(404).json({ message: 'Ders bulunamadı' });
        }

        const lesson = course.lessons[lessonIndex];

        // İlerleme bilgisini al
        const progress = await Progress.findOne({
            student: studentId,
            course: courseId
        });

        // Bu dersin sorularını al
        const questions = await Question.find({
            course: courseId,
            lesson: lessonIndex
        })
        .populate('student', 'name')
        .populate('answer.answeredBy', 'name')
        .sort({ createdAt: -1 });

        res.json({
            course: {
                _id: course._id,
                title: course.title,
                instructor: course.instructor,
                totalLessons: course.lessons.length
            },
            lesson: {
                ...lesson.toObject(),
                index: lessonIndex
            },
            progress: progress ? {
                progressPercentage: progress.progressPercentage,
                completedLessons: progress.completedLessons,
                isCompleted: progress.completedLessons.some(cl => cl.lessonIndex === lessonIndex)
            } : {
                progressPercentage: 0,
                completedLessons: [],
                isCompleted: false
            },
            questions,
            navigation: {
                previousLesson: lessonIndex > 0 ? lessonIndex - 1 : null,
                nextLesson: lessonIndex < course.lessons.length - 1 ? lessonIndex + 1 : null
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs arama
router.get('/search', async (req, res) => {
    try {
        const { q, category, level, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
        
        let query = { status: 'approved' };
        
        // Arama terimi
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } }
            ];
        }
        
        // Kategori filtresi
        if (category && category !== 'all') {
            query.category = { $regex: category, $options: 'i' };
        }
        
        // Seviye filtresi
        if (level && level !== 'all') {
            query.level = level;
        }
        
        // Fiyat filtresi
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined) query.price.$gte = parseFloat(minPrice);
            if (maxPrice !== undefined) query.price.$lte = parseFloat(maxPrice);
        }

        const courses = await Course.find(query)
            .populate('instructor', 'name email')
            .select('-lessons') // Ders içeriklerini gizle
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Course.countDocuments(query);

        // Her kurs için ortalama puan hesapla
        const coursesWithRatings = await Promise.all(
            courses.map(async (course) => {
                const reviews = await Review.find({ course: course._id });
                const averageRating = reviews.length > 0 
                    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
                    : 0;

                return {
                    ...course.toObject(),
                    averageRating: Math.round(averageRating * 10) / 10,
                    reviewCount: reviews.length
                };
            })
        );

        res.json({
            courses: coursesWithRatings,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs değerlendirmesi yap
router.post('/courses/:id/review', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const studentId = req.user.userId;
        const courseId = req.params.id;

        // Kurs var mı ve öğrenci kayıtlı mı?
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Kurs bulunamadı' });
        }

        const isEnrolled = course.students.includes(studentId);
        if (!isEnrolled) {
            return res.status(403).json({ message: 'Bu kursa kayıtlı değilsiniz' });
        }

        // Daha önce değerlendirme yapmış mı?
        const existingReview = await Review.findOne({
            course: courseId,
            student: studentId
        });

        if (existingReview) {
            // Mevcut değerlendirmeyi güncelle
            existingReview.rating = rating;
            existingReview.comment = comment;
            await existingReview.save();
            await existingReview.populate('student', 'name');
            
            res.json({ message: 'Değerlendirmeniz güncellendi', review: existingReview });
        } else {
            // Yeni değerlendirme oluştur
            const review = new Review({
                course: courseId,
                student: studentId,
                rating,
                comment
            });

            await review.save();
            await review.populate('student', 'name');
            
            res.status(201).json({ message: 'Değerlendirmeniz kaydedildi', review });
        }
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Öğrencinin sorularını getir
router.get('/my-questions', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        const questions = await Question.find({ student: studentId })
            .populate('course', 'title')
            .populate('answer.answeredBy', 'name')
            .sort({ createdAt: -1 });

        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Öğrencinin değerlendirmelerini getir
router.get('/my-reviews', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        const reviews = await Review.find({ student: studentId })
            .populate('course', 'title instructor')
            .populate('course.instructor', 'name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Kurs önerilerini getir
router.get('/recommendations', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        // Öğrencinin kayıtlı olduğu kursları al
        const student = await User.findById(studentId).populate('enrolledCourses', 'category level');
        
        if (!student || student.enrolledCourses.length === 0) {
            // Eğer hiç kursu yoksa popüler kursları öner
            const popularCourses = await Course.find({ status: 'approved' })
                .populate('instructor', 'name')
                .sort({ 'students.length': -1 })
                .limit(6);
            
            return res.json({ recommendations: popularCourses, reason: 'Popüler kurslar' });
        }

        // Öğrencinin ilgi alanlarını belirle
        const categories = [...new Set(student.enrolledCourses.map(c => c.category))];
        const levels = [...new Set(student.enrolledCourses.map(c => c.level))];
        
        // Benzer kategorilerdeki kursları öner
        const recommendations = await Course.find({
            status: 'approved',
            _id: { $nin: student.enrolledCourses.map(c => c._id) }, // Zaten kayıtlı olduğu kursları hariç tut
            $or: [
                { category: { $in: categories } },
                { level: { $in: levels } }
            ]
        })
        .populate('instructor', 'name')
        .limit(6);

        res.json({ recommendations, reason: 'İlgi alanlarınıza göre' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;