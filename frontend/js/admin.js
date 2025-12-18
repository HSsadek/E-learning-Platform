// Admin Dashboard yükleme
async function loadAdminDashboard() {
    if (!authToken || currentUser.role !== 'admin') {
        showAlert('Admin yetkisi gereklidir!', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data.stats);
            updateRecentActivities(data.recentActivities);
        }
    } catch (error) {
        console.error('Dashboard yüklenirken hata:', error);
    }
}

// Dashboard istatistiklerini güncelle
function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('totalCourses').textContent = stats.totalCourses;
    document.getElementById('pendingCourses').textContent = stats.pendingCourses;
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
    const search = document.getElementById('userSearch').value;
    const role = document.getElementById('roleFilter').value;

    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (role !== 'all') params.append('role', role);

        const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
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
    }
}

// Kullanıcıları göster
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Kullanıcı bulunamadı</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${getRoleText(user.role)}</span></td>
            <td>
                ${user.isBanned ? 
                    '<span class="badge bg-danger">Banlandı</span>' : 
                    '<span class="badge bg-success">Aktif</span>'
                }
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editUserRole('${user._id}', '${user.role}')">
                    Rol Değiştir
                </button>
                ${!user.isBanned ? 
                    `<button class="btn btn-sm btn-outline-danger" onclick="banUser('${user._id}')">Banla</button>` :
                    `<button class="btn btn-sm btn-outline-success" onclick="unbanUser('${user._id}')">Ban Kaldır</button>`
                }
            </td>
        </tr>
    `).join('');
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
function banUser(userId) {
    document.getElementById('banUserId').value = userId;
    new bootstrap.Modal(document.getElementById('banUserModal')).show();
}

// Ban işlemi
document.getElementById('banUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('banUserId').value;
    const banReason = document.getElementById('banReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isBanned: true, banReason })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('banUserModal')).hide();
            document.getElementById('banReason').value = '';
            loadUsers();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
});

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
                        <button class="btn btn-primary mb-2" onclick="reviewCourse('${course._id}')">
                            İncele
                        </button><br>
                        <button class="btn btn-success mb-2" onclick="approveCourse('${course._id}')">
                            Onayla
                        </button><br>
                        <button class="btn btn-danger" onclick="rejectCourse('${course._id}')">
                            Reddet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Kurs inceleme
async function reviewCourse(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const course = await response.json();
            showCourseDetails(course);
        }
    } catch (error) {
        console.error('Kurs detayları yüklenirken hata:', error);
    }
}

// Kurs detaylarını göster
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

    content.innerHTML = announcements.map(announcement => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>${announcement.title}</h5>
                        <p>${announcement.content}</p>
                        <small class="text-muted">
                            Oluşturan: ${announcement.createdBy.name} | 
                            ${new Date(announcement.createdAt).toLocaleDateString('tr-TR')}
                        </small>
                    </div>
                    <div>
                        <span class="badge bg-${announcement.type}">${getAnnouncementTypeText(announcement.type)}</span>
                        <span class="badge bg-secondary">${getTargetAudienceText(announcement.targetAudience)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Tab değişikliklerini dinle
document.addEventListener('DOMContentLoaded', function() {
    const adminTabs = document.querySelectorAll('#adminTabs button[data-bs-toggle="tab"]');
    adminTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            
            if (target === '#users') {
                loadUsers();
            } else if (target === '#courses') {
                loadPendingCourses();
            } else if (target === '#announcements') {
                loadAnnouncements();
            }
        });
    });
});

// Yardımcı fonksiyonlar
function getRoleBadgeColor(role) {
    const colors = {
        'student': 'primary',
        'teacher': 'success',
        'admin': 'danger'
    };
    return colors[role] || 'secondary';
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
}