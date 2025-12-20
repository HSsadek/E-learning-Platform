// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Global değişkenler
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Token doğrulama ve API çağrısı helper fonksiyonu
async function makeAuthenticatedRequest(url, options = {}) {
    if (!authToken) {
        throw new Error('Token bulunamadı');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(url, mergedOptions);
    
    // Token geçersizse çıkış yap
    if (response.status === 401 || response.status === 403) {
        logout(false);
        throw new Error('Oturum süresi doldu');
    }
    
    return response;
}

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async function() {
    // Form event listener'ları
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
    
    // Profil form event listener'ları
    const profileInfoForm = document.getElementById('profileInfoForm');
    if (profileInfoForm) {
        profileInfoForm.addEventListener('submit', handleProfileUpdate);
    }
    
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }
    
    const socialLinksForm = document.getElementById('socialLinksForm');
    if (socialLinksForm) {
        socialLinksForm.addEventListener('submit', handleSocialLinksUpdate);
    }
    
    // Şifre görünürlük toggle'ları
    setupPasswordToggle('toggleLoginPassword', 'loginPassword');
    setupPasswordToggle('toggleRegisterPassword', 'registerPassword');
    
    // İlk sayfa olarak ana sayfayı göster
    showPage('home');
    
    // Token varsa kullanıcı bilgilerini al (önce bu)
    if (authToken) {
        await loadUserProfile();
    }
    
    // UI'ı güncelle
    updateAuthUI();
    
    // Kursları yükle (kullanıcı bilgileri yüklendikten sonra)
    loadCourses();
});

// Sayfa gösterme fonksiyonu
function showPage(pageName) {
    console.log('showPage çağrıldı, pageName:', pageName, 'currentUser:', currentUser);
    
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
        // Profil resmi tab'ına geçildiğinde resmi yükle
        setTimeout(() => {
            loadCurrentProfileImage();
        }, 100);
    } else if (pageName === 'admin' && currentUser && currentUser.role === 'admin') {
        loadAdminDashboard();
    } else if (pageName === 'teacher' && currentUser) {
        // Öğretmen veya admin olabilir
        console.log('Teacher sayfası açılıyor, rol:', currentUser.role);
        console.log('loadTeacherDashboard fonksiyonu var mı:', typeof loadTeacherDashboard);
        if (typeof loadTeacherDashboard === 'function') {
            console.log('loadTeacherDashboard çağrılıyor...');
            loadTeacherDashboard();
        } else {
            console.error('loadTeacherDashboard fonksiyonu bulunamadı');
        }
    } else if (pageName === 'teacher') {
        console.log('Teacher sayfası açılamadı - currentUser:', currentUser);
    } else if (pageName === 'student' && currentUser) {
        // student.js'deki fonksiyonu çağır
        console.log('Student sayfası açılıyor, rol:', currentUser.role);
        if (typeof loadStudentDashboard === 'function') {
            loadStudentDashboard();
        } else {
            console.error('loadStudentDashboard fonksiyonu bulunamadı');
        }
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
    
    console.log('Giriş denemesi:', { email, password: '***' });
    
    // Boş alan kontrolü
    if (!email || !password) {
        showAlert('Email ve şifre alanları boş bırakılamaz!', 'danger');
        return;
    }
    
    try {
        const requestBody = { email, password };
        console.log('Gönderilen veri:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            // Token'ı kaydet
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            
            console.log('Giriş başarılı, kullanıcı:', currentUser);
            
            // UI'ı güncelle
            updateAuthUI();
            
            // Kursları yeniden yükle (buton durumları güncellensin)
            loadCourses();
            
            showAlert('Giriş başarılı!', 'success');
            showPage('home');
        } else {
            console.error('Giriş hatası:', data);
            showAlert(data.message || 'Giriş başarısız!', 'danger');
        }
    } catch (error) {
        console.error('Bağlantı hatası:', error);
        showAlert('Bağlantı hatası! Backend sunucusu çalışıyor mu?', 'danger');
    }
}

