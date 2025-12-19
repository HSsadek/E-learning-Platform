// Öğrenci Dashboard yükleme
async function loadStudentDashboard() {
    if (!authToken || (currentUser.role !== 'student' && currentUser.role !== 'admin')) {
        showAlert('Öğrenci yetkisi gereklidir!', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateStudentDashboardStats(data.stats);
            updateStudentRecentActivities(data);
        }
    } catch (error) {
        console.error('Öğrenci dashboard yüklenirken hata:', error);
    }
}

// Öğrenci dashboard istatistiklerini güncelle
function updateStudentDashboardStats(stats) {
    document.getElementById('studentTotalCourses').textContent = stats.totalCourses;
    document.getElementById('studentCompletedCourses').textContent = stats.completedCourses;
    document.getElementById('studentInProgressCourses').textContent = stats.inProgressCourses;
    document.getElementById('studentTotalLessons').textContent = stats.totalLessonsCompleted;
}

// Öğrenci son aktiviteleri güncelle
function updateStudentRecentActivities(data) {
    const recentCoursesDiv = document.getElementById('studentRecentCourses');
    const progressOverviewDiv = document.getElementById('studentProgressOverview');

    // Son erişilen kurslar
    if (data.recentCourses.length === 0) {
        recentCoursesDiv.innerHTML = '<p class="text-muted">Henüz kurs erişimi yok</p>';
    } else {
        recentCoursesDiv.innerHTML = data.recentCourses.map(course => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${course.title}</strong><br>
                    <small class="text-muted">
                        Son erişim: ${new Date(course.progress.lastAccessedAt).toLocaleDateString('tr-TR')}
                    </small>
                </div>
                <button class="btn btn-sm btn-primary" onclick="continueCourse('${course._id}')">
                    Devam Et
                </button>
            </div>
        `).join('');
    }

    // İlerleme genel bakış
    if (data.courses.length === 0) {
        progressOverviewDiv.innerHTML = '<p class="text-muted">Henüz kurs kaydınız yok</p>';
    } else {
        progressOverviewDiv.innerHTML = data.courses.slice(0, 3).map(course => `
            <div class="mb-3">
                <div class="d-flex justify-content-between">
                    <span>${course.title}</span>
                    <span>${course.progress.progressPercentage}%</span>
                </div>
                <div class="progress">
                    <div class="progress-bar" style="width: ${course.progress.progressPercentage}%"></div>
                </div>
            </div>
        `).join('');
    }
}

// Öğrenci kurslarını yükle
async function loadStudentCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayStudentCourses(data.courses);
        }
    } catch (error) {
        console.error('Öğrenci kursları yüklenirken hata:', error);
    }
}

// Öğrenci kurslarını göster
function displayStudentCourses(courses) {
    const content = document.getElementById('studentCoursesContent');
    
    if (courses.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Henüz hiçbir kursa kayıt olmadınız. <a href="#" onclick="showPage(\'courses\')">Kursları keşfedin!</a></div>';
        return;
    }

    content.innerHTML = courses.map(course => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5>${course.title}</h5>
                        <p class="text-muted">${course.description}</p>
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="fas fa-user"></i> ${course.instructor.name} |
                                <i class="fas fa-clock"></i> ${course.duration} dakika |
                                <i class="fas fa-users"></i> ${course.students.length} öğrenci
                            </small>
                        </div>
                        <div class="progress mb-2">
                            <div class="progress-bar ${course.progress.progressPercentage === 100 ? 'bg-success' : ''}" 
                                 style="width: ${course.progress.progressPercentage}%">
                                ${course.progress.progressPercentage}%
                            </div>
                        </div>
                        <small class="text-muted">
                            ${course.progress.completedLessons}/${course.progress.totalLessons} ders tamamlandı
                            ${course.progress.lastAccessedAt ? 
                                ` | Son erişim: ${new Date(course.progress.lastAccessedAt).toLocaleDateString('tr-TR')}` : 
                                ''
                            }
                        </small>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-primary mb-2" onclick="continueCourse('${course._id}')">
                            ${course.progress.progressPercentage === 0 ? 'Başla' : 'Devam Et'}
                        </button><br>
                        <button class="btn btn-outline-info btn-sm mb-2" onclick="showCourseDetail('${course._id}')">
                            Detaylar
                        </button><br>
                        ${course.progress.progressPercentage > 0 ? `
                            <button class="btn btn-outline-warning btn-sm" onclick="reviewCourse('${course._id}')">
                                Değerlendir
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Kurs detayını göster
async function showCourseDetail(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/student/courses/${courseId}`, {
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`
            } : {}
        });

        if (response.ok) {
            const data = await response.json();
            displayCourseDetail(data);
            showPage('courseDetail');
        }
    } catch (error) {
        console.error('Kurs detayı yüklenirken hata:', error);
    }
}

