const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');
const Category = require('./models/Category');
const Announcement = require('./models/Announcement');
const Question = require('./models/Question');
const Progress = require('./models/Progress');
const Review = require('./models/Review');

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch((err) => console.error('MongoDB bağlantı hatası:', err));

const seedData = async () => {
    try {
        // Mevcut verileri temizle
        await User.deleteMany({});
        await Course.deleteMany({});
        await Category.deleteMany({});
        await Announcement.deleteMany({});
        await Question.deleteMany({});
        await Progress.deleteMany({});
        await Review.deleteMany({});
        console.log('Mevcut veriler temizlendi');

        // Test kullanıcıları oluştur
        const hashedPassword = await bcrypt.hash('123456', 12);

        const users = await User.insertMany([
            {
                name: 'Admin User',
                email: 'admin@test.com',
                password: hashedPassword,
                role: 'admin'
            },
            {
                name: 'Ahmet Yılmaz',
                email: 'ahmet@test.com',
                password: hashedPassword,
                role: 'teacher'
            },
            {
                name: 'Ayşe Demir',
                email: 'ayse@test.com',
                password: hashedPassword,
                role: 'teacher'
            },
            {
                name: 'Mehmet Kaya',
                email: 'mehmet@test.com',
                password: hashedPassword,
                role: 'student'
            },
            {
                name: 'Fatma Özkan',
                email: 'fatma@test.com',
                password: hashedPassword,
                role: 'student'
            },
            {
                name: 'Ali Çelik',
                email: 'ali@test.com',
                password: hashedPassword,
                role: 'student'
            },
            {
                name: 'Zeynep Kara',
                email: 'zeynep@test.com',
                password: hashedPassword,
                role: 'pending_teacher',
                teacherApplication: {
                    status: 'pending',
                    appliedAt: new Date()
                }
            }
        ]);

        console.log('Test kullanıcıları oluşturuldu');

        // Öğretmenleri bul
        const teacher1 = users.find(u => u.email === 'ahmet@test.com');
        const teacher2 = users.find(u => u.email === 'ayse@test.com');
        const students = users.filter(u => u.role === 'student');

        // Test kursları oluştur
        const courses = await Course.insertMany([
            {
                title: 'JavaScript Temelleri',
                description: 'Sıfırdan JavaScript öğrenin. Değişkenler, fonksiyonlar, döngüler ve daha fazlası.',
                instructor: teacher1._id,
                category: 'Programlama',
                level: 'beginner',
                duration: 480, // 8 saat
                price: 0,
                status: 'approved',
                students: [students[0]._id, students[1]._id],
                lessons: [
                    {
                        title: 'JavaScript Nedir?',
                        content: 'JavaScript programlama diline giriş',
                        duration: 30
                    },
                    {
                        title: 'Değişkenler ve Veri Tipleri',
                        content: 'JavaScript\'te değişken tanımlama ve veri tipleri',
                        duration: 45
                    },
                    {
                        title: 'Fonksiyonlar',
                        content: 'JavaScript fonksiyonları nasıl yazılır',
                        duration: 60
                    }
                ]
            },
            {
                title: 'React.js ile Modern Web Geliştirme',
                description: 'React.js kullanarak modern web uygulamaları geliştirmeyi öğrenin.',
                instructor: teacher1._id,
                category: 'Programlama',
                level: 'intermediate',
                duration: 720, // 12 saat
                price: 299,
                status: 'approved',
                students: [students[0]._id],
                lessons: [
                    {
                        title: 'React Nedir?',
                        content: 'React kütüphanesine giriş',
                        duration: 45
                    },
                    {
                        title: 'Componentler',
                        content: 'React componentleri nasıl oluşturulur',
                        duration: 60
                    },
                    {
                        title: 'State ve Props',
                        content: 'React\'te state yönetimi ve props kullanımı',
                        duration: 90
                    }
                ]
            },
            {
                title: 'Node.js Backend Geliştirme',
                description: 'Node.js ve Express.js ile backend API geliştirmeyi öğrenin.',
                instructor: teacher2._id,
                category: 'Programlama',
                level: 'intermediate',
                duration: 600, // 10 saat
                price: 399,
                status: 'pending', // Bu kurs onay bekliyor
                students: [students[1]._id, students[2]._id],
                lessons: [
                    {
                        title: 'Node.js Kurulumu',
                        content: 'Node.js kurulumu ve temel kavramlar',
                        duration: 30
                    },
                    {
                        title: 'Express.js ile API Oluşturma',
                        content: 'Express.js kullanarak REST API geliştirme',
                        duration: 90
                    },
                    {
                        title: 'MongoDB Entegrasyonu',
                        content: 'MongoDB ile veri tabanı işlemleri',
                        duration: 120
                    }
                ]
            },
            {
                title: 'Python Programlama',
                description: 'Python programlama dilini sıfırdan öğrenin.',
                instructor: teacher2._id,
                category: 'Programlama',
                level: 'beginner',
                duration: 540, // 9 saat
                price: 0,
                status: 'approved',
                students: [students[0]._id, students[2]._id],
                lessons: [
                    {
                        title: 'Python Kurulumu',
                        content: 'Python kurulumu ve IDE seçimi',
                        duration: 30
                    },
                    {
                        title: 'Değişkenler ve Veri Tipleri',
                        content: 'Python\'da değişkenler ve veri tipleri',
                        duration: 60
                    },
                    {
                        title: 'Döngüler ve Koşullar',
                        content: 'Python\'da kontrol yapıları',
                        duration: 90
                    }
                ]
            },
            {
                title: 'Veri Bilimi ile Python',
                description: 'Python kullanarak veri analizi ve makine öğrenmesi.',
                instructor: teacher2._id,
                category: 'Veri Bilimi',
                level: 'advanced',
                duration: 900, // 15 saat
                price: 599,
                status: 'pending', // Bu kurs da onay bekliyor
                students: [],
                lessons: [
                    {
                        title: 'Pandas Kütüphanesi',
                        content: 'Pandas ile veri manipülasyonu',
                        duration: 120
                    },
                    {
                        title: 'NumPy ile Sayısal İşlemler',
                        content: 'NumPy kütüphanesi kullanımı',
                        duration: 90
                    },
                    {
                        title: 'Matplotlib ile Görselleştirme',
                        content: 'Veri görselleştirme teknikleri',
                        duration: 120
                    }
                ]
            },
            {
                title: 'HTML ve CSS Temelleri',
                description: 'Web tasarımının temellerini öğrenin.',
                instructor: teacher1._id,
                category: 'Web Tasarım',
                level: 'beginner',
                duration: 360, // 6 saat
                price: 0,
                status: 'approved',
                students: [students[1]._id, students[2]._id],
                lessons: [
                    {
                        title: 'HTML Temelleri',
                        content: 'HTML etiketleri ve yapısı',
                        duration: 90
                    },
                    {
                        title: 'CSS ile Stil Verme',
                        content: 'CSS ile web sayfası tasarımı',
                        duration: 120
                    },
                    {
                        title: 'Responsive Tasarım',
                        content: 'Mobil uyumlu web tasarımı',
                        duration: 90
                    }
                ]
            },
            {
                title: 'Vue.js ile SPA Geliştirme',
                description: 'Vue.js kullanarak Single Page Application geliştirmeyi öğrenin.',
                instructor: teacher1._id,
                category: 'Programlama',
                level: 'intermediate',
                duration: 540, // 9 saat
                price: 199,
                status: 'draft', // Taslak kurs
                students: [],
                lessons: [
                    {
                        title: 'Vue.js Giriş',
                        content: 'Vue.js framework\'üne giriş',
                        duration: 60
                    },
                    {
                        title: 'Component Yapısı',
                        content: 'Vue.js componentleri',
                        duration: 90
                    }
                ]
            },
            {
                title: 'MongoDB Veritabanı Yönetimi',
                description: 'NoSQL veritabanı MongoDB\'yi öğrenin.',
                instructor: teacher2._id,
                category: 'Veritabanı',
                level: 'intermediate',
                duration: 420, // 7 saat
                price: 149,
                status: 'rejected', // Reddedilmiş kurs
                rejectionReason: 'Kurs içeriği yetersiz, daha detaylı örnekler eklenmelidir.',
                students: [],
                lessons: [
                    {
                        title: 'MongoDB Kurulumu',
                        content: 'MongoDB kurulumu ve yapılandırması',
                        duration: 45
                    }
                ]
            }
        ]);

        console.log('Test kursları oluşturuldu');

        // Kullanıcıların enrolledCourses alanını güncelle
        for (let student of students) {
            const studentCourses = courses.filter(course => 
                course.students.includes(student._id)
            );
            
            await User.findByIdAndUpdate(student._id, {
                enrolledCourses: studentCourses.map(c => c._id)
            });
        }

        console.log('Kullanıcı kurs kayıtları güncellendi');

        // Kategoriler oluştur
        const categories = await Category.insertMany([
            {
                name: 'Programlama',
                description: 'Yazılım geliştirme ve programlama dilleri',
                icon: 'fas fa-code'
            },
            {
                name: 'Web Tasarım',
                description: 'Web sitesi tasarımı ve frontend geliştirme',
                icon: 'fas fa-paint-brush'
            },
            {
                name: 'Veri Bilimi',
                description: 'Veri analizi, makine öğrenmesi ve yapay zeka',
                icon: 'fas fa-chart-bar'
            },
            {
                name: 'Mobil Uygulama',
                description: 'iOS ve Android uygulama geliştirme',
                icon: 'fas fa-mobile-alt'
            },
            {
                name: 'Pazarlama',
                description: 'Dijital pazarlama ve sosyal medya',
                icon: 'fas fa-bullhorn'
            }
        ]);

        console.log('Kategoriler oluşturuldu');

        // Admin kullanıcısını bul
        const admin = users.find(u => u.role === 'admin');

        // Duyurular oluştur
        const announcements = await Announcement.insertMany([
            {
                title: 'Hoş Geldiniz!',
                content: 'Online Okul Sistemimize hoş geldiniz. Kaliteli eğitimler için doğru yerdesiniz.',
                type: 'success',
                targetAudience: 'all',
                createdBy: admin._id
            },
            {
                title: 'Sistem Bakımı',
                content: 'Bu pazar günü saat 02:00-04:00 arası sistem bakımı yapılacaktır.',
                type: 'warning',
                targetAudience: 'all',
                createdBy: admin._id
            },
            {
                title: 'Yeni Kurs Onay Süreci',
                content: 'Eğitmenlerimize duyurulur: Yeni kurslarınız admin onayından sonra yayına alınacaktır.',
                type: 'info',
                targetAudience: 'teachers',
                createdBy: admin._id
            }
        ]);

        console.log('Duyurular oluşturuldu');

        // Test soruları oluştur
        const approvedCourses = courses.filter(c => c.status === 'approved');
        const questions = await Question.insertMany([
            {
                course: approvedCourses[0]._id, // JavaScript Temelleri
                lesson: 0,
                student: students[0]._id,
                title: 'Değişken tanımlama hakkında',
                content: 'JavaScript\'te let ve var arasındaki fark nedir?'
            },
            {
                course: approvedCourses[0]._id, // JavaScript Temelleri
                lesson: 1,
                student: students[1]._id,
                title: 'Fonksiyon kullanımı',
                content: 'Arrow function ile normal function arasındaki fark nedir?',
                answer: {
                    content: 'Arrow function\'lar daha kısa syntax\'a sahiptir ve this binding\'i farklıdır.',
                    answeredBy: teacher1._id,
                    answeredAt: new Date()
                },
                isAnswered: true
            },
            {
                course: approvedCourses[2]._id, // Python Programlama
                lesson: 0,
                student: students[2]._id,
                title: 'Python kurulumu',
                content: 'Python\'u Mac\'e nasıl kurabilirim?'
            }
        ]);

        console.log('Test soruları oluşturuldu');

        // Progress kayıtları oluştur
        const progressRecords = [];
        for (const course of approvedCourses) {
            for (const studentId of course.students) {
                progressRecords.push({
                    student: studentId,
                    course: course._id,
                    totalLessons: course.lessons.length,
                    completedLessons: [
                        { lessonIndex: 0, completedAt: new Date() }
                    ],
                    progressPercentage: Math.round((1 / course.lessons.length) * 100),
                    lastAccessedAt: new Date()
                });
            }
        }

        await Progress.insertMany(progressRecords);
        console.log('Progress kayıtları oluşturuldu');

        // Test değerlendirmeleri oluştur
        const reviews = await Review.insertMany([
            {
                course: approvedCourses[0]._id, // JavaScript Temelleri
                student: students[0]._id,
                rating: 5,
                comment: 'Harika bir kurs! JavaScript\'i çok iyi öğrettiniz.'
            },
            {
                course: approvedCourses[0]._id, // JavaScript Temelleri
                student: students[1]._id,
                rating: 4,
                comment: 'Güzel anlatım, örnekler çok faydalıydı.'
            },
            {
                course: approvedCourses[1]._id, // React.js
                student: students[0]._id,
                rating: 5,
                comment: 'React\'i bu kadar kolay öğreneceğimi düşünmemiştim!'
            },
            {
                course: approvedCourses[2]._id, // Python
                student: students[2]._id,
                rating: 4,
                comment: 'Python\'a giriş için mükemmel bir kurs.'
            }
        ]);

        console.log('Test değerlendirmeleri oluşturuldu');

        console.log('\n=== TEST VERİLERİ BAŞARIYLA OLUŞTURULDU ===');
        console.log('\nTest Kullanıcıları:');
        console.log('Admin: admin@test.com / 123456');
        console.log('Öğretmen 1: ahmet@test.com / 123456');
        console.log('Öğretmen 2: ayse@test.com / 123456');
        console.log('Öğrenci 1: mehmet@test.com / 123456');
        console.log('Öğrenci 2: fatma@test.com / 123456');
        console.log('Öğrenci 3: ali@test.com / 123456');
        console.log('\nToplam Kurs Sayısı:', courses.length);
        console.log('Toplam Kullanıcı Sayısı:', users.length);
        console.log('Toplam Kategori Sayısı:', categories.length);
        console.log('Toplam Duyuru Sayısı:', announcements.length);
        console.log('Toplam Soru Sayısı:', questions.length);
        console.log('Toplam Progress Kaydı:', progressRecords.length);
        console.log('Toplam Değerlendirme Sayısı:', reviews.length);
        console.log('\nÖnemli: 2 kurs onay bekliyor (Node.js ve Veri Bilimi)');
        console.log('1 taslak kurs var (Vue.js)');
        console.log('1 reddedilmiş kurs var (MongoDB)');
        console.log('4 kurs değerlendirmesi var');
        console.log('1 öğretmen başvurusu bekliyor (Zeynep Kara)');

    } catch (error) {
        console.error('Seed işlemi sırasında hata:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedData();