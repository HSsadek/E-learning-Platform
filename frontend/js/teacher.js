// Öğretmen Dashboard yükleme
async function loadTeacherDashboard() {
    console.log('loadTeacherDashboard çağrıldı, currentUser:', currentUser);
    console.log('authToken:', authToken ? 'var' : 'yok');
    
    if (!authToken) {
        showAlert('Lütfen giriş yapın!', 'danger');
        return;
    }
    
    if (!currentUser) {
        showAlert('Kullanıcı bilgisi bulunamadı!', 'danger');
        return;
    }

    try {
        console.log('Teacher Dashboard API çağrısı yapılıyor...');
        const response = await fetch(`${API_BASE_URL}/teacher/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Teacher Dashboard response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Teacher Dashboard verisi:', data);
            updateTeacherDashboardStats(data.stats);
            updateTeacherRecentActivities(data);
        } else {
            const errorData = await response.json();
            console.error('Teacher Dashboard hatası:', errorData);
        }
    } catch (error) {
        console.error('Öğretmen dashboard yüklenirken hata:', error);
    }
}

// Öğretmen dashboard istatistiklerini güncelle
function updateTeacherDashboardStats(stats) {
    document.getElementById('teacherTotalCourses').textContent = stats.totalCourses;
    document.getElementById('teacherApprovedCourses').textContent = stats.approvedCourses;
    document.getElementById('teacherTotalStudents').textContent = stats.totalStudents;
    document.getElementById('teacherTotalRevenue').textContent = stats.totalRevenue + ' TL';
}

// Öğretmen son aktiviteleri güncelle
function updateTeacherRecentActivities(data) {
    const recentQuestionsDiv = document.getElementById('teacherRecentQuestions');
    const popularCoursesDiv = document.getElementById('teacherPopularCourses');

    // Son sorular
    if (data.recentQuestions.length === 0) {
        recentQuestionsDiv.innerHTML = '<p class="text-muted">Cevaplanmamış soru yok</p>';
    } else {
        recentQuestionsDiv.innerHTML = data.recentQuestions.map(question => `
            <div class="mb-2">
                <strong>${question.title}</strong><br>
                <small class="text-muted d-flex align-items-center">
                    ${question.student.profileImage ? 
                        `<img src="${API_BASE_URL.replace('/api', '')}${question.student.profileImage}" class="rounded-circle me-1" style="width: 20px; height: 20px; object-fit: cover;">` :
                        `<span class="rounded-circle me-1 bg-primary text-white d-inline-flex align-items-center justify-content-center" style="width: 20px; height: 20px; font-size: 10px;">${question.student.name.charAt(0).toUpperCase()}</span>`
                    }
                    ${question.student.name} - ${question.course.title}
                </small>
            </div>
        `).join('');
    }

    // Popüler kurslar
    if (data.popularCourses.length === 0) {
        popularCoursesDiv.innerHTML = '<p class="text-muted">Henüz kurs yok</p>';
    } else {
        popularCoursesDiv.innerHTML = data.popularCourses.map(course => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${course.title}</strong><br>
                    <small class="text-muted">${getStatusText(course.status)}</small>
                </div>
                <span class="badge bg-primary">${course.students.length} öğrenci</span>
            </div>
        `).join('');
    }
}

