// Öğrenci Dashboard yükleme
async function loadStudentDashboard() {
    console.log('loadStudentDashboard çağrıldı, currentUser:', currentUser);
    console.log('authToken:', authToken ? 'var' : 'yok');
    
    if (!authToken) {
        showAlert('Lütfen giriş yapın!', 'danger');
        return;
    }
    
    if (!currentUser) {
        showAlert('Kullanıcı bilgisi bulunamadı!', 'danger');
        return;
    }

    // Duyuruları yükle
    loadStudentAnnouncements();

    try {
        console.log('Dashboard API çağrısı yapılıyor...');
        const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Dashboard response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Dashboard verisi:', data);
            updateStudentDashboardStats(data.stats);
            updateStudentRecentActivities(data);
        } else {
            const errorData = await response.json();
            console.error('Dashboard hatası:', errorData);
            showAlert(errorData.message || 'Dashboard yüklenemedi', 'danger');
        }
    } catch (error) {
        console.error('Öğrenci dashboard yüklenirken hata:', error);
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Öğrenci duyurularını yükle
async function loadStudentAnnouncements() {
    try {
        const role = currentUser ? currentUser.role : '';
        const response = await fetch(`${API_BASE_URL}/student/announcements?role=${role}`);
        
        if (response.ok) {
            const announcements = await response.json();
            displayStudentAnnouncements(announcements);
        }
    } catch (error) {
        console.error('Duyurular yüklenirken hata:', error);
    }
}

// Duyuruları göster
function displayStudentAnnouncements(announcements) {
    const section = document.getElementById('studentAnnouncementsSection');
    const container = document.getElementById('studentAnnouncements');
    
    if (!section || !container) return;
    
    if (announcements.length === 0) {
        section.classList.add('d-none');
        return;
    }
    
    section.classList.remove('d-none');
    
    container.innerHTML = announcements.map(announcement => `
        <div class="alert alert-${announcement.type || 'info'} alert-dismissible fade show" role="alert">
            <div class="d-flex align-items-start">
                <div class="me-3">
                    <i class="fas ${getAnnouncementIcon(announcement.type)} fa-lg"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="alert-heading mb-1">${announcement.title}</h6>
                    <p class="mb-1">${announcement.content}</p>
                    <small class="text-muted">
                        ${announcement.createdBy ? announcement.createdBy.name : 'Admin'} • 
                        ${new Date(announcement.createdAt).toLocaleDateString('tr-TR')}
                    </small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        </div>
    `).join('');
}

// Duyuru ikonu
function getAnnouncementIcon(type) {
    const icons = {
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle',
        'success': 'fa-check-circle',
        'danger': 'fa-times-circle'
    };
    return icons[type] || 'fa-bullhorn';
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

    // İlerleme genel bakış - tüm kursları göster
    if (data.courses.length === 0) {
        progressOverviewDiv.innerHTML = '<p class="text-muted">Henüz kurs kaydınız yok</p>';
    } else {
        progressOverviewDiv.innerHTML = data.courses.map(course => `
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
        <div class="card student-course-card mb-4" style="border-radius: 15px; overflow: hidden;">
            <div class="card-body p-4">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-start mb-3">
                            ${course.instructor.profileImage ? 
                                `<img src="${API_BASE_URL.replace('/api', '')}${course.instructor.profileImage}" class="rounded-circle me-3" style="width: 50px; height: 50px; object-fit: cover; border: 2px solid #667eea;">` :
                                `<div class="rounded-circle me-3 bg-primary text-white d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; font-weight: bold; font-size: 18px;">${course.instructor.name.charAt(0).toUpperCase()}</div>`
                            }
                            <div>
                                <h5 class="mb-1" style="color: #333;">${course.title}</h5>
                                <small class="text-muted">${course.instructor.name}</small>
                            </div>
                        </div>
                        
                        <p class="text-muted small mb-3">${course.description.substring(0, 100)}...</p>
                        
                        <!-- İlerleme Çubuğu -->
                        <div class="mb-2">
                            <div class="d-flex justify-content-between mb-1">
                                <small class="fw-bold" style="color: #667eea;">İlerleme</small>
                                <small class="fw-bold" style="color: ${course.progress.progressPercentage === 100 ? '#28a745' : '#667eea'};">${course.progress.progressPercentage}%</small>
                            </div>
                            <div class="progress" style="height: 8px; border-radius: 10px;">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${course.progress.progressPercentage}%; background: ${course.progress.progressPercentage === 100 ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; border-radius: 10px;">
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-3 text-muted small">
                            <span><i class="fas fa-book-open me-1"></i>${course.progress.completedLessons}/${course.progress.totalLessons} ders</span>
                            <span><i class="fas fa-clock me-1"></i>${course.duration} dk</span>
                            ${course.progress.lastAccessedAt ? 
                                `<span><i class="fas fa-calendar me-1"></i>${new Date(course.progress.lastAccessedAt).toLocaleDateString('tr-TR')}</span>` : 
                                ''
                            }
                        </div>
                    </div>
                    <div class="col-md-4 text-end mt-3 mt-md-0">
                        <button class="btn btn-gradient w-100 mb-2" onclick="continueCourse('${course._id}')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 25px; padding: 12px;">
                            <i class="fas fa-play me-1"></i> ${course.progress.progressPercentage === 0 ? 'Başla' : 'Devam Et'}
                        </button>
                        <div class="d-flex gap-2 justify-content-end">
                            <button class="btn btn-outline-secondary btn-sm" onclick="showCourseDetail('${course._id}')" style="border-radius: 20px;">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            ${course.progress.progressPercentage > 0 ? `
                                <button class="btn btn-outline-warning btn-sm" onclick="reviewCourse('${course._id}')" style="border-radius: 20px;">
                                    <i class="fas fa-star"></i>
                                </button>
                            ` : ''}
                        </div>
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
    console.log('displayLesson çağrıldı, data:', data);
    console.log('Lesson videoUrl:', data.lesson.videoUrl);
    console.log('Instructor:', data.course.instructor);
    
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
                        ${lesson.videoUrl && lesson.videoUrl.trim() !== '' ? `
                            <div class="ratio ratio-16x9 mb-3" style="background: #000; min-height: 400px;">
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
                                        <div class="d-flex align-items-start mb-2">
                                            ${question.student.profileImage ? 
                                                `<img src="${API_BASE_URL.replace('/api', '')}${question.student.profileImage}" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;">` :
                                                `<div class="rounded-circle me-2 bg-primary text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-weight: bold;">${question.student.name.charAt(0).toUpperCase()}</div>`
                                            }
                                            <div class="flex-grow-1">
                                                <strong>${question.student.name}</strong>
                                                <small class="text-muted ms-2">${new Date(question.createdAt).toLocaleDateString('tr-TR')}</small>
                                                <p class="mb-0 mt-1">${question.content}</p>
                                            </div>
                                        </div>
                                        ${question.isAnswered ? `
                                            <div class="mt-2 p-2 bg-light rounded ms-5">
                                                <div class="d-flex align-items-start">
                                                    ${question.answer.answeredBy.profileImage ? 
                                                        `<img src="${API_BASE_URL.replace('/api', '')}${question.answer.answeredBy.profileImage}" class="rounded-circle me-2" style="width: 32px; height: 32px; object-fit: cover;">` :
                                                        `<div class="rounded-circle me-2 bg-success text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 12px; font-weight: bold;">${question.answer.answeredBy.name.charAt(0).toUpperCase()}</div>`
                                                    }
                                                    <div>
                                                        <strong>${question.answer.answeredBy.name}</strong> <span class="badge bg-success">Eğitmen</span>
                                                        <small class="text-muted ms-2">${new Date(question.answer.answeredAt).toLocaleDateString('tr-TR')}</small>
                                                        <p class="mb-0 mt-1">${question.answer.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : '<div class="mt-2 ms-5"><span class="badge bg-warning">Yanıt bekleniyor</span></div>'}
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card" style="border: none; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                    <div class="card-header bg-transparent border-0 pt-3">
                        <h6 class="mb-0"><i class="fas fa-chart-line me-2 text-primary"></i>Kurs İlerlemesi</h6>
                    </div>
                    <div class="card-body">
                        <div class="text-center mb-3">
                            <div class="position-relative d-inline-block">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e9ecef" stroke-width="12"/>
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="url(#gradient)" stroke-width="12" 
                                            stroke-dasharray="${339.292 * data.progress.progressPercentage / 100} 339.292" 
                                            stroke-linecap="round" transform="rotate(-90 60 60)"/>
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" style="stop-color:#667eea"/>
                                            <stop offset="100%" style="stop-color:#764ba2"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div class="position-absolute top-50 start-50 translate-middle">
                                    <h4 class="mb-0 fw-bold" style="color: #667eea;">${data.progress.progressPercentage}%</h4>
                                </div>
                            </div>
                        </div>
                        <div class="text-center">
                            <small class="text-muted d-block">${data.progress.completedLessons.length}/${course.totalLessons} ders tamamlandı</small>
                            ${data.progress.progressPercentage === 100 ? 
                                '<span class="badge bg-success mt-2"><i class="fas fa-trophy me-1"></i>Tamamlandı!</span>' : 
                                ''
                            }
                        </div>
                    </div>
                </div>
                
                <div class="card mt-3" style="border: none; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                    <div class="card-header bg-transparent border-0 pt-3">
                        <h6 class="mb-0"><i class="fas fa-chalkboard-teacher me-2 text-primary"></i>Eğitmen</h6>
                    </div>
                    <div class="card-body text-center">
                        ${course.instructor.profileImage ? 
                            `<img src="${API_BASE_URL.replace('/api', '')}${course.instructor.profileImage}" class="rounded-circle mb-2" style="width: 80px; height: 80px; object-fit: cover; border: 3px solid #667eea;">` :
                            `<div class="rounded-circle mx-auto mb-2 text-white d-flex align-items-center justify-content-center" style="width: 80px; height: 80px; font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">${course.instructor.name.charAt(0).toUpperCase()}</div>`
                        }
                        <h6 class="mb-1" style="color: #333;">${course.instructor.name}</h6>
                        <small class="text-muted">${course.instructor.email}</small>
                    </div>
                </div>
                
                ${data.progress.progressPercentage > 0 ? `
                <div class="card mt-3" style="border: none; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                    <div class="card-body text-center p-4">
                        <i class="fas fa-star text-warning fa-2x mb-2"></i>
                        <p class="mb-3">Bu kursu beğendiniz mi?</p>
                        <button class="btn w-100" onclick="reviewCourse('${course._id}')" style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); border: none; border-radius: 25px; color: white;">
                            <i class="fas fa-star me-1"></i> Kursu Değerlendir
                        </button>
                    </div>
                </div>
                ` : ''}
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
    const content = document.getElementById('questionContent').value;
    
    // Başlık olarak içeriğin ilk 50 karakterini kullan
    const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');

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
        content.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-question-circle fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">Henüz soru sormadınız</h5>
                <p class="text-muted small">Derslerle ilgili sorularınızı ders sayfasından sorabilirsiniz.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = questions.map(question => {
        // Güvenli değişkenler - currentUser'dan al veya question.student'dan
        const studentName = question.student?.name || currentUser?.name || 'Öğrenci';
        const studentImage = question.student?.profileImage || currentUser?.profileImage;
        const answeredByName = question.answer?.answeredBy?.name || 'Eğitmen';
        const answeredByImage = question.answer?.answeredBy?.profileImage;
        
        return `
        <div class="card mb-3" style="border: none; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center">
                        ${studentImage ? 
                            `<img src="${API_BASE_URL.replace('/api', '')}${studentImage}" class="rounded-circle me-3" style="width: 45px; height: 45px; object-fit: cover; border: 2px solid #667eea;">` :
                            `<div class="rounded-circle d-flex align-items-center justify-content-center me-3" 
                                 style="width: 45px; height: 45px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold;">
                                ${studentName.charAt(0).toUpperCase()}
                            </div>`
                        }
                        <div>
                            <span class="fw-bold d-block mb-1" style="color: #333;">${studentName}</span>
                            <div class="d-flex flex-wrap gap-2">
                                <span class="badge" style="background: rgba(102, 126, 234, 0.1); color: #667eea; font-weight: 500;">
                                    <i class="fas fa-book me-1"></i>${question.course?.title || 'Kurs'}
                                </span>
                                <span class="badge" style="background: rgba(108, 117, 125, 0.1); color: #6c757d; font-weight: 500;">
                                    <i class="fas fa-play-circle me-1"></i>Ders ${(question.lesson || 0) + 1}
                                </span>
                            </div>
                        </div>
                    </div>
                    ${question.isAnswered ? 
                        `<span class="badge" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 8px 16px; border-radius: 20px;">
                            <i class="fas fa-check-circle me-1"></i>Yanıtlandı
                        </span>` : 
                        `<span class="badge" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: #333; padding: 8px 16px; border-radius: 20px;">
                            <i class="fas fa-clock me-1"></i>Bekliyor
                        </span>`
                    }
                </div>
                
                <div class="p-3 mb-3" style="background: #f8f9fa; border-radius: 12px; border-left: 4px solid #667eea;">
                    <p class="mb-0" style="color: #555;">${question.content || ''}</p>
                </div>
                
                <div class="d-flex align-items-center text-muted small mb-3">
                    <i class="fas fa-calendar-alt me-2"></i>
                    <span>${new Date(question.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                
                ${question.isAnswered && question.answer ? `
                    <div class="p-3" style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%); border-radius: 12px; border-left: 4px solid #28a745;">
                        <div class="d-flex align-items-center mb-2">
                            ${answeredByImage ? 
                                `<img src="${API_BASE_URL.replace('/api', '')}${answeredByImage}" class="rounded-circle me-2" style="width: 32px; height: 32px; object-fit: cover; border: 2px solid #28a745;">` :
                                `<div class="rounded-circle d-flex align-items-center justify-content-center me-2" 
                                     style="width: 32px; height: 32px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; font-size: 12px; font-weight: bold;">
                                    ${answeredByName.charAt(0).toUpperCase()}
                                </div>`
                            }
                            <div>
                                <span style="font-weight: 600; color: #28a745;">${answeredByName}</span>
                                <span class="badge bg-success ms-2" style="font-size: 10px;">Eğitmen</span>
                            </div>
                            <span class="ms-auto text-muted small">
                                <i class="fas fa-clock me-1"></i>${new Date(question.answer.answeredAt).toLocaleDateString('tr-TR')}
                            </span>
                        </div>
                        <p class="mb-0" style="color: #555;">${question.answer.content || ''}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `}).join('');
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
        content.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-star fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">Henüz değerlendirme yapmadınız</h5>
                <p class="text-muted small">Tamamladığınız kursları değerlendirerek diğer öğrencilere yardımcı olabilirsiniz.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = reviews.map(review => {
        const ratingColor = review.rating >= 4 ? '#28a745' : review.rating >= 3 ? '#ffc107' : '#dc3545';
        
        return `
        <div class="card mb-3" style="border: none; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
            <div class="card-body p-0">
                <!-- Üst Kısım - Kurs Bilgisi -->
                <div class="p-4" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%); border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center me-3" 
                                 style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <i class="fas fa-book-open text-white"></i>
                            </div>
                            <div>
                                <h6 class="mb-1" style="color: #333; font-weight: 600;">${review.course?.title || 'Kurs'}</h6>
                                <small class="text-muted">
                                    <i class="fas fa-calendar-alt me-1"></i>
                                    ${new Date(review.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </small>
                            </div>
                        </div>
                        <!-- Puan Badge -->
                        <div class="text-center">
                            <div class="d-inline-flex align-items-center px-3 py-2" style="background: ${ratingColor}15; border-radius: 12px;">
                                <span style="font-size: 24px; font-weight: 700; color: ${ratingColor};">${review.rating}</span>
                                <span class="text-muted ms-1">/5</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Alt Kısım - Yıldızlar ve Yorum -->
                <div class="p-4">
                    <!-- Yıldızlar -->
                    <div class="mb-3">
                        ${[1,2,3,4,5].map(star => `
                            <i class="fas fa-star ${star <= review.rating ? '' : 'text-muted'}" 
                               style="color: ${star <= review.rating ? '#ffc107' : '#e0e0e0'}; font-size: 18px; margin-right: 2px;"></i>
                        `).join('')}
                    </div>
                    
                    <!-- Yorum -->
                    ${review.comment ? `
                        <div class="p-3" style="background: #f8f9fa; border-radius: 12px; border-left: 4px solid ${ratingColor};">
                            <p class="mb-0" style="color: #555; font-style: italic;">
                                <i class="fas fa-quote-left me-2" style="color: ${ratingColor}; opacity: 0.5;"></i>
                                ${review.comment}
                            </p>
                        </div>
                    ` : `
                        <p class="text-muted small mb-0">
                            <i class="fas fa-comment-slash me-1"></i>Yorum eklenmemiş
                        </p>
                    `}
                </div>
            </div>
        </div>
    `}).join('');
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
            console.log('Öneriler verisi:', data); // Debug için
            displayRecommendations(data);
        } else {
            console.error('Öneriler yüklenemedi, status:', response.status);
            displayRecommendations([]); // Boş dizi gönder
        }
    } catch (error) {
        console.error('Öneriler yüklenirken hata:', error);
        displayRecommendations([]); // Hata durumunda boş dizi gönder
    }
}

// Önerileri göster
function displayRecommendations(recommendations) {
    const content = document.getElementById('recommendationsContent');
    
    // recommendations parametresinin undefined veya null olma durumunu kontrol et
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Şu anda öneri bulunmuyor.</div>';
        return;
    }
    
    content.innerHTML = `
        <div class="row">
            ${recommendations.map(course => `
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
                                    <i class="fas fa-users"></i> ${course.students ? course.students.length : 0} öğrenci
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
            
            if (target === '#student-dashboard') {
                loadStudentDashboard();
            } else if (target === '#my-courses-student') {
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