// Kurs detayını göster
function displayCourseDetail(data) {
    const content = document.getElementById('courseDetailContent');
    const course = data.course;
    
    content.innerHTML = `
        <div class="row">
            <div class="col-12">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="#" onclick="showPage('courses')">Kurslar</a></li>
                        <li class="breadcrumb-item active">${course.title}</li>
                    </ol>
                </nav>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <h1>${course.title}</h1>
                <p class="lead">${course.description}</p>
                
                <div class="mb-3">
                    <span class="badge bg-${getLevelBadgeColor(course.level)}">${getLevelText(course.level)}</span>
                    <span class="badge bg-secondary">${course.category}</span>
                    ${course.averageRating > 0 ? `
                        <span class="badge bg-warning text-dark">
                            ${generateStars(course.averageRating)} ${course.averageRating}
                        </span>
                    ` : ''}
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <p><i class="fas fa-user"></i> <strong>Eğitmen:</strong> ${course.instructor.name}</p>
                        <p><i class="fas fa-clock"></i> <strong>Süre:</strong> ${course.duration} dakika</p>
                    </div>
                    <div class="col-md-6">
                        <p><i class="fas fa-users"></i> <strong>Öğrenci:</strong> ${course.students.length} kişi</p>
                        <p><i class="fas fa-play-circle"></i> <strong>Ders:</strong> ${course.lessons.length} adet</p>
                    </div>
                </div>
                
                ${data.isEnrolled && data.progress ? `
                    <div class="alert alert-success">
                        <h6>İlerleme Durumunuz</h6>
                        <div class="progress mb-2">
                            <div class="progress-bar" style="width: ${data.progress.progressPercentage}%">
                                ${data.progress.progressPercentage}%
                            </div>
                        </div>
                        <small>${data.progress.completedLessons.length}/${data.progress.totalLessons} ders tamamlandı</small>
                    </div>
                ` : ''}
                
                <h4>Müfredat</h4>
                <div class="list-group mb-4">
                    ${course.lessons.map((lesson, index) => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${lesson.title}</h6>
                                <small class="text-muted">${lesson.duration} dakika</small>
                            </div>
                            ${data.isEnrolled ? `
                                <div>
                                    ${data.progress && data.progress.completedLessons.some(cl => cl.lessonIndex === index) ? 
                                        '<i class="fas fa-check-circle text-success"></i>' : 
                                        '<i class="far fa-circle text-muted"></i>'
                                    }
                                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="startLesson('${course._id}', ${index})">
                                        ${data.progress && data.progress.completedLessons.some(cl => cl.lessonIndex === index) ? 'Tekrar İzle' : 'İzle'}
                                    </button>
                                </div>
                            ` : '<i class="fas fa-lock text-muted"></i>'}
                        </div>
                    `).join('')}
                </div>
                
                <h4>Değerlendirmeler</h4>
                <div id="courseReviews">
                    ${data.reviews.length === 0 ? 
                        '<p class="text-muted">Henüz değerlendirme yapılmamış.</p>' :
                        data.reviews.map(review => `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <strong>${review.student.name}</strong>
                                        <div>
                                            ${generateStars(review.rating)}
                                            <small class="text-muted">${new Date(review.createdAt).toLocaleDateString('tr-TR')}</small>
                                        </div>
                                    </div>
                                    <p class="mt-2">${review.comment}</p>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h3 class="text-primary">${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</h3>
                        
                        ${data.isEnrolled ? `
                            <button class="btn btn-success btn-lg w-100 mb-2" onclick="continueCourse('${course._id}')">
                                <i class="fas fa-play"></i> ${data.progress && data.progress.progressPercentage > 0 ? 'Devam Et' : 'Başla'}
                            </button>
                            ${data.progress && data.progress.progressPercentage > 0 ? `
                                <button class="btn btn-outline-warning w-100" onclick="reviewCourse('${course._id}')">
                                    <i class="fas fa-star"></i> Değerlendir
                                </button>
                            ` : ''}
                        ` : currentUser ? `
                            <button class="btn btn-primary btn-lg w-100" onclick="enrollCourse('${course._id}')">
                                <i class="fas fa-plus"></i> Kursa Kayıt Ol
                            </button>
                        ` : `
                            <button class="btn btn-outline-primary btn-lg w-100" onclick="showPage('login')">
                                Kayıt için giriş yapın
                            </button>
                        `}
                        
                        <hr>
                        <div class="text-start">
                            <p><i class="fas fa-infinity"></i> Sınırsız erişim</p>
                            <p><i class="fas fa-mobile-alt"></i> Mobil uyumlu</p>
                            <p><i class="fas fa-certificate"></i> Tamamlama sertifikası</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Kursa devam et
async function continueCourse(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/student/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (!data.isEnrolled) {
                showAlert('Bu kursa kayıtlı değilsiniz!', 'warning');
                return;
            }

            // Debug: Kurs lesson'larını kontrol et (geliştirme amaçlı)
            if (window.location.hostname === 'localhost') {
                console.log('🔍 Kurs Lesson Debug:', {
                    courseTitle: data.course.title,
                    totalLessons: data.course.lessons.length,
                    lessons: data.course.lessons.map((lesson, index) => ({
                        index,
                        title: lesson.title,
                        hasVideoUrl: !!lesson.videoUrl,
                        videoUrl: lesson.videoUrl
                    }))
                });
            }

            // Son kaldığı dersi bul veya ilk dersi başlat
            let nextLessonIndex = 0;
            if (data.progress && data.progress.completedLessons.length > 0) {
                const lastCompletedIndex = Math.max(...data.progress.completedLessons.map(cl => cl.lessonIndex));
                nextLessonIndex = Math.min(lastCompletedIndex + 1, data.course.lessons.length - 1);
            }

            startLesson(courseId, nextLessonIndex);
        }
    } catch (error) {
        console.error('Kurs devam etme hatası:', error);
    }
}

// Ders başlat
async function startLesson(courseId, lessonIndex) {
    try {
        const response = await fetch(`${API_BASE_URL}/student/courses/${courseId}/lesson/${lessonIndex}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayLesson(data);
            showPage('lesson');
        } else {
            const error = await response.json();
            showAlert(error.message, 'danger');
        }
    } catch (error) {
        console.error('Ders yükleme hatası:', error);
    }
}

