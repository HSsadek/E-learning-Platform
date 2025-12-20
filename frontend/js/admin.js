// Admin fonksiyonları - authToken global değişkenini kullanır

// Admin Dashboard yükleme
async function loadAdminDashboard() {
    console.log('loadAdminDashboard çağrıldı');
    console.log('authToken:', authToken ? 'var' : 'yok');
    console.log('currentUser:', currentUser);
    
    if (!authToken || !currentUser || currentUser.role !== 'admin') {
        console.log('Admin yetkisi yok, return');
        showAlert('Admin yetkisi gereklidir!', 'danger');
        return;
    }

    try {
        console.log('Admin dashboard API çağrısı yapılıyor...');
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Admin dashboard response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Admin dashboard verisi:', data);
            updateDashboardStats(data.stats);
            updateRecentActivities(data.recentActivities);
        } else {
            const errorData = await response.json();
            console.error('Admin dashboard hatası:', errorData);
        }
        
        // Kullanıcıları da yükle
        loadUsers();
    } catch (error) {
        console.error('Dashboard yüklenirken hata:', error);
    }
}

// Dashboard istatistiklerini güncelle
function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('totalCourses').textContent = stats.totalCourses;
    document.getElementById('pendingCourses').textContent = stats.pendingCourses;
    document.getElementById('pendingTeachers').textContent = stats.pendingTeachers || 0;
    document.getElementById('totalRevenue').textContent = stats.totalRevenue + ' TL';
}