// Öğretmen kurslarını yükle
async function loadTeacherCourses() {
    const status = document.getElementById('courseStatusFilter').value;

    try {
        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);

        const response = await fetch(`${API_BASE_URL}/teacher/courses?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayTeacherCourses(data.courses);
        }
    } catch (error) {
        console.error('Öğretmen kursları yüklenirken hata:', error);
    }
}

// Öğretmen kurslarını göster
function displayTeacherCourses(courses) {
    const content = document.getElementById('teacherCoursesContent');
    
    if (courses.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Henüz kurs oluşturmadınız.</div>';
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
                            <span class="badge bg-${getStatusBadgeColor(course.status)}">${getStatusText(course.status)}</span>
                            <span class="badge bg-info">${course.level}</span>
                            <span class="badge bg-secondary">${course.students.length} öğrenci</span>
                        </div>
                        <p><strong>Fiyat:</strong> ${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</p>
                        ${course.rejectionReason ? `<div class="alert alert-danger"><strong>Red Sebebi:</strong> ${course.rejectionReason}</div>` : ''}
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="dropdown">
                            <button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-cog me-1"></i> İşlemler
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item" href="javascript:void(0)" onclick="editCourse('${course._id}')">
                                        <i class="fas fa-edit me-2"></i>Düzenle
                                    </a>
                                </li>
                                ${course.status === 'draft' ? `
                                <li>
                                    <a class="dropdown-item text-success" href="javascript:void(0)" onclick="submitCourseForApproval('${course._id}')">
                                        <i class="fas fa-paper-plane me-2"></i>Onaya Gönder
                                    </a>
                                </li>
                                ` : ''}
                                ${course.status === 'approved' ? `
                                <li>
                                    <a class="dropdown-item" href="javascript:void(0)" onclick="viewCourseStudents('${course._id}')">
                                        <i class="fas fa-users me-2"></i>Öğrenciler
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item text-warning" href="javascript:void(0)" onclick="sendCourseAnnouncement('${course._id}')">
                                        <i class="fas fa-bullhorn me-2"></i>Duyuru Gönder
                                    </a>
                                </li>
                                ` : ''}
                                <li>
                                    <a class="dropdown-item" href="javascript:void(0)" onclick="viewCourseQuestions('${course._id}')">
                                        <i class="fas fa-question-circle me-2"></i>Sorular
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item text-danger" href="javascript:void(0)" onclick="deleteCourse('${course._id}', '${course.title.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-trash me-2"></i>Kursu Sil
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Yeni kurs oluşturma
document.getElementById('createCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const editId = form.getAttribute('data-edit-id');
    const editStatus = form.getAttribute('data-edit-status');
    const isEditing = !!editId;
    
    const courseData = {
        title: document.getElementById('courseTitle').value,
        description: document.getElementById('courseDescription').value,
        category: document.getElementById('courseCategory').value,
        level: document.getElementById('courseLevel').value,
        duration: parseInt(document.getElementById('courseDuration').value),
        price: parseFloat(document.getElementById('coursePrice').value),
        lessons: getLessonsData()
    };

    try {
        const url = isEditing 
            ? `${API_BASE_URL}/teacher/courses/${editId}`
            : `${API_BASE_URL}/teacher/courses`;
        
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();

        if (response.ok) {
            let message;
            if (isEditing && editStatus === 'approved') {
                message = 'Kurs başarıyla güncellendi! Değişiklikler kaydedildi.';
            } else if (isEditing) {
                message = 'Kurs başarıyla güncellendi!';
            } else {
                message = 'Kurs başarıyla oluşturuldu!';
            }
            showAlert(message, 'success');
            
            // Formu sıfırla
            document.getElementById('createCourseForm').reset();
            form.removeAttribute('data-edit-id');
            form.removeAttribute('data-edit-status');
            resetLessons();
            
            // Başlığı sıfırla
            const titleElement = document.querySelector('#create-course .card-header h5');
            if (titleElement) {
                titleElement.textContent = 'Yeni Kurs Oluştur';
            }
            
            // Submit butonunu sıfırla
            const submitBtn = document.getElementById('courseSubmitBtn');
            if (submitBtn) {
                submitBtn.textContent = 'Taslak Olarak Kaydet';
            }
            
            loadTeacherCourses();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Ders verilerini topla
function getLessonsData() {
    const lessons = [];
    const lessonItems = document.querySelectorAll('.lesson-item');
    
    lessonItems.forEach(item => {
        const title = item.querySelector('.lesson-title').value;
        const duration = parseInt(item.querySelector('.lesson-duration').value);
        const content = item.querySelector('.lesson-content').value;
        const videoUrl = item.querySelector('.lesson-video').value;
        
        if (title && duration) {
            lessons.push({ title, duration, content, videoUrl });
        }
    });
    
    return lessons;
}

// Ders ekleme
function addLesson() {
    const container = document.getElementById('lessonsContainer');
    const lessonHtml = `
        <div class="lesson-item border p-3 mb-3">
            <div class="row">
                <div class="col-md-6">
                    <label class="form-label">Ders Başlığı</label>
                    <input type="text" class="form-control lesson-title" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Süre (dk)</label>
                    <input type="number" class="form-control lesson-duration" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">İşlem</label><br>
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeLesson(this)">Sil</button>
                </div>
            </div>
            <div class="mt-2">
                <label class="form-label">İçerik</label>
                <textarea class="form-control lesson-content" rows="2"></textarea>
            </div>
            <div class="mt-2">
                <label class="form-label">Video</label>
                <div class="input-group">
                    <input type="text" class="form-control lesson-video" placeholder="Video URL veya galeriden seçin">
                    <button type="button" class="btn btn-outline-secondary" onclick="openVideoSelector(this)">
                        <i class="fas fa-photo-video"></i> Galeriden Seç
                    </button>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', lessonHtml);
}

// Ders silme
function removeLesson(button) {
    const lessonItem = button.closest('.lesson-item');
    lessonItem.remove();
}

// Dersleri sıfırla
function resetLessons() {
    const container = document.getElementById('lessonsContainer');
    container.innerHTML = `
        <div class="lesson-item border p-3 mb-3">
            <div class="row">
                <div class="col-md-6">
                    <label class="form-label">Ders Başlığı</label>
                    <input type="text" class="form-control lesson-title" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Süre (dk)</label>
                    <input type="number" class="form-control lesson-duration" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">İşlem</label><br>
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeLesson(this)">Sil</button>
                </div>
            </div>
            <div class="mt-2">
                <label class="form-label">İçerik</label>
                <textarea class="form-control lesson-content" rows="2"></textarea>
            </div>
            <div class="mt-2">
                <label class="form-label">Video</label>
                <div class="input-group">
                    <input type="text" class="form-control lesson-video" placeholder="Video URL veya galeriden seçin">
                    <button type="button" class="btn btn-outline-secondary" onclick="openVideoSelector(this)">
                        <i class="fas fa-photo-video"></i> Galeriden Seç
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Kurs oluştur ve direkt onaya gönder
async function createAndSubmitCourse() {
    const courseData = {
        title: document.getElementById('courseTitle').value,
        description: document.getElementById('courseDescription').value,
        category: document.getElementById('courseCategory').value,
        level: document.getElementById('courseLevel').value,
        duration: parseInt(document.getElementById('courseDuration').value),
        price: parseFloat(document.getElementById('coursePrice').value) || 0,
        lessons: getLessonsData()
    };

    // Validasyon
    if (!courseData.title || !courseData.description || !courseData.category) {
        showAlert('Lütfen tüm zorunlu alanları doldurun!', 'warning');
        return;
    }

    if (courseData.lessons.length === 0) {
        showAlert('En az bir ders eklemelisiniz!', 'warning');
        return;
    }

    try {
        // Kursu oluştur
        const response = await fetch(`${API_BASE_URL}/teacher/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Kurs başarıyla oluşturuldu!', 'success');
            document.getElementById('createCourseForm').reset();
            resetLessons();
            loadTeacherCourses();
        } else {
            showAlert(data.message || 'Kurs oluşturulurken hata oluştu!', 'danger');
        }
    } catch (error) {
        console.error('Kurs oluşturma hatası:', error);
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Kursu onaya gönder
async function submitCourseForApproval(courseId) {
    if (confirm('Bu kursu onaya göndermek istediğinizden emin misiniz?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/courses/${courseId}/submit`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(data.message, 'success');
                loadTeacherCourses();
                loadTeacherDashboard();
            } else {
                showAlert(data.message, 'danger');
            }
        } catch (error) {
            showAlert('Bağlantı hatası!', 'danger');
        }
    }
}