// Öğretmen alanlarını göster/gizle
function toggleTeacherFields() {
    const role = document.getElementById('registerRole').value;
    const teacherFields = document.getElementById('teacherFields');
    
    if (role === 'teacher') {
        teacherFields.classList.remove('d-none');
    } else {
        teacherFields.classList.add('d-none');
    }
}

// Kayıt işlemi
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    const requestData = { name, email, password, role };
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Token'ı kaydet
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            
            // UI'ı güncelle
            updateAuthUI();
            showAlert(data.message, 'success');
            showPage('home');
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Çıkış işlemi
function logout(showMessage = true) {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    
    // Kursları yeniden yükle (buton durumları güncellensin)
    loadCourses();
    
    showPage('home');
    if (showMessage) {
        showAlert('Çıkış yapıldı!', 'info');
    }
}

// Auth UI güncelleme
function updateAuthUI() {
    console.log('updateAuthUI çağrıldı, currentUser:', currentUser); // Debug
    const authNav = document.getElementById('authNav');
    const userNav = document.getElementById('userNav');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const adminNavItem = document.getElementById('adminNavItem');
    const teacherNavItem = document.getElementById('teacherNavItem');
    const registerButton = document.getElementById('registerButton');
    console.log('registerButton elementi:', registerButton); // Debug
    
    if (currentUser) {
        authNav.classList.add('d-none');
        userNav.classList.remove('d-none');
        userName.textContent = currentUser.name;
        
        // Kullanıcı avatarını güncelle
        if (userAvatar) {
            if (currentUser.profileImage) {
                userAvatar.innerHTML = `<img src="${API_BASE_URL.replace('/api', '')}${currentUser.profileImage}" 
                    class="rounded-circle" 
                    style="width: 32px; height: 32px; object-fit: cover; border: 2px solid #667eea;">`;
            } else {
                userAvatar.innerHTML = `<div class="rounded-circle d-flex align-items-center justify-content-center" 
                    style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 14px;">
                    ${currentUser.name.charAt(0).toUpperCase()}
                </div>`;
            }
        }
        
        // Giriş yapmış kullanıcılar için "Hemen Başla" butonunu gizle
        if (registerButton) {
            registerButton.style.display = 'none';
        }
        
        // Admin paneli göster/gizle
        if (currentUser.role === 'admin') {
            adminNavItem.classList.remove('d-none');
        } else {
            adminNavItem.classList.add('d-none');
        }
        
        // Öğretmen paneli göster/gizle (admin için gizle, sadece öğretmenler görsün)
        if (currentUser.role === 'teacher' && currentUser.role !== 'pending_teacher') {
            teacherNavItem.classList.remove('d-none');
        } else {
            teacherNavItem.classList.add('d-none');
        }
        
        // Öğrenci paneli göster/gizle (admin için gizle, sadece öğrenciler görsün)
        const studentNavItem = document.getElementById('studentNavItem');
        if ((currentUser.role === 'student' || currentUser.role === 'pending_teacher') && currentUser.role !== 'admin') {
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
        
        // Avatar'ı sıfırla
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user-circle" style="font-size: 24px;"></i>';
        }
        
        // Giriş yapmamış kullanıcılar için "Hemen Başla" butonunu göster
        if (registerButton) {
            registerButton.style.display = 'inline-block';
            registerButton.disabled = false;
            registerButton.classList.remove('disabled');
        }
    }
}

