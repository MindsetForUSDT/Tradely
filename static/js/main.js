mkdir -p static/js
cat > static/js/main.js << 'EOF'
// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ==========

// Уведомления
function showNotification(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `notification ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = '📢';

    div.innerHTML = `<span style="margin-right: 10px;">${icon}</span>${message}`;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(100%)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// Плавное появление карточек при скролле
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.pattern-card, .feature-card, .stat-card, .library-pattern-card').forEach(el => {
        observer.observe(el);
    });
}

// Кнопка "Вверх"
function initScrollTopButton() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    const contentArea = document.querySelector('.content-area') || window;

    const toggleBtn = () => {
        const scrollTop = document.querySelector('.content-area')?.scrollTop || window.scrollY;
        if (scrollTop > 300) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    };

    if (document.querySelector('.content-area')) {
        document.querySelector('.content-area').addEventListener('scroll', toggleBtn);
    } else {
        window.addEventListener('scroll', toggleBtn);
    }

    btn.addEventListener('click', () => {
        if (document.querySelector('.content-area')) {
            document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// Плавающая кнопка поддержки
function initSupportButton() {
    const btn = document.getElementById('supportBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        showNotification('Чат поддержки: support@tradeum.ru\nTelegram: @tradeum_support', 'info');
    });
}

// Загрузка скелетоном
function showSkeleton(container, count = 4) {
    const skeletonHTML = Array(count).fill(0).map(() => `
        <div class="skeleton" style="height: 200px; border-radius: 20px; margin-bottom: 20px;"></div>
    `).join('');
    container.innerHTML = skeletonHTML;
}

// Инициализация всех общих функций
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initScrollTopButton();
    initSupportButton();
});

// Экспорт для использования в других скриптах
window.showNotification = showNotification;
window.initScrollAnimations = initScrollAnimations;
EOF