// Kursu sil
async function deleteCourse(courseId, courseTitle) {
    if (confirm(`"${courseTitle}" kursunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve kursa kayıtlı tüm öğrenciler kaydını kaybedecek!`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/courses/${courseId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('Kurs başarıyla silindi!', 'success');
                loadTeacherCourses();
                loadTeacherDashboard();
            } else {
                showAlert(data.message || 'Kurs silinirken hata oluştu!', 'danger');
            }
        } catch (error) {
            showAlert('Bağlantı hatası!', 'danger');
        }
    }
}

// Kurs öğrencilerini görüntüle
async function viewCourseStudents(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/courses/${courseId}/students`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayCourseStudents(data);
        }
    } catch (error) {
        console.error('Kurs öğrencileri yüklenirken hata:', error);
    }
}

// Kurs öğrencilerini göster
function displayCourseStudents(data) {
    const content = document.getElementById('courseStudentsContent');
    
    if (data.students.length === 0) {
        content.innerHTML = '<p class="text-muted">Bu kursa henüz öğrenci kaydolmamış.</p>';
    } else {
        content.innerHTML = `
            <h6>${data.course.title} - ${data.course.totalStudents} Öğrenci</h6>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Öğrenci</th>
                            <th>Email</th>
                            <th>İlerleme</th>
                            <th>Son Erişim</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.students.map(student => `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.email}</td>
                                <td>
                                    <div class="progress">
                                        <div class="progress-bar" style="width: ${student.progress.progressPercentage}%">
                                            ${student.progress.progressPercentage}%
                                        </div>
                                    </div>
                                    <small>${student.progress.completedLessons}/${student.progress.totalLessons} ders</small>
                                </td>
                                <td>
                                    ${student.progress.lastAccessedAt ? 
                                        new Date(student.progress.lastAccessedAt).toLocaleDateString('tr-TR') : 
                                        'Henüz erişim yok'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    new bootstrap.Modal(document.getElementById('courseStudentsModal')).show();
}

// Kurs duyurusu gönder
function sendCourseAnnouncement(courseId) {
    document.getElementById('announcementCourseId').value = courseId;
    new bootstrap.Modal(document.getElementById('courseAnnouncementModal')).show();
}

// Kurs duyurusu gönderme
document.getElementById('courseAnnouncementForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const courseId = document.getElementById('announcementCourseId').value;
    const title = document.getElementById('courseAnnouncementTitle').value;
    const content = document.getElementById('courseAnnouncementContent').value;

    try {
        const response = await fetch(`${API_BASE_URL}/teacher/courses/${courseId}/announcement`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, content })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('courseAnnouncementModal')).hide();
            document.getElementById('courseAnnouncementForm').reset();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Öğretmen sorularını yükle
async function loadTeacherQuestions() {
    const answered = document.getElementById('questionStatusFilter').value;

    try {
        // Önce öğretmenin kurslarını al
        const coursesResponse = await fetch(`${API_BASE_URL}/teacher/courses`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json();
            const approvedCourses = coursesData.courses.filter(c => c.status === 'approved');
            
            if (approvedCourses.length === 0) {
                document.getElementById('teacherQuestionsContent').innerHTML = 
                    '<div class="alert alert-info">Onaylanmış kursunuz bulunmuyor.</div>';
                return;
            }

            // Her kurs için soruları al
            const allQuestions = [];
            for (const course of approvedCourses) {
                const params = new URLSearchParams();
                if (answered !== 'all') params.append('answered', answered);

                const questionsResponse = await fetch(`${API_BASE_URL}/teacher/courses/${course._id}/questions?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (questionsResponse.ok) {
                    const questions = await questionsResponse.json();
                    questions.forEach(q => {
                        q.courseName = course.title;
                        allQuestions.push(q);
                    });
                }
            }

            displayTeacherQuestions(allQuestions);
        }
    } catch (error) {
        console.error('Öğretmen soruları yüklenirken hata:', error);
    }
}