// Kullanıcı profili yükleme
async function loadUserProfile() {
    if (!authToken) {
        return;
    }
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/users/profile`);
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            updateAuthUI();
            displayProfile(user);
        }
    } catch (error) {
        // Hata durumunda sessizce devam et
        console.log('Profil yüklenemedi, giriş yapılmamış durumda devam ediliyor');
    }
}

// Profil gösterme
function displayProfile(user) {
    // Yeni arayüzde genel bilgiler formu ve sağdaki özet alanı kullanılıyor
    // Form alanlarını dolduralım
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const locationInput = document.getElementById('profileLocation');
    const websiteInput = document.getElementById('profileWebsite');
    const bioInput = document.getElementById('profileBio');

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (locationInput) locationInput.value = user.location || '';
    if (websiteInput) websiteInput.value = user.website || '';
    if (bioInput) bioInput.value = user.bio || '';

    // Sosyal medya linklerini doldur
    const twitterInput = document.getElementById('twitterLink');
    const linkedinInput = document.getElementById('linkedinLink');
    const githubInput = document.getElementById('githubLink');

    if (user.socialLinks) {
        if (twitterInput) twitterInput.value = user.socialLinks.twitter || '';
        if (linkedinInput) linkedinInput.value = user.socialLinks.linkedin || '';
        if (githubInput) githubInput.value = user.socialLinks.github || '';
    }

    // Sağ taraftaki profil özeti
    const profilePreview = document.getElementById('profilePreview');
    if (profilePreview) {
        const baseUrl = API_BASE_URL.replace('/api', '');
        const profileImageHtml = user.profileImage ? 
            `<img src="${baseUrl}${user.profileImage}" alt="Profil Resmi" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea;">` :
            `<div class="profile-placeholder mb-3" style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; margin: 0 auto;">
                ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>`;

        profilePreview.innerHTML = `
            <div class="mb-3">
                ${profileImageHtml}
                <h5 class="mb-0 mt-2">${user.name}</h5>
                <small class="text-muted">${user.email}</small>
            </div>
            <p class="mb-1">
                <span class="badge bg-${user.role === 'pending_teacher' ? 'warning' : 'primary'}">
                    ${getRoleText(user.role)}
                </span>
            </p>
            ${user.bio ? `<p class="mt-2 small">${user.bio}</p>` : ''}
            ${user.location ? `<p class="mb-1 small"><i class="fas fa-map-marker-alt me-1"></i>${user.location}</p>` : ''}
            ${user.website ? `<p class="mb-1 small"><i class="fas fa-globe me-1"></i><a href="${user.website}" target="_blank" class="text-decoration-none">Website</a></p>` : ''}
        `;
    }

    // Profil resmi sekmesindeki mevcut resmi de güncelle
    setTimeout(() => {
        loadCurrentProfileImage();
    }, 100);
}

