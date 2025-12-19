// Modern UI Enhancements

// Loading overlay functions
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('d-none');
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.getElementById('scrollToTop');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('show');
    } else {
        scrollButton.classList.remove('show');
    }
});

// Modern page transitions
function modernShowPage(pageName) {
    // Add loading effect
    showLoading();
    
    setTimeout(() => {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('d-none');
            page.classList.remove('animate-fade-in-up');
        });
        
        // Show target page with animation
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.classList.remove('d-none');
            targetPage.classList.add('animate-fade-in-up');
        }
        
        hideLoading();
        scrollToTop();
    }, 300);
}

// Enhanced form animations
document.addEventListener('DOMContentLoaded', function() {
    // Add focus animations to form controls
    const formControls = document.querySelectorAll('.form-control, .form-select');
    formControls.forEach(control => {
        control.addEventListener('focus', function() {
            this.parentElement.classList.add('animate-pulse');
        });
        
        control.addEventListener('blur', function() {
            this.parentElement.classList.remove('animate-pulse');
        });
    });
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.add('hover-lift');
    });
    
    // Add glow effect to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-success, .btn-warning');
    buttons.forEach(button => {
        button.classList.add('hover-glow');
    });
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
            }
        });
    }, observerOptions);
    
    // Observe cards and other elements
    document.querySelectorAll('.card, .hero-section').forEach(el => {
        observer.observe(el);
    });
});

// Enhanced alert function with modern styling
function modernAlert(message, type = 'info', duration = 5000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show animate-fade-in-up`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after duration
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.classList.add('animate-fade-out');
            setTimeout(() => {
                alertDiv.remove();
            }, 300);
        }
    }, duration);
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

// Modern tooltip initialization
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Modern form validation
function modernFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', function(event) {
        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
            
            // Add shake animation to invalid fields
            const invalidFields = form.querySelectorAll(':invalid');
            invalidFields.forEach(field => {
                field.classList.add('animate-shake');
                setTimeout(() => {
                    field.classList.remove('animate-shake');
                }, 600);
            });
        }
        
        form.classList.add('was-validated');
    });
}

// Shake animation CSS
const shakeCSS = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
    animation: shake 0.6s ease-in-out;
}

.animate-fade-out {
    animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
}
`;

// Add shake CSS to document
const style = document.createElement('style');
style.textContent = shakeCSS;
document.head.appendChild(style);

// Modern search with debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced course search with modern UX
const debouncedSearch = debounce(function(searchTerm) {
    if (searchTerm.length > 2 || searchTerm.length === 0) {
        searchCourses();
    }
}, 300);

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[^A-Za-z0-9]/.test(password)
    };
    
    strength = Object.values(checks).filter(Boolean).length;
    
    return {
        score: strength,
        checks: checks,
        text: ['Çok Zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][Math.min(strength, 4)],
        color: ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'][Math.min(strength, 4)]
    };
}

// Add password strength indicator
function addPasswordStrengthIndicator(passwordInputId) {
    const passwordInput = document.getElementById(passwordInputId);
    if (!passwordInput) return;
    
    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength mt-2';
    strengthIndicator.innerHTML = `
        <div class="strength-bar">
            <div class="strength-fill"></div>
        </div>
        <small class="strength-text text-muted">Şifre girin</small>
    `;
    
    passwordInput.parentElement.parentElement.appendChild(strengthIndicator);
    
    passwordInput.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        const fill = strengthIndicator.querySelector('.strength-fill');
        const text = strengthIndicator.querySelector('.strength-text');
        
        if (this.value.length === 0) {
            fill.style.width = '0%';
            fill.style.backgroundColor = '#e9ecef';
            text.textContent = 'Şifre girin';
            text.className = 'strength-text text-muted';
        } else {
            fill.style.width = `${(strength.score / 5) * 100}%`;
            fill.style.backgroundColor = strength.color;
            text.textContent = strength.text;
            text.className = `strength-text`;
            text.style.color = strength.color;
        }
    });
}

// Initialize modern features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initTooltips();
    
    // Initialize Bootstrap dropdowns
    const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl);
    });
    
    // Add modern form validation to all forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        modernFormValidation(form.id);
    });
    
    // Add password strength indicators
    addPasswordStrengthIndicator('registerPassword');
    
    // Add debounced search to course search input
    const courseSearchInput = document.getElementById('courseSearch');
    if (courseSearchInput) {
        courseSearchInput.addEventListener('input', function() {
            debouncedSearch(this.value);
        });
    }
    
    // Add modern page transition to navigation
    const navLinks = document.querySelectorAll('.nav-link[onclick*="showPage"]');
    navLinks.forEach(link => {
        const originalOnclick = link.getAttribute('onclick');
        link.setAttribute('onclick', originalOnclick.replace('showPage', 'modernShowPage'));
    });
});

// Modern theme switcher (optional)
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    
    if (isDark) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Modern performance monitoring
function measurePerformance(name, fn) {
    return async function(...args) {
        const start = performance.now();
        const result = await fn.apply(this, args);
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    };
}

// Export functions for use in other files
window.modernUI = {
    showLoading,
    hideLoading,
    modernAlert,
    modernShowPage,
    toggleTheme,
    measurePerformance
};