// Öğretmen sorularını göster
function displayTeacherQuestions(questions) {
    const content = document.getElementById('teacherQuestionsContent');
    
    if (questions.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Soru bulunmuyor.</div>';
        return;
    }

    content.innerHTML = questions.map(question => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-start mb-2">
                            ${question.student.profileImage ? 
                                `<img src="${API_BASE_URL.replace('/api', '')}${question.student.profileImage}" class="rounded-circle me-2" style="width: 45px; height: 45px; object-fit: cover;">` :
                                `<div class="rounded-circle me-2 bg-primary text-white d-flex align-items-center justify-content-center" style="width: 45px; height: 45px; font-weight: bold;">${question.student.name.charAt(0).toUpperCase()}</div>`
                            }
                            <div>
                                <strong>${question.student.name}</strong>
                                <small class="text-muted ms-2">${question.courseName} | Ders ${question.lesson + 1}</small>
                                <p class="mb-0 mt-1">${question.content}</p>
                            </div>
                        </div>
                        ${question.isAnswered ? `
                            <div class="mt-2 p-2 bg-light rounded ms-5">
                                <div class="d-flex align-items-start">
                                    ${question.answer.answeredBy && question.answer.answeredBy.profileImage ? 
                                        `<img src="${API_BASE_URL.replace('/api', '')}${question.answer.answeredBy.profileImage}" class="rounded-circle me-2" style="width: 35px; height: 35px; object-fit: cover;">` :
                                        `<div class="rounded-circle me-2 bg-success text-white d-flex align-items-center justify-content-center" style="width: 35px; height: 35px; font-size: 12px; font-weight: bold;">S</div>`
                                    }
                                    <div>
                                        <strong>Yanıtınız</strong>
                                        <small class="text-muted ms-2">${new Date(question.answer.answeredAt).toLocaleDateString('tr-TR')}</small>
                                        <p class="mb-0 mt-1">${question.answer.content}</p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="ms-3">
                        ${question.isAnswered ? 
                            '<span class="badge bg-success">Yanıtlandı</span>' : 
                            `<button class="btn btn-primary btn-sm" onclick="answerQuestion('${question._id}', '${question.content.replace(/'/g, "\\'")}')">
                                Yanıtla
                            </button>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Soru yanıtlama
function answerQuestion(questionId, content) {
    document.getElementById('answerQuestionId').value = questionId;
    document.getElementById('questionDetails').innerHTML = `
        <div class="alert alert-light">
            <p class="mb-0">${content}</p>
        </div>
    `;
    new bootstrap.Modal(document.getElementById('answerQuestionModal')).show();
}

// Soru yanıtlama formu
document.getElementById('answerQuestionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const questionId = document.getElementById('answerQuestionId').value;
    const content = document.getElementById('questionAnswer').value;

    try {
        const response = await fetch(`${API_BASE_URL}/teacher/questions/${questionId}/answer`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('answerQuestionModal')).hide();
            document.getElementById('questionAnswer').value = '';
            loadTeacherQuestions();
            loadTeacherDashboard();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Kazanç bilgilerini yükle
async function loadEarnings() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/earnings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayEarnings(data);
        }
    } catch (error) {
        console.error('Kazanç bilgileri yüklenirken hata:', error);
    }
}

// Kazanç bilgilerini göster
function displayEarnings(data) {
    const content = document.getElementById('earningsContent');
    
    content.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <h4>${data.summary.totalRevenue} TL</h4>
                        <p>Toplam Gelir</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                        <h4>${data.summary.totalPlatformFee} TL</h4>
                        <p>Platform Komisyonu (%10)</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <h4>${data.summary.totalNetEarning} TL</h4>
                        <p>Net Kazancınız</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <h4>${data.summary.coursesCount}</h4>
                        <p>Aktif Kurs</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h5>Kurs Bazında Kazançlar</h5>
            </div>
            <div class="card-body">
                ${data.courseEarnings.length === 0 ? 
                    '<p class="text-muted">Henüz gelir elde etmemişsiniz.</p>' :
                    `<div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Kurs</th>
                                    <th>Fiyat</th>
                                    <th>Öğrenci Sayısı</th>
                                    <th>Toplam Gelir</th>
                                    <th>Platform Komisyonu</th>
                                    <th>Net Kazanç</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.courseEarnings.map(earning => `
                                    <tr>
                                        <td>${earning.title}</td>
                                        <td>${earning.price} TL</td>
                                        <td>${earning.studentsCount}</td>
                                        <td>${earning.totalRevenue} TL</td>
                                        <td>${earning.platformFee} TL</td>
                                        <td><strong>${earning.netEarning} TL</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            </div>
        </div>
    `;
}

// Tab değişikliklerini dinle
document.addEventListener('DOMContentLoaded', function() {
    const teacherTabs = document.querySelectorAll('#teacherTabs button[data-bs-toggle="tab"]');
    teacherTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            
            if (target === '#teacher-dashboard') {
                loadTeacherDashboard();
            } else if (target === '#my-courses') {
                loadTeacherCourses();
            } else if (target === '#questions') {
                loadTeacherQuestions();
            } else if (target === '#earnings') {
                loadEarnings();
            }
        });
    });
});

// Yardımcı fonksiyonlar
function getStatusText(status) {
    const statuses = {
        'draft': 'Taslak',
        'pending': 'Onay Bekliyor',
        'approved': 'Onaylandı',
        'rejected': 'Reddedildi'
    };
    return statuses[status] || status;
}

function getStatusBadgeColor(status) {
    const colors = {
        'draft': 'secondary',
        'pending': 'warning',
        'approved': 'success',
        'rejected': 'danger'
    };
    return colors[status] || 'secondary';
}

// Kurs sorularını görüntüle
function viewCourseQuestions(courseId) {
    showAlert('Soru yönetimi özelliği yakında eklenecek!', 'info');
}

// Kurs düzenleme
async function editCourse(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/courses`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const course = data.courses.find(c => c._id === courseId);
            
            if (!course) {
                showAlert('Kurs bulunamadı!', 'danger');
                return;
            }

            // Form alanlarını doldur
            document.getElementById('courseTitle').value = course.title;
            document.getElementById('courseDescription').value = course.description;
            document.getElementById('courseCategory').value = course.category;
            document.getElementById('courseLevel').value = course.level;
            document.getElementById('courseDuration').value = course.duration;
            document.getElementById('coursePrice').value = course.price;

            // Mevcut dersleri temizle
            document.getElementById('lessonsContainer').innerHTML = '';

            // Dersleri ekle
            course.lessons.forEach((lesson, index) => {
                addLesson();
                const lessonItems = document.querySelectorAll('.lesson-item');
                const currentLesson = lessonItems[lessonItems.length - 1];
                
                currentLesson.querySelector('.lesson-title').value = lesson.title;
                currentLesson.querySelector('.lesson-duration').value = lesson.duration;
                currentLesson.querySelector('.lesson-content').value = lesson.content || '';
                currentLesson.querySelector('.lesson-video').value = lesson.videoUrl || '';
            });

            // Form'u düzenleme moduna al
            const form = document.getElementById('createCourseForm');
            form.setAttribute('data-edit-id', courseId);
            form.setAttribute('data-edit-status', course.status);
            
            // Sayfa başlığını değiştir
            const titleElement = document.querySelector('#create-course .card-header h5');
            if (titleElement) {
                titleElement.textContent = 'Kurs Düzenle';
            }
            
            // Submit butonunun metnini değiştir
            const submitBtn = document.getElementById('courseSubmitBtn');
            if (submitBtn) {
                if (course.status === 'approved') {
                    submitBtn.textContent = 'Değişiklikleri Kaydet';
                } else {
                    submitBtn.textContent = 'Güncelle';
                }
            }
            
            // Create course sekmesine geç
            const createTab = document.querySelector('button[data-bs-target="#create-course"]');
            createTab.click();
            
            if (course.status === 'approved') {
                showAlert('Onaylanmış kurs düzenleniyor. Değişiklikler direkt kaydedilecek.', 'info');
            } else {
                showAlert('Kurs düzenleme için yüklendi', 'info');
            }
        }
    } catch (error) {
        console.error('Kurs düzenleme hatası:', error);
        showAlert('Kurs yüklenirken hata oluştu!', 'danger');
    }
}

