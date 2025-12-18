// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Global değişkenler
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    // Token varsa kullanıcı bilgilerini al
    if (authToken) {
        loadUserProfile();
    }
    
    // Form event listener'ları
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // İlk sayfa olarak ana sayfayı göster
    showPage('home');
    
    // Kursları yükle
    loadCourses();
});

// Sayfa gösterme fonksiyonu
function showPage(pageName) {
    // Tüm sayfaları gizle
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    
    // İstenen sayfayı göster
    document.getElementById(pageName + 'Page').classList.remove('d-none');
    
    // Sayfa özel işlemleri
    if (pageName === 'courses') {
        loadCourses();
    } else if (pageName === 'profile' && currentUser) {
        loadUserProfile();
    } else if (pageName === 'admin' && currentUser && currentUser.role === 'admin') {
        loadAdminDashboard();
    } else if (pageName === 'teacher' && currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin')) {
        loadTeacherDashboard();
    } else if (pageName === 'student' && currentUser && (currentUser.role === 'student' || currentUser.role === 'admin')) {
        loadStudentDashboard();
    } else if (pageName === 'courseDetail') {
        // Kurs detay sayfası için özel işlem yapılmayacak, dinamik yükleme
    } else if (pageName === 'lesson') {
        // Ders sayfası için özel işlem yapılmayacak, dinamik yükleme
    }
}

// Giriş işlemi
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Token'ı kaydet
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            
            // UI'ı güncelle
            updateAuthUI();
            showAlert('Giriş başarılı!', 'success');
            showPage('home');
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Kayıt işlemi
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Token'ı kaydet
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            
            // UI'ı güncelle
            updateAuthUI();
            showAlert('Kayıt başarılı!', 'success');
            showPage('home');
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Çıkış işlemi
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    showPage('home');
    showAlert('Çıkış yapıldı!', 'info');
}

// Auth UI güncelleme
function updateAuthUI() {
    const authNav = document.getElementById('authNav');
    const userNav = document.getElementById('userNav');
    const userName = document.getElementById('userName');
    const adminNavItem = document.getElementById('adminNavItem');
    const teacherNavItem = document.getElementById('teacherNavItem');
    
    if (currentUser) {
        authNav.classList.add('d-none');
        userNav.classList.remove('d-none');
        userName.textContent = currentUser.name;
        
        // Admin paneli göster/gizle
        if (currentUser.role === 'admin') {
            adminNavItem.classList.remove('d-none');
        } else {
            adminNavItem.classList.add('d-none');
        }
        
        // Öğretmen paneli göster/gizle
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            teacherNavItem.classList.remove('d-none');
        } else {
            teacherNavItem.classList.add('d-none');
        }
        
        // Öğrenci paneli göster/gizle
        const studentNavItem = document.getElementById('studentNavItem');
        if (currentUser.role === 'student' || currentUser.role === 'admin') {
            studentNavItem.classList.remove('d-none');
        } else {
            studentNavItem.classList.add('d-none');
        }
    } else {
        authNav.classList.remove('d-none');
        userNav.classList.add('d-none');
        adminNavItem.classList.add('d-none');
        teacherNavItem.classList.add('d-none');
        document.getElementById('studentNavItem').classList.add('d-none');
    }
}

// Kullanıcı profili yükleme
async function loadUserProfile() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            updateAuthUI();
            displayProfile(user);
        }
    } catch (error) {
        console.error('Profil yüklenirken hata:', error);
    }
}

// Profil gösterme
function displayProfile(user) {
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar">
                ${user.name.charAt(0).toUpperCase()}
            </div>
            <h3 class="text-center">${user.name}</h3>
            <p class="text-center text-muted">${user.email}</p>
            <p class="text-center">
                <span class="badge bg-primary">${getRoleText(user.role)}</span>
            </p>
            <hr>
            <h5>Kayıtlı Kurslar</h5>
            <div class="row">
                ${user.enrolledCourses.map(course => `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6>${course.title}</h6>
                                <p class="text-muted small">${course.description}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Kursları yükleme
async function loadCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/search`);
        const data = await response.json();
        
        if (response.ok) {
            displayCourses(data.courses);
        }
    } catch (error) {
        console.error('Kurslar yüklenirken hata:', error);
    }
}

