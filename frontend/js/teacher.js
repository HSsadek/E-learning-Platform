// Öğretmen Dashboard yükleme
async function loadTeacherDashboard() {
    if (!authToken || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) {
        showAlert('Öğretmen yetkisi gereklidir!', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/teacher/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateTeacherDashboardStats(data.stats);
            updateTeacherRecentActivities(data);
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
                <small class="text-muted">
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
                        ${course.status === 'draft' ? `
                            <button class="btn btn-primary btn-sm mb-2" onclick="editCourse('${course._id}')">
                                Düzenle
                            </button><br>
                            <button class="btn btn-success btn-sm mb-2" onclick="submitCourseForApproval('${course._id}')">
                                Onaya Gönder
                            </button><br>
                        ` : ''}
                        ${course.status === 'approved' ? `
                            <button class="btn btn-info btn-sm mb-2" onclick="viewCourseStudents('${course._id}')">
                                Öğrenciler
                            </button><br>
                            <button class="btn btn-warning btn-sm mb-2" onclick="sendCourseAnnouncement('${course._id}')">
                                Duyuru Gönder
                            </button><br>
                        ` : ''}
                        <button class="btn btn-outline-primary btn-sm" onclick="viewCourseQuestions('${course._id}')">
                            Sorular
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Yeni kurs oluşturma
document.getElementById('createCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
                <label class="form-label">Video URL (opsiyonel)</label>
                <input type="url" class="form-control lesson-video">
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
                <label class="form-label">Video URL (opsiyonel)</label>
                <input type="url" class="form-control lesson-video">
            </div>
        </div>
    `;
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
                    <div>
                        <h6>${question.title}</h6>
                        <p>${question.content}</p>
                        <small class="text-muted">
                            <strong>Öğrenci:</strong> ${question.student.name} | 
                            <strong>Kurs:</strong> ${question.courseName} | 
                            <strong>Ders:</strong> ${question.lesson + 1}
                        </small>
                        ${question.isAnswered ? `
                            <div class="mt-2 p-2 bg-light rounded">
                                <strong>Yanıtınız:</strong><br>
                                ${question.answer.content}
                                <br><small class="text-muted">
                                    ${new Date(question.answer.answeredAt).toLocaleDateString('tr-TR')}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    <div>
                        ${question.isAnswered ? 
                            '<span class="badge bg-success">Yanıtlandı</span>' : 
                            `<button class="btn btn-primary btn-sm" onclick="answerQuestion('${question._id}', '${question.title}', '${question.content}')">
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
function answerQuestion(questionId, title, content) {
    document.getElementById('answerQuestionId').value = questionId;
    document.getElementById('questionDetails').innerHTML = `
        <h6>${title}</h6>
        <p>${content}</p>
        <hr>
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
            
            if (target === '#my-courses') {
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