// Video Galerisi Fonksiyonları

// Video yükleme formu
document.getElementById('videoUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('videoTitle').value;
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Lütfen bir video dosyası seçin!', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('video', file);
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const percentText = document.getElementById('uploadPercent');
    
    progressDiv.classList.remove('d-none');
    
    try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                percentText.textContent = percent;
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 201) {
                const response = JSON.parse(xhr.responseText);
                showAlert(response.message, 'success');
                document.getElementById('videoUploadForm').reset();
                loadVideoGallery();
            } else {
                const error = JSON.parse(xhr.responseText);
                showAlert(error.message || 'Video yüklenirken hata oluştu!', 'danger');
            }
            progressDiv.classList.add('d-none');
            progressBar.style.width = '0%';
        });
        
        xhr.addEventListener('error', () => {
            showAlert('Bağlantı hatası!', 'danger');
            progressDiv.classList.add('d-none');
            progressBar.style.width = '0%';
        });
        
        xhr.open('POST', `${API_BASE_URL}/teacher/videos/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);
        
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
        progressDiv.classList.add('d-none');
    }
});

// Video galerisini yükle
async function loadVideoGallery() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/videos`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const videos = await response.json();
            displayVideoGallery(videos);
        }
    } catch (error) {
        console.error('Video galerisi yüklenirken hata:', error);
    }
}