// Kurs arama
async function searchCourses(page = 1) {
    const searchTerm = document.getElementById('courseSearch').value;
    const category = document.getElementById('categoryFilter').value;
    const level = document.getElementById('levelFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('q', searchTerm);
        if (category !== 'all') params.append('category', category);
        if (level !== 'all') params.append('level', level);
        if (priceFilter === 'free') {
            params.append('minPrice', '0');
            params.append('maxPrice', '0');
        } else if (priceFilter === 'paid') {
            params.append('minPrice', '0.01');
        }
        params.append('page', page);

        const response = await fetch(`${API_BASE_URL}/student/search?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            displayCourses(data.courses);
            displayPagination(data.currentPage, data.totalPages);
        }
    } catch (error) {
        console.error('Kurs arama hatası:', error);
    }
}

// Sayfalama gösterme
function displayPagination(currentPage, totalPages) {
    const paginationDiv = document.getElementById('coursePagination');
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let paginationHtml = '<nav><ul class="pagination">';
    
    // Önceki sayfa
    if (currentPage > 1) {
        paginationHtml += `<li class="page-item">
            <a class="page-link" href="#" onclick="searchCourses(${currentPage - 1})">Önceki</a>
        </li>`;
    }
    
    // Sayfa numaraları
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="searchCourses(${i})">${i}</a>
        </li>`;
    }
    
    // Sonraki sayfa
    if (currentPage < totalPages) {
        paginationHtml += `<li class="page-item">
            <a class="page-link" href="#" onclick="searchCourses(${currentPage + 1})">Sonraki</a>
        </li>`;
    }
    
    paginationHtml += '</ul></nav>';
    paginationDiv.innerHTML = paginationHtml;
}

// Kursları gösterme
function displayCourses(courses) {
    const coursesList = document.getElementById('coursesList');
    
    if (courses.length === 0) {
        coursesList.innerHTML = '<div class="col-12"><p class="text-center">Kurs bulunamadı.</p></div>';
        return;
    }
    
    coursesList.innerHTML = courses.map(course => `
        <div class="col-md-4 mb-4">
            <div class="card course-card h-100">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${course.title}</h5>
                    <p class="card-text">${course.description.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="course-level level-${course.level}">${getLevelText(course.level)}</span>
                        <span class="course-price">${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</span>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${course.instructor.name}<br>
                            <i class="fas fa-clock"></i> ${course.duration} dakika<br>
                            <i class="fas fa-users"></i> ${course.students.length} öğrenci
                        </small>
                        ${course.averageRating > 0 ? `
                            <div class="mt-1">
                                <span class="text-warning">
                                    ${generateStars(course.averageRating)}
                                </span>
                                <small class="text-muted">(${course.reviewCount} değerlendirme)</small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="mt-auto">
                        <button class="btn btn-outline-info btn-sm w-100 mb-2" onclick="showCourseDetail('${course._id}')">
                            Detayları Gör
                        </button>
                        ${currentUser ? `
                            <button class="btn btn-primary w-100" onclick="enrollCourse('${course._id}')">
                                Kursa Kayıt Ol
                            </button>
                        ` : `
                            <button class="btn btn-outline-primary w-100" onclick="showPage('login')">
                                Kayıt için giriş yapın
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Yıldız gösterimi
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Kursa kayıt olma
async function enrollCourse(courseId) {
    if (!authToken) {
        showAlert('Lütfen önce giriş yapın!', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            loadCourses(); // Kursları yeniden yükle
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Yardımcı fonksiyonlar
function getRoleText(role) {
    const roles = {
        'student': 'Öğrenci',
        'teacher': 'Öğretmen',
        'admin': 'Yönetici'
    };
    return roles[role] || role;
}

function getLevelText(level) {
    const levels = {
        'beginner': 'Başlangıç',
        'intermediate': 'Orta',
        'advanced': 'İleri'
    };
    return levels[level] || level;
}

// Alert gösterme
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}