// Son aktiviteleri güncelle
function updateRecentActivities(activities) {
    const recentUsersDiv = document.getElementById('recentUsers');
    const pendingCoursesDiv = document.getElementById('pendingCoursesList');

    // Son kullanıcılar
    if (activities.recentUsers.length === 0) {
        recentUsersDiv.innerHTML = '<p class="text-muted">Henüz yeni kullanıcı yok</p>';
    } else {
        recentUsersDiv.innerHTML = activities.recentUsers.map(user => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${user.name}</strong><br>
                    <small class="text-muted">${user.email}</small>
                </div>
                <span class="badge bg-${getRoleBadgeColor(user.role)}">${getRoleText(user.role)}</span>
            </div>
        `).join('');
    }

    // Bekleyen kurslar
    if (activities.recentCourses.length === 0) {
        pendingCoursesDiv.innerHTML = '<p class="text-muted">Bekleyen kurs yok</p>';
    } else {
        pendingCoursesDiv.innerHTML = activities.recentCourses.map(course => `
            <div class="mb-2">
                <strong>${course.title}</strong><br>
                <small class="text-muted">Eğitmen: ${course.instructor.name}</small>
            </div>
        `).join('');
    }
}

// Kullanıcıları yükle
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
        showAlert('Kullanıcılar yüklenirken hata oluştu!', 'danger');
    }
}

// Kullanıcıları göster
function displayUsers(users) {
    console.log('Kullanıcı verileri:', users); // Debug için
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) {
        console.error('usersTableBody elementi bulunamadı!');
        return;
    }
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Kullanıcı bulunamadı</td></tr>';
        return;
    }

    const baseUrl = API_BASE_URL.replace('/api', '');

    const tableRows = users.map(user => {
        // Profil fotoğrafı HTML'i
        const profileImageHtml = user.profileImage ? 
            `<img src="${baseUrl}${user.profileImage}" alt="Profil Resmi" 
                 class="rounded-circle me-3" 
                 style="width: 40px; height: 40px; object-fit: cover; border: 2px solid #667eea;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="profile-placeholder rounded-circle me-3 d-none" style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold;">
                ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
             </div>` :
            `<div class="profile-placeholder rounded-circle me-3" style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold;">
                ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
             </div>`;

        // Tarih formatı
        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor';

        return `
            <tr>
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        ${profileImageHtml}
                        <span class="fw-bold">${user.name || 'İsimsiz'}</span>
                    </div>
                </td>
                <td class="align-middle">
                    <span class="text-muted">${user.email || 'Email yok'}</span>
                </td>
                <td class="align-middle">
                    <span class="badge bg-${getRoleBadgeColor(user.role)}">
                        ${getRoleText(user.role)}
                    </span>
                </td>
                <td class="align-middle">
                    <span class="badge bg-${user.isBanned ? 'danger' : 'success'}">
                        ${user.isBanned ? 'Banlandı' : 'Aktif'}
                    </span>
                </td>
                <td class="align-middle">
                    <small>${createdDate}</small>
                </td>
                <td class="align-middle">
                    <div class="btn-group" role="group" aria-label="Kullanıcı işlemleri">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="editUserRole('${user._id}', '${user.role}')" 
                                title="Rol Değiştir">
                            <i class="fas fa-user-cog"></i>
                        </button>
                        ${!user.isBanned ? 
                            `<button class="btn btn-sm btn-outline-danger" 
                                     onclick="banUser('${user._id}')" 
                                     title="Kullanıcıyı Banla">
                                <i class="fas fa-ban"></i>
                            </button>` :
                            `<button class="btn btn-sm btn-outline-success" 
                                     onclick="unbanUser('${user._id}')" 
                                     title="Ban Kaldır">
                                <i class="fas fa-check"></i>
                            </button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = tableRows;
    console.log('Tablo güncellendi, kullanıcı sayısı:', users.length);
}

// Kullanıcı rolü düzenleme
function editUserRole(userId, currentRole) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('newRole').value = currentRole;
    new bootstrap.Modal(document.getElementById('userRoleModal')).show();
}

// Kullanıcı rolü güncelleme
document.getElementById('userRoleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const newRole = document.getElementById('newRole').value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ role: newRole })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('userRoleModal')).hide();
            loadUsers();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Kullanıcı banlama
async function banUser(userId) {
    const confirmBan = confirm('Bu kullanıcıyı banlamak istediğinizden emin misiniz?');
    if (!confirmBan) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isBanned: true, banReason: 'Admin tarafından banlandı' })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            loadUsers();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}



// Ban kaldırma
async function unbanUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isBanned: false })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            loadUsers();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Bekleyen kursları yükle
async function loadPendingCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses/pending`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const courses = await response.json();
            displayPendingCourses(courses);
        }
    } catch (error) {
        console.error('Bekleyen kurslar yüklenirken hata:', error);
    }
}

// Bekleyen kursları göster
function displayPendingCourses(courses) {
    const content = document.getElementById('pendingCoursesContent');
    
    if (courses.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Onay bekleyen kurs bulunmuyor.</div>';
        return;
    }

    content.innerHTML = courses.map(course => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5>${course.title}</h5>
                        <p class="text-muted">${course.description}</p>
                        <p><strong>Eğitmen:</strong> ${course.instructor.name}</p>
                        <p><strong>Kategori:</strong> ${course.category}</p>
                        <p><strong>Seviye:</strong> ${getLevelText(course.level)}</p>
                        <p><strong>Süre:</strong> ${course.duration} dakika</p>
                        <p><strong>Fiyat:</strong> ${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-info mb-2" onclick="previewPendingCourse('${course._id}')">
                            <i class="fas fa-eye me-1"></i> İncele
                        </button><br>
                        <button class="btn btn-success mb-2" onclick="approveCourse('${course._id}')">
                            <i class="fas fa-check me-1"></i> Onayla
                        </button><br>
                        <button class="btn btn-danger" onclick="rejectCourse('${course._id}')">
                            <i class="fas fa-times me-1"></i> Reddet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Kurs inceleme (sadece detay gösterme) - Admin için
async function previewPendingCourse(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const course = await response.json();
            showCoursePreview(course);
        }
    } catch (error) {
        console.error('Kurs detayları yüklenirken hata:', error);
    }
}

// Kurs önizleme (sadece inceleme - değerlendirme yok)
function showCoursePreview(course) {
    const detailsDiv = document.getElementById('coursePreviewDetails');
    detailsDiv.innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h4 class="mb-3">${course.title}</h4>
                <p class="text-muted">${course.description}</p>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p class="mb-1"><strong><i class="fas fa-user me-2"></i>Eğitmen:</strong> ${course.instructor.name}</p>
                        <p class="mb-1"><strong><i class="fas fa-folder me-2"></i>Kategori:</strong> ${course.category}</p>
                        <p class="mb-1"><strong><i class="fas fa-signal me-2"></i>Seviye:</strong> ${getLevelText(course.level)}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong><i class="fas fa-clock me-2"></i>Süre:</strong> ${course.duration} dakika</p>
                        <p class="mb-1"><strong><i class="fas fa-tag me-2"></i>Fiyat:</strong> ${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</p>
                        <p class="mb-1"><strong><i class="fas fa-book me-2"></i>Ders Sayısı:</strong> ${course.lessons ? course.lessons.length : 0}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <hr>
        
        <h6><i class="fas fa-list me-2"></i>Ders İçerikleri</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ders Başlığı</th>
                        <th>Süre</th>
                        <th>Video</th>
                    </tr>
                </thead>
                <tbody>
                    ${course.lessons && course.lessons.length > 0 ? course.lessons.map((lesson, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${lesson.title}</td>
                            <td>${lesson.duration} dk</td>
                            <td>${lesson.videoUrl ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-muted"></i>'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" class="text-center text-muted">Ders eklenmemiş</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    
    new bootstrap.Modal(document.getElementById('coursePreviewModal')).show();
}

// Kurs detaylarını göster (değerlendirme modalı için)
function showCourseDetails(course) {
    const detailsDiv = document.getElementById('courseDetails');
    detailsDiv.innerHTML = `
        <h5>${course.title}</h5>
        <p><strong>Açıklama:</strong> ${course.description}</p>
        <p><strong>Eğitmen:</strong> ${course.instructor.name}</p>
        <p><strong>Kategori:</strong> ${course.category}</p>
        <p><strong>Seviye:</strong> ${getLevelText(course.level)}</p>
        <p><strong>Süre:</strong> ${course.duration} dakika</p>
        <p><strong>Fiyat:</strong> ${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</p>
        <h6>Dersler:</h6>
        <ul>
            ${course.lessons.map(lesson => `
                <li><strong>${lesson.title}</strong> (${lesson.duration} dk)</li>
            `).join('')}
        </ul>
    `;
    
    document.getElementById('approvalCourseId').value = course._id;
    new bootstrap.Modal(document.getElementById('courseApprovalModal')).show();
}

// Kurs onaylama/reddetme
document.getElementById('courseApprovalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const courseId = document.getElementById('approvalCourseId').value;
    const status = document.getElementById('approvalStatus').value;
    const rejectionReason = document.getElementById('rejectionReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status, rejectionReason })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('courseApprovalModal')).hide();
            loadPendingCourses();
            loadAdminDashboard(); // Dashboard'u güncelle
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Onay durumu değiştiğinde red sebebi alanını göster/gizle
document.getElementById('approvalStatus').addEventListener('change', function() {
    const rejectionDiv = document.getElementById('rejectionReasonDiv');
    if (this.value === 'rejected') {
        rejectionDiv.style.display = 'block';
        document.getElementById('rejectionReason').required = true;
    } else {
        rejectionDiv.style.display = 'none';
        document.getElementById('rejectionReason').required = false;
    }
});

// Hızlı onaylama
async function approveCourse(courseId) {
    if (confirm('Bu kursu onaylamak istediğinizden emin misiniz?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: 'approved' })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(data.message, 'success');
                loadPendingCourses();
                loadAdminDashboard();
            } else {
                showAlert(data.message, 'danger');
            }
        } catch (error) {
            showAlert('Bağlantı hatası!', 'danger');
        }
    }
}

// Hızlı reddetme
async function rejectCourse(courseId) {
    const reason = prompt('Red sebebini giriniz:');
    if (reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: 'rejected', rejectionReason: reason })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(data.message, 'success');
                loadPendingCourses();
                loadAdminDashboard();
            } else {
                showAlert(data.message, 'danger');
            }
        } catch (error) {
            showAlert('Bağlantı hatası!', 'danger');
        }
    }
}

// Duyuru oluşturma modalını göster
function showCreateAnnouncementModal() {
    document.getElementById('announcementForm').reset();
    new bootstrap.Modal(document.getElementById('announcementModal')).show();
}

// Duyuru oluşturma
document.getElementById('announcementForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    const type = document.getElementById('announcementType').value;
    const targetAudience = document.getElementById('announcementTarget').value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/announcements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, content, type, targetAudience })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Duyuru oluşturuldu!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('announcementModal')).hide();
            loadAnnouncements();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Duyuruları yükle
async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/announcements`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const announcements = await response.json();
            displayAnnouncements(announcements);
        }
    } catch (error) {
        console.error('Duyurular yüklenirken hata:', error);
    }
}

// Duyuruları göster
function displayAnnouncements(announcements) {
    const content = document.getElementById('announcementsContent');

    if (announcements.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Henüz duyuru bulunmuyor.</div>';
        return;
    }

    content.innerHTML = announcements
        .map(
            (announcement) => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5>${announcement.title}</h5>
                        <p>${announcement.content}</p>
                        <small class="text-muted">
                            Oluşturan: ${announcement.createdBy ? announcement.createdBy.name : 'Admin'} | 
                            ${new Date(announcement.createdAt).toLocaleDateString('tr-TR')}
                        </small>
                    </div>
                    <div class="d-flex flex-column align-items-end gap-2">
                        <div>
                            <span class="badge bg-${announcement.type}">${getAnnouncementTypeText(announcement.type)}</span>
                            <span class="badge bg-secondary">${getTargetAudienceText(announcement.targetAudience)}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement('${announcement._id}', '${announcement.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash me-1"></i> Sil
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
        )
        .join('');
}

// Duyuru silme
async function deleteAnnouncement(id, title) {
    if (!confirm(`"${title}" duyurusunu silmek istediğinizden emin misiniz?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/announcements/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Duyuru silindi!', 'success');
            loadAnnouncements();
        } else {
            showAlert(data.message || 'Duyuru silinemedi!', 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Tab değişikliklerini dinle
document.addEventListener('DOMContentLoaded', function() {
    const adminTabs = document.querySelectorAll('#adminTabs button[data-bs-toggle="tab"]');
    adminTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            
            if (target === '#dashboard') {
                loadAdminDashboard();
            } else if (target === '#users') {
                loadUsers();
            } else if (target === '#courses') {
                loadPendingCourses();
            } else if (target === '#categories') {
                loadAdminCategories();
            } else if (target === '#teacher-applications') {
                loadTeacherApplications();
            } else if (target === '#announcements') {
                loadAnnouncements();
            }
        });
    });
});

// Yardımcı fonksiyonlar
// Öğretmen başvurularını yükle
async function loadTeacherApplications() {
    if (!authToken) {
        showAlert('Giriş yapmanız gerekiyor!', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/teacher-applications`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const applications = await response.json();
            displayTeacherApplications(applications);
        }
    } catch (error) {
        console.error('Öğretmen başvuruları yüklenirken hata:', error);
    }
}

// Öğretmen başvurularını göster
function displayTeacherApplications(applications) {
    const content = document.getElementById('teacherApplicationsContent');
    
    if (applications.length === 0) {
        content.innerHTML = '<div class="alert alert-info">Bekleyen öğretmen başvurusu bulunmuyor.</div>';
        return;
    }

    content.innerHTML = applications.map(application => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5>${application.name}</h5>
                        <p><strong>Email:</strong> ${application.email}</p>
                        <p><strong>Başvuru Tarihi:</strong> ${new Date(application.teacherApplication.appliedAt).toLocaleDateString('tr-TR')}</p>
                        <div class="alert alert-light">
                            <i class="fas fa-info-circle me-2"></i>
                            Bu kullanıcı öğretmen olmak için başvuruda bulunmuştur.
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-primary mb-2" onclick="reviewTeacherApplication('${application._id}', '${application.name}', '${application.email}')">
                            İncele
                        </button><br>
                        <button class="btn btn-success mb-2" onclick="approveTeacherApplication('${application._id}')">
                            Hızlı Onayla
                        </button><br>
                        <button class="btn btn-danger" onclick="rejectTeacherApplication('${application._id}')">
                            Hızlı Reddet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Öğretmen başvurusunu incele
function reviewTeacherApplication(userId, name, email) {
    document.getElementById('applicationUserId').value = userId;
    document.getElementById('teacherApplicationDetails').innerHTML = `
        <h6>${name}</h6>
        <p><strong>Email:</strong> ${email}</p>
    `;
    new bootstrap.Modal(document.getElementById('teacherApplicationModal')).show();
}

// Öğretmen başvuru onay durumu değiştiğinde
document.getElementById('applicationStatus').addEventListener('change', function() {
    const rejectionDiv = document.getElementById('applicationRejectionDiv');
    if (this.value === 'rejected') {
        rejectionDiv.style.display = 'block';
        document.getElementById('applicationRejectionReason').required = true;
    } else {
        rejectionDiv.style.display = 'none';
        document.getElementById('applicationRejectionReason').required = false;
    }
});

// Öğretmen başvuru inceleme formu
document.getElementById('teacherApplicationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('applicationUserId').value;
    const status = document.getElementById('applicationStatus').value;
    const rejectionReason = document.getElementById('applicationRejectionReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/teacher-applications/${userId}/review`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status, rejectionReason })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('teacherApplicationModal')).hide();
            loadTeacherApplications();
            loadAdminDashboard();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