// Video galerisini göster
function displayVideoGallery(videos) {
    const content = document.getElementById('videoGalleryContent');
    
    if (videos.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Henüz video yüklemediniz.</div>';
        return;
    }
    
    content.innerHTML = `
        <div class="row">
            ${videos.map(video => `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <video class="w-100 mb-2" style="max-height: 200px; background: #000;" controls>
                                <source src="${API_BASE_URL.replace('/api', '')}${video.path}" type="${video.mimetype}">
                                Tarayıcınız video oynatmayı desteklemiyor.
                            </video>
                            <h6 class="card-title">${video.title}</h6>
                            <small class="text-muted d-block mb-2">
                                ${formatFileSize(video.size)} | ${new Date(video.createdAt).toLocaleDateString('tr-TR')}
                            </small>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="copyVideoUrl('${API_BASE_URL.replace('/api', '')}${video.path}')">
                                    <i class="fas fa-copy"></i> URL Kopyala
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteVideo('${video._id}')">
                                    <i class="fas fa-trash"></i> Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Dosya boyutunu formatla
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Video URL'sini kopyala
function copyVideoUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showAlert('Video URL\'si panoya kopyalandı!', 'success');
    }).catch(() => {
        showAlert('URL kopyalanamadı!', 'danger');
    });
}