// Kursları yükleme (Ana kurslar sayfası için - tüm kurslar)
async function loadCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/search`);
        const data = await response.json();
        
        if (response.ok) {
            // Backend doğrudan kurs dizisini döndürüyor, courses anahtarı yok
            displayCourses(data);
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
            // Backend doğrudan kurs dizisini döndürüyor, courses anahtarı yok
            displayCourses(data);
            // Sayfalama bilgisi varsa kullan, yoksa varsayılan değerler
            displayPagination(data.currentPage || 1, data.totalPages || 1);
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
    console.log('displayCourses çağrıldı, currentUser:', currentUser); // Debug
    const coursesList = document.getElementById('coursesList');
    
    // courses parametresinin undefined veya null olma durumunu kontrol et
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
        coursesList.innerHTML = '<div class="col-12"><p class="text-center">Kurs bulunamadı.</p></div>';
        return;
    }
    
    coursesList.innerHTML = courses.map(course => `
        <div class="col-md-4 mb-4">
            <div class="card course-card h-100 shadow-sm border-0" style="border-radius: 15px; overflow: hidden; transition: transform 0.3s, box-shadow 0.3s;">
                <div class="card-header bg-gradient text-white p-3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="d-flex justify-content-between align-items-start">
                        <span class="badge bg-light text-dark">${getLevelText(course.level)}</span>
                        <span class="badge ${course.price === 0 ? 'bg-success' : 'bg-warning text-dark'}">${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}</span>
                    </div>
                    <h5 class="card-title mt-2 mb-0 text-white">${course.title}</h5>
                </div>
                <div class="card-body d-flex flex-column">
                    <p class="card-text text-muted small">${course.description.substring(0, 80)}...</p>
                    
                    <!-- Eğitmen Bilgisi -->
                    <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
                        ${course.instructor.profileImage ? 
                            `<img src="${API_BASE_URL.replace('/api', '')}${course.instructor.profileImage}" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;">` :
                            `<div class="rounded-circle me-2 bg-primary text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-weight: bold;">${course.instructor.name.charAt(0).toUpperCase()}</div>`
                        }
                        <div>
                            <small class="fw-bold d-block">${course.instructor.name}</small>
                            <small class="text-muted">Eğitmen</small>
                        </div>
                    </div>
                    
                    <!-- Kurs İstatistikleri -->
                    <div class="row text-center mb-3 g-2">
                        <div class="col-4">
                            <div class="p-2 bg-light rounded">
                                <i class="fas fa-clock text-primary"></i>
                                <small class="d-block text-muted">${course.duration} dk</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="p-2 bg-light rounded">
                                <i class="fas fa-users text-success"></i>
                                <small class="d-block text-muted">${course.students.length}</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="p-2 bg-light rounded">
                                <i class="fas fa-book text-info"></i>
                                <small class="d-block text-muted">${course.lessons ? course.lessons.length : 0} ders</small>
                            </div>
                        </div>
                    </div>
                    
                    ${course.averageRating > 0 ? `
                        <div class="mb-3 text-center">
                            <span class="text-warning">${generateStars(course.averageRating)}</span>
                            <small class="text-muted ms-1">${course.averageRating.toFixed(1)} (${course.reviewCount})</small>
                        </div>
                    ` : ''}
                    
                    <div class="mt-auto">
                        <button class="btn btn-outline-primary btn-sm w-100 mb-2" onclick="showCourseDetail('${course._id}')" style="border-radius: 20px;">
                            <i class="fas fa-eye me-1"></i> Detayları Gör
                        </button>
                        ${currentUser ? 
                            (course.students && course.students.some(student => 
                                (typeof student === 'string' ? student : student._id) === currentUser.id || 
                                (typeof student === 'string' ? student : student._id) === currentUser._id
                            )) ? `
                                <button class="btn btn-success w-100 disabled" style="border-radius: 20px;">
                                    <i class="fas fa-check me-1"></i> Kayıtlısınız
                                </button>
                            ` : `
                                <button class="btn btn-primary w-100" onclick="enrollCourse('${course._id}')" style="border-radius: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">
                                    <i class="fas fa-plus me-1"></i> Kursa Kayıt Ol
                                </button>
                            `
                        : `
                            <button class="btn btn-outline-secondary w-100" onclick="showPage('login')" style="border-radius: 20px;">
                                <i class="fas fa-sign-in-alt me-1"></i> Giriş Yapın
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

// Kursa kayıt olma - Ödeme modalını aç
async function enrollCourse(courseId) {
    if (!authToken) {
        showAlert('Lütfen önce giriş yapın!', 'warning');
        return;
    }
    
    try {
        // Kurs bilgilerini al
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`);
        const course = await response.json();
        
        if (response.ok) {
            showEnrollmentModal(course);
        } else {
            showAlert('Kurs bilgileri alınamadı!', 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Kayıt modalını göster
function showEnrollmentModal(course) {
    const modal = new bootstrap.Modal(document.getElementById('enrollmentModal'));
    const enrollmentDetails = document.getElementById('enrollmentDetails');
    const paymentSection = document.getElementById('paymentSection');
    const freeEnrollBtn = document.getElementById('freeEnrollBtn');
    const paymentBtn = document.getElementById('paymentBtn');
    
    // Kurs bilgilerini göster
    enrollmentDetails.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">${course.title}</h5>
                <p class="card-text">${course.description}</p>
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Eğitmen:</strong> ${course.instructor.name}</p>
                        <p class="mb-1"><strong>Süre:</strong> ${course.duration} dakika</p>
                        <p class="mb-1"><strong>Seviye:</strong> ${getLevelText(course.level)}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Ders Sayısı:</strong> ${course.lessons.length}</p>
                        <p class="mb-1"><strong>Öğrenci Sayısı:</strong> ${course.students.length}</p>
                        <h4 class="text-primary mb-0">
                            ${course.price === 0 ? 'Ücretsiz' : course.price + ' TL'}
                        </h4>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Ödeme bölümünü ayarla
    if (course.price === 0) {
        // Ücretsiz kurs
        paymentSection.style.display = 'none';
        freeEnrollBtn.style.display = 'block';
        paymentBtn.style.display = 'none';
        
        freeEnrollBtn.onclick = () => processEnrollment(course._id, 'free');
    } else {
        // Ücretli kurs
        paymentSection.style.display = 'block';
        freeEnrollBtn.style.display = 'none';
        paymentBtn.style.display = 'block';
        
        // Transfer açıklamasını ayarla
        document.getElementById('transferDescription').textContent = 
            `${course.title} - ${currentUser.name} - ${course._id.substring(0, 8)}`;
        
        paymentBtn.onclick = () => processPayment(course);
    }
    
    // Formu temizle
    resetPaymentForms();
    
    modal.show();
}

// Ödeme yöntemi seçimi
function selectPaymentMethod(method) {
    // Tüm kartları temizle
    document.querySelectorAll('.payment-method').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Tüm formları gizle
    document.querySelectorAll('.payment-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Seçilen kartı işaretle
    event.currentTarget.classList.add('selected');
    
    // İlgili formu göster
    if (method === 'credit-card') {
        document.getElementById('creditCardForm').style.display = 'block';
    } else if (method === 'bank-transfer') {
        document.getElementById('bankTransferForm').style.display = 'block';
    }
}

// Ödeme formlarını temizle
function resetPaymentForms() {
    document.querySelectorAll('.payment-method').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelectorAll('.payment-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Form alanlarını temizle
    document.getElementById('paymentForm').reset();
}

// Ödeme işlemi
async function processPayment(course) {
    const selectedMethod = document.querySelector('.payment-method.selected');
    
    if (!selectedMethod) {
        showAlert('Lütfen bir ödeme yöntemi seçin!', 'warning');
        return;
    }
    
    const method = selectedMethod.onclick.toString().includes('credit-card') ? 'credit-card' : 'bank-transfer';
    
    if (method === 'credit-card') {
        // Kredi kartı bilgilerini kontrol et
        const cardName = document.getElementById('cardName').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardCvv = document.getElementById('cardCvv').value;
        
        if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
            showAlert('Lütfen tüm kart bilgilerini doldurun!', 'warning');
            return;
        }
        
        // Kart numarası formatını kontrol et
        if (cardNumber.replace(/\s/g, '').length < 16) {
            showAlert('Geçerli bir kart numarası girin!', 'warning');
            return;
        }
        
        // Demo ödeme işlemi
        showAlert('Ödeme işlemi simüle ediliyor...', 'info');
        
        setTimeout(() => {
            processEnrollment(course._id, 'credit-card', {
                cardName,
                cardNumber: cardNumber.replace(/\s/g, '').substring(0, 4) + '****',
                amount: course.price
            });
        }, 2000);
        
    } else if (method === 'bank-transfer') {
        // Banka havalesi için kayıt yap ama pending durumunda
        processEnrollment(course._id, 'bank-transfer', {
            amount: course.price,
            status: 'pending'
        });
    }
}

// Kayıt işlemini tamamla
async function processEnrollment(courseId, paymentMethod, paymentData = null) {
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            body: JSON.stringify({
                paymentMethod,
                paymentData
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('enrollmentModal')).hide();
            
            if (paymentMethod === 'bank-transfer') {
                showAlert('Kayıt işleminiz alındı! Havale/EFT işlemi sonrası dekont göndermeyi unutmayın.', 'success');
            } else {
                showAlert(data.message, 'success');
            }
            
            loadCourses(); // Kursları yeniden yükle
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    }
}

// Şifre görünürlük toggle
function setupPasswordToggle(toggleButtonId, passwordInputId) {
    const toggleButton = document.getElementById(toggleButtonId);
    const passwordInput = document.getElementById(passwordInputId);
    
    if (toggleButton && passwordInput) {
        toggleButton.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }
}

// Şifre sıfırlama işlemi
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Gönderiliyor...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Demo için geçici şifreyi göster
            if (data.temporaryPassword) {
                showAlert(`Yeni şifreniz: <strong>${data.temporaryPassword}</strong><br><small>Demo amaçlı gösteriliyor. Gerçek uygulamada email ile gönderilir.</small>`, 'success');
            } else {
                showAlert('Yeni şifreniz email adresinize gönderildi!', 'success');
            }
            
            document.getElementById('forgotPasswordForm').reset();
            setTimeout(() => {
                showPage('login');
            }, 5000);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        showAlert('Bağlantı hatası!', 'danger');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

// Yardımcı fonksiyonlar
function getRoleText(role) {
    const roles = {
        'student': 'Öğrenci',
        'teacher': 'Öğretmen',
        'admin': 'Yönetici',
        'pending_teacher': 'Öğretmen Başvurusu'
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
    alertDiv.className = `alert alert-${type} alert-dismissible fade show animate-fade-in-up`;
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}
// Profil resmi önizleme
function previewSelectedImage(input) {
    const file = input.files[0];
    const uploadBtn = document.getElementById('uploadBtn');
    const currentProfileImage = document.getElementById('currentProfileImage');
    
    if (file) {
        // Dosya boyutu kontrolü (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('Dosya boyutu 5MB\'dan büyük olamaz!', 'danger');
            input.value = '';
            uploadBtn.disabled = true;
            return;
        }
        
        // Dosya tipi kontrolü
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showAlert('Sadece JPG, PNG, GIF ve WebP formatları desteklenir!', 'danger');
            input.value = '';
            uploadBtn.disabled = true;
            return;
        }
        
        // Önizleme göster
        const reader = new FileReader();
        reader.onload = function(e) {
            currentProfileImage.innerHTML = `
                <div class="position-relative">
                    <img src="${e.target.result}" alt="Profil Resmi Önizleme" 
                         style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);">
                    <div class="position-absolute top-0 end-0 bg-success rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 30px; height: 30px; transform: translate(25%, -25%);">
                        <i class="fas fa-check text-white" style="font-size: 12px;"></i>
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Resmi Yükle';
    } else {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Resmi Yükle';
        // Mevcut profil resmini geri yükle
        loadCurrentProfileImage();
    }
}

// Mevcut profil resmini yükle
function loadCurrentProfileImage() {
    const currentProfileImage = document.getElementById('currentProfileImage');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (!currentProfileImage) return;
    
    if (currentUser && currentUser.profileImage) {
        // API_BASE_URL '/api' ile bitiyor, dosyalar ise sunucunun kökünden '/uploads' altından servis ediliyor
        const baseUrl = API_BASE_URL.replace('/api', '');
        currentProfileImage.innerHTML = `
            <div class="position-relative">
                <img src="${baseUrl}${currentUser.profileImage}" alt="Profil Resmi" 
                     style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="profile-placeholder position-absolute top-0 start-0" style="display: none; width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold;">
                    ${currentUser.name.charAt(0).toUpperCase()}
                </div>
            </div>
        `;
        
        // Silme butonunu göster
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
        }
    } else {
        currentProfileImage.innerHTML = `
            <div class="profile-placeholder" style="width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold; margin: 0 auto; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);">
                ${currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
        `;
        
        // Silme butonunu gizle
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }
}

// Profil resmi yükleme
async function uploadProfileImage() {
    const fileInput = document.getElementById('profileImageFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Lütfen bir dosya seçin!', 'danger');
        return;
    }
    
    if (!authToken) {
        showAlert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('profileImage', file);
    
    // Button loading state
    const originalText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Yükleniyor...';
    
    try {
        // FormData için özel fetch çağrısı (makeAuthenticatedRequest kullanmadan)
        const response = await fetch(`${API_BASE_URL}/users/profile/upload-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
                // Content-Type header'ı FormData için otomatik ayarlanır
            },
            body: formData
        });
        
        // Token geçersizse çıkış yap
        if (response.status === 401 || response.status === 403) {
            logout(false);
            throw new Error('Oturum süresi doldu');
        }
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showAlert('Profil resmi başarıyla yüklendi!', 'success');
            
            // Başarı animasyonu
            const profileImageContainer = document.querySelector('.profile-image-container');
            if (profileImageContainer) {
                profileImageContainer.classList.add('upload-success');
                setTimeout(() => {
                    profileImageContainer.classList.remove('upload-success');
                }, 600);
            }
            
            loadCurrentProfileImage();
            fileInput.value = '';
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-check me-2"></i>Yüklendi!';
            
            // 2 saniye sonra buton metnini eski haline getir
            setTimeout(() => {
                uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Resmi Yükle';
            }, 2000);
            
            // Profil önizlemesini güncelle
            displayProfile(currentUser);
        } else {
            showAlert(data.message || 'Profil resmi yüklenirken hata oluştu!', 'danger');
            uploadBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Profil resmi yükleme hatası:', error);
        showAlert('Bağlantı hatası! Lütfen tekrar deneyin.', 'danger');
        uploadBtn.innerHTML = originalText;
    } finally {
        uploadBtn.disabled = false;
    }
}

// Profil resmini silme
async function deleteProfileImage() {
    if (!currentUser || !currentUser.profileImage) {
        showAlert('Silinecek profil resmi bulunamadı!', 'warning');
        return;
    }
    
    if (!authToken) {
        showAlert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'warning');
        return;
    }
    
    // Modern confirm dialog
    const confirmDelete = confirm('Profil resminizi silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.');
    if (!confirmDelete) {
        return;
    }
    
    const deleteBtn = document.querySelector('button[onclick="deleteProfileImage()"]');
    const originalText = deleteBtn ? deleteBtn.innerHTML : '';
    
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Siliniyor...';
    }
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/users/profile/image`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showAlert('Profil resmi başarıyla silindi!', 'success');
            loadCurrentProfileImage();
            
            // Profil önizlemesini güncelle
            displayProfile(currentUser);
            
            // Upload butonunu sıfırla
            const fileInput = document.getElementById('profileImageFile');
            const uploadBtn = document.getElementById('uploadBtn');
            if (fileInput) fileInput.value = '';
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Resmi Yükle';
            }
        } else {
            showAlert(data.message || 'Profil resmi silinirken hata oluştu!', 'danger');
        }
    } catch (error) {
        console.error('Profil resmi silme hatası:', error);
        showAlert('Bağlantı hatası! Lütfen tekrar deneyin.', 'danger');
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
    }
}
// Profil bilgilerini güncelleme
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!authToken) {
        showAlert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'warning');
        return;
    }
    
    const formData = {
        name: document.getElementById('profileName').value,
        phone: document.getElementById('profilePhone').value,
        location: document.getElementById('profileLocation').value,
        website: document.getElementById('profileWebsite').value,
        bio: document.getElementById('profileBio').value
    };
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Kaydediliyor...';
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showAlert('Profil bilgileri başarıyla güncellendi!', 'success');
            displayProfile(currentUser);
            updateAuthUI();
        } else {
            showAlert(data.message || 'Profil güncellenirken hata oluştu!', 'danger');
        }
    } catch (error) {
        console.error('Profil güncelleme hatası:', error);
        showAlert('Bağlantı hatası! Lütfen tekrar deneyin.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Şifre değiştirme
async function handlePasswordChange(e) {
    e.preventDefault();
    
    if (!authToken) {
        showAlert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'warning');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    // Şifre eşleşme kontrolü
    if (newPassword !== confirmNewPassword) {
        showAlert('Yeni şifreler eşleşmiyor!', 'danger');
        return;
    }
    
    // Şifre uzunluk kontrolü
    if (newPassword.length < 6) {
        showAlert('Yeni şifre en az 6 karakter olmalıdır!', 'danger');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Değiştiriliyor...';
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/users/change-password`, {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Şifre başarıyla değiştirildi!', 'success');
            e.target.reset();
        } else {
            showAlert(data.message || 'Şifre değiştirilirken hata oluştu!', 'danger');
        }
    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        showAlert('Bağlantı hatası! Lütfen tekrar deneyin.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Sosyal medya linklerini güncelleme
async function handleSocialLinksUpdate(e) {
    e.preventDefault();
    
    if (!authToken) {
        showAlert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'warning');
        return;
    }
    
    const socialLinks = {
        twitter: document.getElementById('twitterLink').value,
        linkedin: document.getElementById('linkedinLink').value,
        github: document.getElementById('githubLink').value
    };
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Kaydediliyor...';
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            body: JSON.stringify({ socialLinks })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showAlert('Sosyal medya linkleri başarıyla güncellendi!', 'success');
            displayProfile(currentUser);
        } else {
            showAlert(data.message || 'Sosyal medya linkleri güncellenirken hata oluştu!', 'danger');
        }
    } catch (error) {
        console.error('Sosyal medya linkleri güncelleme hatası:', error);
        showAlert('Bağlantı hatası! Lütfen tekrar deneyin.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Şifre toggle fonksiyonlarını profil sayfası için ekle
document.addEventListener('DOMContentLoaded', function() {
    // Profil sayfası şifre toggle'ları
    setupPasswordToggle('toggleCurrentPassword', 'currentPassword');
    setupPasswordToggle('toggleNewPassword', 'newPassword');
    setupPasswordToggle('toggleConfirmPassword', 'confirmNewPassword');
    
    // Şifre gücü kontrolü
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
});

// Şifre gücü kontrolü
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const indicator = document.getElementById('passwordStrengthIndicator');
    
    if (!indicator) return;
    
    let strength = 0;
    let strengthText = '';
    let strengthColor = '';
    
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    switch (strength) {
        case 0:
        case 1:
            strengthText = 'Çok Zayıf';
            strengthColor = 'danger';
            break;
        case 2:
            strengthText = 'Zayıf';
            strengthColor = 'warning';
            break;
        case 3:
            strengthText = 'Orta';
            strengthColor = 'info';
            break;
        case 4:
            strengthText = 'Güçlü';
            strengthColor = 'success';
            break;
        case 5:
            strengthText = 'Çok Güçlü';
            strengthColor = 'success';
            break;
    }
    
    const percentage = (strength / 5) * 100;
    
    indicator.innerHTML = `
        <div class="progress mb-2" style="height: 6px;">
            <div class="progress-bar bg-${strengthColor}" role="progressbar" 
                 style="width: ${percentage}%" aria-valuenow="${percentage}" 
                 aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <small class="text-${strengthColor} fw-bold">${strengthText}</small>
    `;
}
// Profil tab değişikliklerini dinle
document.addEventListener('DOMContentLoaded', function() {
    const profileImageTab = document.getElementById('profile-image-tab');
    if (profileImageTab) {
        profileImageTab.addEventListener('click', function() {
            setTimeout(() => {
                loadCurrentProfileImage();
            }, 100);
        });
    }
});

// Drag & Drop işlevselliği
function initializeDragAndDrop() {
    const profileImageContainer = document.getElementById('currentProfileImage');
    const fileInput = document.getElementById('profileImageFile');
    
    if (!profileImageContainer || !fileInput) return;
    
    // Drag over
    profileImageContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.opacity = '0.7';
        this.style.transform = 'scale(1.05)';
    });
    
    // Drag leave
    profileImageContainer.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.opacity = '1';
        this.style.transform = 'scale(1)';
    });
    
    // Drop
    profileImageContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.opacity = '1';
        this.style.transform = 'scale(1)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            previewSelectedImage(fileInput);
        }
    });
}

// Sayfa yüklendiğinde drag & drop'u başlat
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeDragAndDrop, 500);
});// Kart numarası formatlaması
document.addEventListener('DOMContentLoaded', function() {
    // Kart numarası formatlaması
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Son kullanma tarihi formatlaması
    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // CVV sadece rakam
    const cardCvvInput = document.getElementById('cardCvv');
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
});

// Alert sistemi
function showAlert(message, type = 'info') {
    // Mevcut alert'leri temizle
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Alert elementi oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${getAlertIcon(type)} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Body'ye ekle
    document.body.appendChild(alertDiv);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 150);
        }
    }, 5000);
}

function getAlertIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-exclamation-triangle';
        case 'warning': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