// Hızlı onaylama - Modern modal ile
async function approveTeacherApplication(userId) {
    try {
        // Kullanıcı bilgilerini al
        const url = `${API_BASE_URL}/admin/users/${userId}`;
        console.log('Onaylama için kullanıcı bilgisi isteniyor:', url); // Debug
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            showApprovalModal(user);
        } else {
            showAlert('Kullanıcı bilgileri alınamadı!', 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Onay modalını göster
function showApprovalModal(user) {
    const modal = new bootstrap.Modal(document.getElementById('teacherApprovalModal'));
    document.getElementById('approvalTeacherName').textContent = user.name;
    
    document.getElementById('confirmApprovalBtn').onclick = () => {
        processTeacherApproval(user._id);
        modal.hide();
    };
    
    modal.show();
}

// Onay işlemini gerçekleştir
async function processTeacherApproval(userId) {
    const confirmBtn = document.getElementById('confirmApprovalBtn');
    const originalText = confirmBtn.innerHTML;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Onaylanıyor...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/teacher-applications/${userId}/review`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'approved' })
        });

        const data = await response.json();

        if (response.ok) {
            // Başarı animasyonu ile modern alert
            showModernAlert({
                type: 'success',
                title: 'Başvuru Onaylandı!',
                message: 'Öğretmen başvurusu başarıyla onaylandı. Kullanıcıya email bildirimi gönderildi.',
                icon: 'fas fa-check-circle',
                duration: 5000
            });
            
            loadTeacherApplications();
            loadAdminDashboard();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Hızlı reddetme - Modern modal ile
async function rejectTeacherApplication(userId) {
    try {
        // Kullanıcı bilgilerini al
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            showRejectionModal(user);
        } else {
            showAlert('Kullanıcı bilgileri alınamadı!', 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Red modalını göster
function showRejectionModal(user) {
    const modal = new bootstrap.Modal(document.getElementById('teacherRejectionModal'));
    document.getElementById('rejectionTeacherName').textContent = user.name;
    document.getElementById('rejectionReasonText').value = '';
    
    document.getElementById('confirmRejectionBtn').onclick = () => {
        const reason = document.getElementById('rejectionReasonText').value.trim();
        if (reason) {
            processTeacherRejection(user._id, reason);
            modal.hide();
        } else {
            showAlert('Lütfen red sebebini yazın!', 'warning');
        }
    };
    
    modal.show();
}

// Red işlemini gerçekleştir
async function processTeacherRejection(userId, reason) {
    const confirmBtn = document.getElementById('confirmRejectionBtn');
    const originalText = confirmBtn.innerHTML;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Reddediliyor...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/teacher-applications/${userId}/review`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'rejected', rejectionReason: reason })
        });

        const data = await response.json();

        if (response.ok) {
            // Başarı animasyonu ile modern alert
            showModernAlert({
                type: 'warning',
                title: 'Başvuru Reddedildi',
                message: 'Öğretmen başvurusu reddedildi. Kullanıcıya red sebebi ile birlikte email bildirimi gönderildi.',
                icon: 'fas fa-exclamation-triangle',
                duration: 5000
            });
            
            loadTeacherApplications();
            loadAdminDashboard();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

function getRoleBadgeColor(role) {
    const colors = {
        'student': 'primary',
        'teacher': 'success',
        'admin': 'danger',
        'pending_teacher': 'warning'
    };
    return colors[role] || 'secondary';
}

function getRoleText(role) {
    const roles = {
        'student': 'Öğrenci',
        'teacher': 'Öğretmen',
        'admin': 'Yönetici',
        'pending_teacher': 'Öğretmen Başvurusu'
    };
    return roles[role] || role;
}

function getAnnouncementTypeText(type) {
    const types = {
        'info': 'Bilgi',
        'warning': 'Uyarı',
        'success': 'Başarı',
        'danger': 'Tehlike'
    };
    return types[type] || type;
}

function getTargetAudienceText(audience) {
    const audiences = {
        'all': 'Herkese',
        'students': 'Öğrenciler',
        'teachers': 'Öğretmenler',
        'admins': 'Adminler'
    };
    return audiences[audience] || audience;
}// Modern alert gösterme
function showModernAlert({ type, title, message, icon, duration = 4000 }) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show modern-alert`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 350px;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border: none;
        border-radius: 12px;
        animation: slideInRight 0.3s ease;
    `;
    
    alertDiv.innerHTML = `
        <div class="d-flex align-items-start">
            <div class="me-3 mt-1">
                <i class="${icon} fa-2x"></i>
            </div>
            <div class="flex-grow-1">
                <h6 class="alert-heading mb-1">${title}</h6>
                <p class="mb-0">${message}</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Otomatik kapat
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, duration);
}


// ==================== KATEGORİ YÖNETİMİ ====================

// Kategorileri yükle
async function loadAdminCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const categories = await response.json();
            displayAdminCategories(categories);
        }
    } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error);
    }
}

// Kategorileri göster
function displayAdminCategories(categories) {
    const content = document.getElementById('categoriesContent');
    
    if (!content) return;
    
    if (categories.length === 0) {
        content.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-folder-open fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">Henüz kategori eklenmemiş</h5>
                <button class="btn btn-primary mt-3" onclick="showAddCategoryModal()">
                    <i class="fas fa-plus me-2"></i>İlk Kategoriyi Ekle
                </button>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="mb-0">Kategoriler (${categories.length})</h5>
            <button class="btn btn-primary" onclick="showAddCategoryModal()">
                <i class="fas fa-plus me-2"></i>Yeni Kategori
            </button>
        </div>
        <div class="row">
            ${categories.map(cat => `
                <div class="col-md-4 mb-3">
                    <div class="card h-100" style="border: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="me-3 d-flex align-items-center justify-content-center" 
                                     style="width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                    <i class="fas fa-folder text-white"></i>
                                </div>
                                <div>
                                    <h6 class="mb-0">${cat.name}</h6>
                                    <span class="badge ${cat.isActive ? 'bg-success' : 'bg-secondary'}">${cat.isActive ? 'Aktif' : 'Pasif'}</span>
                                </div>
                            </div>
                            <p class="text-muted small mb-3">${cat.description || 'Açıklama yok'}</p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="editCategory('${cat._id}', '${cat.name}', '${(cat.description || '').replace(/'/g, "\\'")}', ${cat.isActive})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-${cat.isActive ? 'warning' : 'success'}" onclick="toggleCategoryStatus('${cat._id}', ${!cat.isActive})">
                                    <i class="fas fa-${cat.isActive ? 'eye-slash' : 'eye'}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${cat._id}', '${cat.name}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Kategori ekleme modalını göster
function showAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Yeni Kategori Ekle';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryIsActive').checked = true;
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Kategori düzenleme
function editCategory(id, name, description, isActive) {
    document.getElementById('categoryModalTitle').textContent = 'Kategori Düzenle';
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryDescription').value = description;
    document.getElementById('categoryIsActive').checked = isActive;
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Kategori kaydet
document.addEventListener('DOMContentLoaded', function() {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('categoryId').value;
            
            const data = {
                name: document.getElementById('categoryName').value,
                description: document.getElementById('categoryDescription').value,
                isActive: document.getElementById('categoryIsActive').checked
            };

            try {
                const url = id ? `${API_BASE_URL}/admin/categories/${id}` : `${API_BASE_URL}/admin/categories`;
                const method = id ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert(id ? 'Kategori güncellendi!' : 'Kategori eklendi!', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                    loadAdminCategories();
                } else {
                    showAlert(result.message || 'Hata oluştu!', 'danger');
                }
            } catch (error) {
                showAlert('Bağlantı hatası!', 'danger');
            }
        });
    }
});

// Kategori durumunu değiştir
async function toggleCategoryStatus(id, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isActive: newStatus })
        });

        if (response.ok) {
            showAlert(`Kategori ${newStatus ? 'aktif' : 'pasif'} yapıldı!`, 'success');
            loadAdminCategories();
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Kategori sil
async function deleteCategory(id, name) {
    if (!confirm(`"${name}" kategorisini silmek istediğinizden emin misiniz?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Kategori silindi!', 'success');
            loadAdminCategories();
        } else {
            showAlert(data.message || 'Hata oluştu!', 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}