// Video sil
async function deleteVideo(videoId) {
    if (confirm('Bu videoyu silmek istediğinizden emin misiniz?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message, 'success');
                loadVideoGallery();
            } else {
                showAlert(data.message || 'Video silinirken hata oluştu!', 'danger');
            }
        } catch (error) {
            showAlert('Bağlantı hatası!', 'danger');
        }
    }
}

// Tab değişikliklerini güncelle - video galerisi için
const videoGalleryTab = document.querySelector('button[data-bs-target="#video-gallery"]');
if (videoGalleryTab) {
    videoGalleryTab.addEventListener('shown.bs.tab', function() {
        loadVideoGallery();
    });
}


// Video seçici için geçici değişken
let currentVideoInput = null;

// Video seçici modalını aç
async function openVideoSelector(button) {
    currentVideoInput = button.closest('.input-group').querySelector('.lesson-video');
    
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/videos`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const videos = await response.json();
            displayVideoSelector(videos);
            new bootstrap.Modal(document.getElementById('videoSelectorModal')).show();
        }
    } catch (error) {
        showAlert('Videolar yüklenirken hata oluştu!', 'danger');
    }
}

// Video seçici içeriğini göster
function displayVideoSelector(videos) {
    const content = document.getElementById('videoSelectorContent');
    
    if (videos.length === 0) {
        content.innerHTML = `
            <div class="alert alert-info">
                <p>Henüz video yüklemediniz.</p>
                <button class="btn btn-primary" onclick="goToVideoGallery()">
                    <i class="fas fa-upload"></i> Video Yükle
                </button>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <div class="row">
            ${videos.map(video => `
                <div class="col-md-4 mb-3">
                    <div class="card h-100 video-select-card" style="cursor: pointer;" onclick="selectVideo('${API_BASE_URL.replace('/api', '')}${video.path}')">
                        <div class="card-body text-center">
                            <video class="w-100 mb-2" style="max-height: 120px; background: #000;">
                                <source src="${API_BASE_URL.replace('/api', '')}${video.path}" type="${video.mimetype}">
                            </video>
                            <h6 class="card-title small">${video.title}</h6>
                            <small class="text-muted">${formatFileSize(video.size)}</small>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <hr>
        <div class="text-center">
            <p class="text-muted">veya YouTube URL'si girin</p>
            <div class="input-group">
                <input type="url" class="form-control" id="youtubeUrlInput" placeholder="https://www.youtube.com/watch?v=...">
                <button class="btn btn-danger" onclick="selectYoutubeUrl()">
                    <i class="fab fa-youtube"></i> YouTube Ekle
                </button>
            </div>
        </div>
    `;
}

// Video seç
function selectVideo(videoUrl) {
    if (currentVideoInput) {
        currentVideoInput.value = videoUrl;
    }
    bootstrap.Modal.getInstance(document.getElementById('videoSelectorModal')).hide();
    showAlert('Video seçildi!', 'success');
}

// YouTube URL'si seç
function selectYoutubeUrl() {
    const url = document.getElementById('youtubeUrlInput').value;
    if (!url) {
        showAlert('Lütfen bir YouTube URL\'si girin!', 'warning');
        return;
    }
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        showAlert('Geçerli bir YouTube URL\'si girin!', 'warning');
        return;
    }
    selectVideo(url);
}

// Video galerisi sekmesine git
function goToVideoGallery() {
    bootstrap.Modal.getInstance(document.getElementById('videoSelectorModal')).hide();
    document.querySelector('button[data-bs-target="#video-gallery"]').click();
}