// Ders gösterimi
function displayLesson(data) {
    const content = document.getElementById('lessonContent');
    const course = data.course;
    const lesson = data.lesson;
    
    content.innerHTML = `
        <div class="row">
            <div class="col-12">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="#" onclick="showPage('student')">Öğrenim</a></li>
                        <li class="breadcrumb-item"><a href="#" onclick="showCourseDetail('${course._id}')">${course.title}</a></li>
                        <li class="breadcrumb-item active">${lesson.title}</li>
                    </ol>
                </nav>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5>${lesson.title}</h5>
                        <div>
                            ${data.navigation.previousLesson !== null ? `
                                <button class="btn btn-outline-secondary btn-sm" onclick="startLesson('${course._id}', ${data.navigation.previousLesson})">
                                    <i class="fas fa-chevron-left"></i> Önceki
                                </button>
                            ` : ''}
                            ${data.navigation.nextLesson !== null ? `
                                <button class="btn btn-outline-secondary btn-sm" onclick="startLesson('${course._id}', ${data.navigation.nextLesson})">
                                    Sonraki <i class="fas fa-chevron-right"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="card-body">
                        ${lesson.videoUrl ? `
                            <div class="ratio ratio-16x9 mb-3">
                                <iframe src="${convertToEmbedUrl(lesson.videoUrl)}" allowfullscreen frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
                            </div>
                        ` : `
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle"></i> Bu ders için video içeriği henüz eklenmemiş.
                            </div>
                        `}
                        
                        <div class="lesson-content">
                            <h6>Ders İçeriği</h6>
                            <p>${lesson.content || 'İçerik henüz eklenmemiş.'}</p>
                        </div>
                        
                        <div class="lesson-actions mt-4">
                            ${!data.progress.isCompleted ? `
                                <button class="btn btn-success" onclick="completeLesson('${course._id}', ${lesson.index})">
                                    <i class="fas fa-check"></i> Dersi Tamamla
                                </button>
                            ` : `
                                <span class="badge bg-success">
                                    <i class="fas fa-check"></i> Tamamlandı
                                </span>
                            `}
                            <button class="btn btn-outline-primary ms-2" onclick="askQuestion('${course._id}', ${lesson.index})">
                                <i class="fas fa-question"></i> Soru Sor
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Sorular Bölümü -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h6>Bu Dersle İlgili Sorular</h6>
                    </div>
                    <div class="card-body">
                        ${data.questions.length === 0 ? 
                            '<p class="text-muted">Bu ders için henüz soru sorulmamış.</p>' :
                            data.questions.map(question => `
                                <div class="card mb-2">
                                    <div class="card-body">
                                        <h6>${question.title}</h6>
                                        <p>${question.content}</p>
                                        <small class="text-muted">
                                            ${question.student.name} - ${new Date(question.createdAt).toLocaleDateString('tr-TR')}
                                        </small>
                                        ${question.isAnswered ? `
                                            <div class="mt-2 p-2 bg-light rounded">
                                                <strong>Yanıt:</strong><br>
                                                ${question.answer.content}
                                                <br><small class="text-muted">
                                                    ${question.answer.answeredBy.name} - ${new Date(question.answer.answeredAt).toLocaleDateString('tr-TR')}
                                                </small>
                                            </div>
                                        ` : '<div class="mt-2"><span class="badge bg-warning">Yanıt bekleniyor</span></div>'}
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h6>Kurs İlerlemesi</h6>
                    </div>
                    <div class="card-body">
                        <div class="progress mb-2">
                            <div class="progress-bar" style="width: ${data.progress.progressPercentage}%">
                                ${data.progress.progressPercentage}%
                            </div>
                        </div>
                        <small class="text-muted">
                            ${data.progress.completedLessons.length}/${course.totalLessons} ders tamamlandı
                        </small>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h6>Eğitmen</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>${course.instructor.name}</strong></p>
                        <p class="text-muted">${course.instructor.email}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Dersi tamamla
async function completeLesson(courseId, lessonIndex) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/complete-lesson`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ lessonIndex })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            // Sayfayı yenile
            startLesson(courseId, lessonIndex);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Soru sor
function askQuestion(courseId, lessonIndex) {
    document.getElementById('questionCourseId').value = courseId;
    document.getElementById('questionLessonIndex').value = lessonIndex;
    new bootstrap.Modal(document.getElementById('askQuestionModal')).show();
}

// Soru gönderme
document.getElementById('askQuestionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const courseId = document.getElementById('questionCourseId').value;
    const lessonIndex = parseInt(document.getElementById('questionLessonIndex').value);
    const title = document.getElementById('questionTitle').value;
    const content = document.getElementById('questionContent').value;

    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/ask-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, content, lesson: lessonIndex })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('askQuestionModal')).hide();
            document.getElementById('askQuestionForm').reset();
            // Sayfayı yenile
            startLesson(courseId, lessonIndex);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Kurs değerlendirme
function reviewCourse(courseId) {
    document.getElementById('reviewCourseId').value = courseId;
    
    // Yıldız rating sistemi
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach((star, index) => {
        star.classList.remove('text-warning');
        star.addEventListener('click', () => {
            const rating = index + 1;
            document.getElementById('courseRating').value = rating;
            
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.add('text-warning');
                } else {
                    s.classList.remove('text-warning');
                }
            });
        });
    });
    
    new bootstrap.Modal(document.getElementById('reviewCourseModal')).show();
}

// Değerlendirme gönderme
document.getElementById('reviewCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const courseId = document.getElementById('reviewCourseId').value;
    const rating = parseInt(document.getElementById('courseRating').value);
    const comment = document.getElementById('courseComment').value;

    if (!rating) {
        showAlert('Lütfen puan verin!', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/student/courses/${courseId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ rating, comment })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('reviewCourseModal')).hide();
            document.getElementById('reviewCourseForm').reset();
            // Yıldızları sıfırla
            document.querySelectorAll('.rating-stars i').forEach(star => {
                star.classList.remove('text-warning');
            });
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Kayıt onayı - Yeni ödeme sistemi kullanılıyor (app.js'de)
// Bu fonksiyon artık kullanılmıyor, app.js'deki enrollCourse fonksiyonu kullanılıyor

// Öğrenci sorularını yükle
async function loadStudentQuestions() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/my-questions`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const questions = await response.json();
            displayStudentQuestions(questions);
        }
    } catch (error) {
        console.error('Öğrenci soruları yüklenirken hata:', error);
    }
}

// Öğrenci sorularını göster
function displayStudentQuestions(questions) {
    const content = document.getElementById('studentQuestionsContent');
    
    if (questions.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Henüz soru sormadınız.</div>';
        return;
    }

    content.innerHTML = questions.map(question => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6>${question.title}</h6>
                        <p>${question.content}</p>
                        <small class="text-muted">
                            <strong>Kurs:</strong> ${question.course.title} | 
                            <strong>Ders:</strong> ${question.lesson + 1} |
                            <strong>Tarih:</strong> ${new Date(question.createdAt).toLocaleDateString('tr-TR')}
                        </small>
                        ${question.isAnswered ? `
                            <div class="mt-2 p-2 bg-light rounded">
                                <strong>Yanıt:</strong><br>
                                ${question.answer.content}
                                <br><small class="text-muted">
                                    ${question.answer.answeredBy.name} - ${new Date(question.answer.answeredAt).toLocaleDateString('tr-TR')}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    <div>
                        ${question.isAnswered ? 
                            '<span class="badge bg-success">Yanıtlandı</span>' : 
                            '<span class="badge bg-warning">Yanıt bekleniyor</span>'
                        }
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Öğrenci değerlendirmelerini yükle
async function loadStudentReviews() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/my-reviews`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const reviews = await response.json();
            displayStudentReviews(reviews);
        }
    } catch (error) {
        console.error('Öğrenci değerlendirmeleri yüklenirken hata:', error);
    }
}

// Öğrenci değerlendirmelerini göster
function displayStudentReviews(reviews) {
    const content = document.getElementById('studentReviewsContent');
    
    if (reviews.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Henüz değerlendirme yapmadınız.</div>';
        return;
    }

    content.innerHTML = reviews.map(review => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6>${review.course.title}</h6>
                        <div class="mb-2">
                            ${generateStars(review.rating)}
                            <span class="ms-2">${review.rating}/5</span>
                        </div>
                        <p>${review.comment}</p>
                        <small class="text-muted">
                            ${new Date(review.createdAt).toLocaleDateString('tr-TR')}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Kurs önerilerini yükle
async function loadRecommendations() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/recommendations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayRecommendations(data);
        }
    } catch (error) {
        console.error('Öneriler yüklenirken hata:', error);
    }
}

// Önerileri göster
function displayRecommendations(data) {
    const content = document.getElementById('recommendationsContent');
    
    content.innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-lightbulb"></i> ${data.reason}
        </div>
        
        <div class="row">
            ${data.recommendations.map(course => `
                <div class="col-md-6 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6>${course.title}</h6>
                            <p class="text-muted small">${course.description.substring(0, 100)}...</p>
                            <div class="mb-2">
                                <span class="badge bg-${getLevelBadgeColor(course.level)}">${getLevelText(course.level)}</span>
                                <span class="badge bg-secondary">${course.category}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="fas fa-user"></i> ${course.instructor.name}<br>
                                    <i class="fas fa-users"></i> ${course.students.length} öğrenci
                                </small>
                                <div>
                                    <button class="btn btn-outline-info btn-sm" onclick="showCourseDetail('${course._id}')">
                                        Detay
                                    </button>
                                    <button class="btn btn-primary btn-sm" onclick="enrollCourse('${course._id}')">
                                        Kayıt Ol
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Tab değişikliklerini dinle
document.addEventListener('DOMContentLoaded', function() {
    const studentTabs = document.querySelectorAll('#studentTabs button[data-bs-toggle="tab"]');
    studentTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            
            if (target === '#my-courses-student') {
                loadStudentCourses();
            } else if (target === '#my-questions') {
                loadStudentQuestions();
            } else if (target === '#my-reviews') {
                loadStudentReviews();
            } else if (target === '#recommendations') {
                loadRecommendations();
            }
        });
    });
});

// Yardımcı fonksiyonlar
function getLevelBadgeColor(level) {
    const colors = {
        'beginner': 'success',
        'intermediate': 'warning',
        'advanced': 'danger'
    };
    return colors[level] || 'secondary';
}// YouTube URL'sini embed formatına çevir
function convertToEmbedUrl(url) {
    if (!url) return null;
    
    // YouTube watch URL'sini embed URL'sine çevir
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // YouTube short URL'sini embed URL'sine çevir
    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Zaten embed URL'si ise olduğu gibi döndür
    if (url.includes('youtube.com/embed/')) {
        return url;
    }
    
    // Diğer video platformları için (Vimeo, etc.)
    return url;
}