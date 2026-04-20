// ========== Глобальные переменные ==========
let currentUser = null;
let authToken = null;
let trades = [];
let currentView = 'journal';
let currentFilter = 'all';
let plChart = null;
let ratioChart = null;
let isAdmin = false;
let selectedMode = null;
let selectedWalletType = null;

let userStatus = {
    wallet_connected: false,
    wallet_address: null,
    is_public: false,
    first_login: true,
    is_admin: false
};

const API_BASE = '';

// ========== Toast уведомления ==========
function showToast(message, type = 'info') {
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-message">' + message + '</span><span class="toast-close">✕</span>';

    container.appendChild(toast);

    var closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', function() { toast.remove(); });

    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 4000);
}

// ========== Инициализация ==========
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

window.addEventListener('load', function() {
    setTimeout(function() {
        var preloader = document.getElementById('preloader');
        if (preloader) preloader.classList.add('fade-out');
    }, 500);
});

function checkAuth() {
    var token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        fetchUserProfile();
    } else {
        showWelcomeScreen();
    }
}

async function fetchUserProfile() {
    try {
        var response = await fetch(API_BASE + '/api/user/profile', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (response.ok) {
            currentUser = await response.json();
            userStatus = {
                wallet_connected: currentUser.wallet_connected,
                wallet_address: currentUser.wallet_address,
                is_public: currentUser.is_public,
                first_login: currentUser.first_login,
                is_admin: currentUser.is_admin
            };
            isAdmin = currentUser.is_admin;

            if (userStatus.first_login) {
                showOnboardingScreen();
            } else {
                await loadTrades();
                showAppScreen();
            }
        } else {
            localStorage.removeItem('authToken');
            showWelcomeScreen();
        }
    } catch (error) {
        showWelcomeScreen();
    }
}

function showWelcomeScreen() {
    var preloader = document.getElementById('preloader');
    var welcomeScreen = document.getElementById('welcomeScreen');
    var onboardingScreen = document.getElementById('onboardingScreen');
    var appScreen = document.getElementById('appScreen');

    if (preloader) preloader.classList.add('hidden');
    if (welcomeScreen) welcomeScreen.classList.remove('hidden');
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.add('hidden');
}

function showOnboardingScreen() {
    var preloader = document.getElementById('preloader');
    var welcomeScreen = document.getElementById('welcomeScreen');
    var onboardingScreen = document.getElementById('onboardingScreen');
    var appScreen = document.getElementById('appScreen');

    if (preloader) preloader.classList.add('hidden');
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (onboardingScreen) onboardingScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');

    var usernameEl = document.getElementById('onboardingUsername');
    if (usernameEl) usernameEl.textContent = (currentUser && currentUser.username) || 'Trader';

    selectedMode = null;
    selectedWalletType = null;

    document.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('selected'); });
    document.querySelectorAll('.wallet-option-new').forEach(function(w) { w.classList.remove('selected'); });

    var continueBtn = document.getElementById('continueOnboarding');
    if (continueBtn) continueBtn.disabled = true;

    var finishBtn = document.getElementById('finishOnboarding');
    if (finishBtn) finishBtn.disabled = true;
}

function showAppScreen() {
    var preloader = document.getElementById('preloader');
    var welcomeScreen = document.getElementById('welcomeScreen');
    var onboardingScreen = document.getElementById('onboardingScreen');
    var appScreen = document.getElementById('appScreen');

    if (preloader) preloader.classList.add('hidden');
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');

    updateDate();
    updateProfileDisplay();
    renderJournal();
    switchView('journal');
}

function switchView(viewName) {
    if (viewName === 'premium' && !userStatus.wallet_connected && !isAdmin) {
        showToast('Premium раздел доступен только для Pro трейдеров', 'error');
        return;
    }
    if (viewName === 'admin' && !isAdmin) {
        showToast('Доступ запрещён', 'error');
        return;
    }

    currentView = viewName;

    document.querySelectorAll('.view-container').forEach(function(v) { v.classList.add('hidden'); });
    var viewEl = document.getElementById(viewName + 'View');
    if (viewEl) viewEl.classList.remove('hidden');

    document.querySelectorAll('.nav-link-header, .mobile-nav-link').forEach(function(link) {
        link.classList.remove('active');
        if (link.dataset.view === viewName) link.classList.add('active');
    });

    var titles = { journal: 'Журнал', analytics: 'Аналитика', premium: 'Premium', leaderboard: 'Рейтинг', admin: 'Админ-панель', settings: 'Настройки' };
    var h2 = document.querySelector('.page-header h2');
    if (h2) h2.textContent = titles[viewName] || 'Журнал';

    if (viewName === 'leaderboard') {
        if (!userStatus.wallet_connected && !isAdmin) {
            showToast('Только Pro трейдеры имеют доступ к таблице лидеров', 'error');
            switchView('settings');
            return;
        }
        loadLeaderboard();
    }
    if (viewName === 'analytics') setTimeout(updateCharts, 100);
    if (viewName === 'premium') loadPremiumAnalytics();
    if (viewName === 'admin') loadAdminUsers();
}

// ========== Настройка слушателей ==========
function setupEventListeners() {
    // Табы авторизации
    document.querySelectorAll('.auth-switch').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.auth-switch').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');

            var isLogin = this.dataset.auth === 'login';
            var loginForm = document.getElementById('loginForm');
            var registerForm = document.getElementById('registerForm');
            var forgotForm = document.getElementById('forgotPasswordForm');
            var resetForm = document.getElementById('resetPasswordForm');
            var authError = document.getElementById('authError');

            if (loginForm) loginForm.classList.toggle('hidden', !isLogin);
            if (registerForm) registerForm.classList.toggle('hidden', isLogin);
            if (forgotForm) forgotForm.classList.add('hidden');
            if (resetForm) resetForm.classList.add('hidden');
            if (authError) authError.textContent = '';
        });
    });

    // Форма входа
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var formData = new FormData(e.target);
            var authError = document.getElementById('authError');

            try {
                var response = await fetch(API_BASE + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') })
                });

                var data = await response.json();

                if (response.ok) {
                    authToken = data.token;
                    currentUser = data.user;
                    userStatus = {
                        wallet_connected: data.user.wallet_connected,
                        wallet_address: data.user.wallet_address,
                        is_public: data.user.is_public,
                        first_login: data.user.first_login,
                        is_admin: data.user.is_admin
                    };
                    isAdmin = data.user.is_admin;
                    localStorage.setItem('authToken', authToken);
                    showToast('Вход выполнен успешно', 'success');

                    if (userStatus.first_login) {
                        showOnboardingScreen();
                    } else {
                        await loadTrades();
                        showAppScreen();
                    }
                } else {
                    if (authError) authError.textContent = data.error || 'Ошибка входа';
                    showToast(data.error || 'Ошибка входа', 'error');
                }
            } catch (error) {
                if (authError) authError.textContent = 'Ошибка соединения';
                showToast('Ошибка соединения', 'error');
            }
        });
    }

    // Форма регистрации
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var formData = new FormData(e.target);
            var authError = document.getElementById('authError');

            var username = formData.get('username');
            var password = formData.get('password');
            var confirmPassword = formData.get('confirmPassword');
            var secretQuestion = formData.get('secretQuestion');
            var secretAnswer = formData.get('secretAnswer');

            if (!username || !password || !confirmPassword) { if (authError) authError.textContent = 'Все поля обязательны'; return; }
            if (username.length < 3) { if (authError) authError.textContent = 'Логин: минимум 3 символа'; return; }
            if (password.length < 6) { if (authError) authError.textContent = 'Пароль: минимум 6 символов'; return; }
            if (password !== confirmPassword) { if (authError) authError.textContent = 'Пароли не совпадают'; return; }

            try {
                var response = await fetch(API_BASE + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username, password: password, secretQuestion: secretQuestion, secretAnswer: secretAnswer })
                });

                var data = await response.json();

                if (response.ok) {
                    authToken = data.token;
                    currentUser = data.user;
                    userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
                    localStorage.setItem('authToken', authToken);
                    showToast('Регистрация успешна', 'success');
                    showOnboardingScreen();
                } else {
                    if (authError) authError.textContent = data.error || 'Ошибка регистрации';
                    showToast(data.error || 'Ошибка регистрации', 'error');
                }
            } catch (error) {
                if (authError) authError.textContent = 'Ошибка соединения';
                showToast('Ошибка соединения', 'error');
            }
        });
    }

    // Восстановление пароля
    var forgotLink = document.getElementById('forgotPasswordLink');
    var backToLogin = document.getElementById('backToLoginLink');
    var backToLoginFromReset = document.getElementById('backToLoginFromReset');
    var forgotForm = document.getElementById('forgotPasswordForm');
    var resetForm = document.getElementById('resetPasswordForm');

    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (forgotForm) forgotForm.classList.remove('hidden');
            if (resetForm) resetForm.classList.add('hidden');
            document.getElementById('authError').textContent = '';
        });
    }

    function backToLoginFn() {
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotForm) forgotForm.classList.add('hidden');
        if (resetForm) resetForm.classList.add('hidden');
        document.getElementById('authError').textContent = '';
    }

    if (backToLogin) backToLogin.addEventListener('click', function(e) { e.preventDefault(); backToLoginFn(); });
    if (backToLoginFromReset) backToLoginFromReset.addEventListener('click', function(e) { e.preventDefault(); backToLoginFn(); });

    if (forgotForm) {
        forgotForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var username = e.target.querySelector('[name="forgotUsername"]').value;
            var authError = document.getElementById('authError');

            try {
                var res = await fetch(API_BASE + '/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });
                var data = await res.json();

                if (res.ok) {
                    document.getElementById('resetUsername').value = username;
                    document.getElementById('secretQuestionLabel').textContent = data.secretQuestion;
                    forgotForm.classList.add('hidden');
                    resetForm.classList.remove('hidden');
                } else {
                    if (authError) authError.textContent = data.error;
                    showToast(data.error, 'error');
                }
            } catch (err) {
                if (authError) authError.textContent = 'Ошибка соединения';
            }
        });
    }

    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var formData = new FormData(e.target);
            var authError = document.getElementById('authError');

            var newPassword = formData.get('newPassword');
            var confirmNewPassword = formData.get('confirmNewPassword');

            if (newPassword !== confirmNewPassword) {
                if (authError) authError.textContent = 'Пароли не совпадают';
                return;
            }

            try {
                var res = await fetch(API_BASE + '/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.get('resetUsername'),
                        secretAnswer: formData.get('secretAnswer'),
                        newPassword: newPassword
                    })
                });
                var data = await res.json();

                if (res.ok) {
                    showToast('Пароль успешно изменён! Теперь вы можете войти.', 'success');
                    backToLoginFn();
                } else {
                    if (authError) authError.textContent = data.error;
                    showToast(data.error, 'error');
                }
            } catch (err) {
                if (authError) authError.textContent = 'Ошибка соединения';
            }
        });
    }

    // Смена пароля (модальное окно)
    var changePasswordBtn = document.getElementById('changePasswordBtn');
    var modal = document.getElementById('changePasswordModal');
    var closeModal = document.getElementById('closeChangePasswordModal');
    var changePasswordForm = document.getElementById('changePasswordForm');

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            if (modal) modal.classList.remove('hidden');
        });
    }
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            if (modal) modal.classList.add('hidden');
        });
    }
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var formData = new FormData(e.target);
            var errorEl = document.getElementById('changePasswordError');

            var newPassword = formData.get('newPassword');
            var confirmNewPassword = formData.get('confirmNewPassword');

            if (newPassword !== confirmNewPassword) {
                if (errorEl) errorEl.textContent = 'Пароли не совпадают';
                return;
            }

            try {
                var res = await fetch(API_BASE + '/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                    body: JSON.stringify({ currentPassword: formData.get('currentPassword'), newPassword: newPassword })
                });
                var data = await res.json();

                if (res.ok) {
                    showToast('Пароль успешно изменён', 'success');
                    modal.classList.add('hidden');
                    changePasswordForm.reset();
                } else {
                    if (errorEl) errorEl.textContent = data.error;
                }
            } catch (err) {
                if (errorEl) errorEl.textContent = 'Ошибка соединения';
            }
        });
    }

    // Онбординг: выбор режима
    document.querySelectorAll('.mode-card').forEach(function(card) {
        card.addEventListener('click', function() {
            document.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('selected'); });
            this.classList.add('selected');
            selectedMode = this.dataset.mode;
            var continueBtn = document.getElementById('continueOnboarding');
            if (continueBtn) continueBtn.disabled = false;
        });
    });

    // Онбординг: продолжить
    var continueBtn = document.getElementById('continueOnboarding');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            if (selectedMode === 'pro') {
                document.getElementById('modeStep').classList.add('hidden');
                document.getElementById('walletStep').classList.remove('hidden');
            } else {
                finishOnboarding(false);
            }
        });
    }

    // Онбординг: выбор кошелька
    document.querySelectorAll('.wallet-option-new').forEach(function(opt) {
        opt.addEventListener('click', function() {
            document.querySelectorAll('.wallet-option-new').forEach(function(o) { o.classList.remove('selected'); });
            this.classList.add('selected');
            selectedWalletType = this.dataset.wallet;
            checkWalletForm();
        });
    });

    var walletInput = document.getElementById('walletAddressInput');
    if (walletInput) walletInput.addEventListener('input', checkWalletForm);

    function checkWalletForm() {
        var address = document.getElementById('walletAddressInput')?.value.trim();
        var finishBtn = document.getElementById('finishOnboarding');
        if (finishBtn) finishBtn.disabled = !selectedWalletType || !address;
    }

    var backBtn = document.getElementById('backToMode');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            document.getElementById('walletStep').classList.add('hidden');
            document.getElementById('modeStep').classList.remove('hidden');
        });
    }

    var finishBtn = document.getElementById('finishOnboarding');
    if (finishBtn) finishBtn.addEventListener('click', function() { finishOnboarding(true); });

    async function finishOnboarding(isPro) {
        try {
            if (isPro) {
                var address = document.getElementById('walletAddressInput')?.value.trim();
                await fetch(API_BASE + '/api/user/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                    body: JSON.stringify({ wallet_address: address, wallet_type: selectedWalletType })
                });
                userStatus.wallet_connected = true;
                showToast('Pro активирован! Импортировано сделок.', 'success');
            } else {
                await fetch(API_BASE + '/api/user/skip-wallet', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                userStatus.wallet_connected = false;
                showToast('Базовый тариф активирован', 'success');
            }
            userStatus.first_login = false;
            await loadTrades();
            showAppScreen();
        } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
        }
    }

    // Навигация
    document.querySelectorAll('[data-view]').forEach(function(el) {
        el.addEventListener('click', function(e) { e.preventDefault(); switchView(this.dataset.view); });
    });

    // Мобильное меню
    var menuToggle = document.getElementById('menuToggle');
    var mobileMenu = document.getElementById('mobileMenu');
    var closeMenu = document.getElementById('closeMenu');
    if (menuToggle) menuToggle.addEventListener('click', function() { if (mobileMenu) mobileMenu.classList.remove('hidden'); });
    if (closeMenu) closeMenu.addEventListener('click', function() { if (mobileMenu) mobileMenu.classList.add('hidden'); });

    // Выход
    function logout() {
        localStorage.removeItem('authToken');
        authToken = null; currentUser = null; trades = [];
        showWelcomeScreen();
        showToast('Вы вышли из аккаунта', 'info');
    }
    document.getElementById('headerLogout')?.addEventListener('click', logout);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Терминал
    document.getElementById('addTradeBtn')?.addEventListener('click', addTrade);
    document.getElementById('refreshData')?.addEventListener('click', async function() { await loadTrades(); renderJournal(); });

    document.querySelectorAll('.type-option').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-option').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderJournal();
        });
    });

    document.getElementById('leaderboardLimit')?.addEventListener('change', loadLeaderboard);

    // Настройки
    document.getElementById('publicProfileToggle')?.addEventListener('change', async function(e) {
        if (!userStatus.wallet_connected) { e.target.checked = false; showToast('Требуется Pro статус', 'error'); return; }
        try {
            await fetch(API_BASE + '/api/user/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                body: JSON.stringify({ is_public: e.target.checked })
            });
            userStatus.is_public = e.target.checked;
        } catch (error) { e.target.checked = !e.target.checked; }
    });

    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', function() { document.getElementById('importFileInput')?.click(); });
    document.getElementById('importFileInput')?.addEventListener('change', importData);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);
    document.getElementById('upgradeToProBtn')?.addEventListener('click', function() { switchView('settings'); });
}

// ========== Работа со сделками ==========
async function loadTrades() {
    try {
        var response = await fetch(API_BASE + '/api/trades', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (response.ok) { trades = await response.json(); trades.sort(function(a, b) { return b.timestamp - a.timestamp; }); }
    } catch (error) {}
}

async function addTrade() {
    if (userStatus.wallet_connected) { showToast('Ручное добавление недоступно для Pro', 'error'); return; }
    var pair = document.getElementById('pairInput')?.value.trim();
    var volume = parseFloat(document.getElementById('volumeInput')?.value.trim().replace(',', '.'));
    var isProfit = document.querySelector('.type-option.profit')?.classList.contains('active');
    if (!pair) { showToast('Введите пару', 'error'); return; }
    if (isNaN(volume) || volume <= 0) { showToast('Введите объём', 'error'); return; }

    var newTrade = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 5), pair: pair.toUpperCase(), volume: volume, type: isProfit ? 'profit' : 'loss', timestamp: Date.now() };

    try {
        var response = await fetch(API_BASE + '/api/trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify(newTrade)
        });
        if (response.ok) { trades.unshift(newTrade); renderJournal(); document.getElementById('volumeInput').value = ''; showToast('Сделка добавлена', 'success'); }
        else { var data = await response.json(); showToast(data.error, 'error'); }
    } catch (error) { showToast('Ошибка', 'error'); }
}

async function deleteTrade(tradeId) {
    if (userStatus.wallet_connected) { showToast('Удаление недоступно для Pro', 'error'); return; }
    try {
        var response = await fetch(API_BASE + '/api/trades/' + tradeId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } });
        if (response.ok) { trades = trades.filter(function(t) { return t.id !== tradeId; }); renderJournal(); showToast('Сделка удалена', 'info'); }
    } catch (error) {}
}
window.deleteTrade = deleteTrade;

function renderJournal() {
    var tbody = document.getElementById('tradesList'); if (!tbody) return;
    var filtered = currentFilter === 'all' ? trades : trades.filter(function(t) { return t.type === currentFilter; });
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-message">Нет сделок</td></tr>'; }
    else {
        var html = '';
        filtered.forEach(function(t) {
            var time = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            var isProfit = t.type === 'profit';
            var actions = userStatus.wallet_connected ? '' : '<button class="icon-btn" onclick="deleteTrade(\'' + t.id + '\')" style="width: 28px; height: 28px;">🗑️</button>';
            html += '<tr><td>' + time + '</td><td>' + t.pair + '</td><td>' + t.volume.toFixed(2) + '</td><td class="' + (isProfit ? 'profit-text' : 'loss-text') + '">' + (isProfit ? '+' : '−') + ' $' + t.volume.toFixed(2) + '</td><td>' + actions + '</td></tr>';
        });
        tbody.innerHTML = html;
    }
    updateStats();
}

function updateStats() {
    var totalPL = 0, wins = 0, maxProfit = 0, maxLoss = 0, profitSum = 0, lossSum = 0;
    trades.forEach(function(t) {
        if (t.type === 'profit') { totalPL += t.volume; wins++; profitSum += t.volume; maxProfit = Math.max(maxProfit, t.volume); }
        else { totalPL -= t.volume; lossSum += t.volume; maxLoss = Math.max(maxLoss, t.volume); }
    });
    var winRate = trades.length ? (wins / trades.length) * 100 : 0;
    var avgProfit = wins ? profitSum / wins : 0;
    var avgLoss = (trades.length - wins) ? lossSum / (trades.length - wins) : 0;

    var totalPLEl = document.getElementById('totalPL'); if (totalPLEl) { totalPLEl.textContent = (totalPL >= 0 ? '+' : '−') + '$' + Math.abs(totalPL).toFixed(2); totalPLEl.className = 'stat-value-new ' + (totalPL >= 0 ? 'profit-text' : 'loss-text'); }
    var winRateEl = document.getElementById('winRate'); if (winRateEl) winRateEl.textContent = winRate.toFixed(1) + '%';
    var progressEl = document.getElementById('winRateProgress'); if (progressEl) progressEl.style.width = winRate + '%';
    var totalTradesEl = document.getElementById('totalTradesCount'); if (totalTradesEl) totalTradesEl.textContent = trades.length;
    var winCountEl = document.getElementById('winCount'); if (winCountEl) winCountEl.textContent = wins + ' LONG';
    var lossCountEl = document.getElementById('lossCount'); if (lossCountEl) lossCountEl.textContent = (trades.length - wins) + ' SHORT';
    var plChange = document.getElementById('plChange'); if (plChange && trades.length) { var last = trades[0]; plChange.textContent = (last.type === 'profit' ? '+' : '-') + '$' + last.volume.toFixed(2); plChange.className = 'stat-change-new ' + (last.type === 'profit' ? 'positive' : 'negative'); }
    var avgProfitEl = document.getElementById('avgProfit'); if (avgProfitEl) avgProfitEl.textContent = '$' + avgProfit.toFixed(2);
    var avgLossEl = document.getElementById('avgLoss'); if (avgLossEl) avgLossEl.textContent = '$' + avgLoss.toFixed(2);
    var bestTradeEl = document.getElementById('bestTrade'); if (bestTradeEl) bestTradeEl.textContent = '$' + maxProfit.toFixed(2);
    var worstTradeEl = document.getElementById('worstTrade'); if (worstTradeEl) worstTradeEl.textContent = '$' + maxLoss.toFixed(2);
}

function updateCharts() {
    var ctx1 = document.getElementById('plChart'); if (ctx1) { var c1 = ctx1.getContext('2d'); if (plChart) plChart.destroy(); var sorted = trades.slice().sort(function(a, b) { return a.timestamp - b.timestamp; }); var cum = 0, data = [], labels = []; sorted.forEach(function(t) { cum += t.type === 'profit' ? t.volume : -t.volume; data.push(cum); labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })); }); plChart = new Chart(c1, { type: 'line', data: { labels: labels.slice(-50), datasets: [{ data: data.slice(-50), borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); }
    var ctx2 = document.getElementById('ratioChart'); if (ctx2) { var c2 = ctx2.getContext('2d'); if (ratioChart) ratioChart.destroy(); var wins = trades.filter(function(t) { return t.type === 'profit'; }).length; var losses = trades.length - wins; ratioChart = new Chart(c2, { type: 'doughnut', data: { labels: ['LONG', 'SHORT'], datasets: [{ data: [wins, losses], backgroundColor: ['#10B981', '#EF4444'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); var pp = document.getElementById('profitPercent'), lp = document.getElementById('lossPercent'); if (pp) pp.textContent = trades.length ? ((wins / trades.length) * 100).toFixed(1) + '%' : '0%'; if (lp) lp.textContent = trades.length ? ((losses / trades.length) * 100).toFixed(1) + '%' : '0%'; }
}

function updateDate() { var now = new Date(); var el = document.getElementById('currentDate'); if (el) el.textContent = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

function updateProfileDisplay() {
    if (!currentUser) return;
    var headerUsername = document.getElementById('headerUsername'), profileUsername = document.getElementById('profileUsername');
    if (headerUsername) headerUsername.textContent = currentUser.username;
    if (profileUsername) profileUsername.textContent = currentUser.username;
    var tariffName = document.getElementById('tariffName'), tariffPrice = document.getElementById('tariffPrice'), accountType = document.getElementById('accountTypeDisplay');
    if (userStatus.wallet_connected) { if (tariffName) tariffName.textContent = 'Pro Аналитика'; if (tariffPrice) tariffPrice.textContent = '500 ₽/мес'; if (accountType) accountType.textContent = 'Pro'; }
    else { if (tariffName) tariffName.textContent = 'Базовый'; if (tariffPrice) tariffPrice.textContent = 'Бесплатно'; if (accountType) accountType.textContent = 'Базовый'; }
    var toggle = document.getElementById('publicProfileToggle'); if (toggle) toggle.checked = userStatus.is_public;
}

// ========== Premium ==========
async function loadPremiumAnalytics() {
    try { var r = await fetch(API_BASE + '/api/premium/analytics', { headers: { 'Authorization': 'Bearer ' + authToken } }); if (r.ok) { var d = await r.json(); document.getElementById('profitFactor').textContent = d.profitFactor; document.getElementById('sharpeRatio').textContent = d.sharpeRatio; document.getElementById('maxDrawdown').textContent = '$' + d.maxDrawdown; document.getElementById('monthlyProjection').textContent = '$' + d.monthlyProjection; document.getElementById('bestPair').textContent = d.bestPair; document.getElementById('worstPair').textContent = d.worstPair; document.getElementById('bestDay').textContent = d.bestDay ? d.bestDay.date + ' (+$' + d.bestDay.pl + ')' : '—'; document.getElementById('worstDay').textContent = d.worstDay ? d.worstDay.date + ' (-$' + Math.abs(d.worstDay.pl) + ')' : '—'; var recs = []; if (d.winRate > 60) recs.push('Отличный винрейт!'); if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!'); var recEl = document.getElementById('premiumRecommendations'); if (recEl) recEl.innerHTML = recs.length ? recs.map(function(r) { return '<p>• ' + r + '</p>'; }).join('') : '<p>Недостаточно данных</p>'; } } catch (e) {}
}

// ========== Админ ==========
async function loadAdminUsers() {
    try { var r = await fetch(API_BASE + '/api/admin/users', { headers: { 'Authorization': 'Bearer ' + authToken } }); if (r.ok) { var users = await r.json(); var tbody = document.getElementById('adminUsersList'); if (tbody) { var html = ''; users.forEach(function(u) { html += '<tr><td>' + u.id + '</td><td>' + u.username + '</td><td>' + (u.wallet_connected ? '✅' : '❌') + '</td><td>' + (u.trades_count || 0) + '</td><td class="' + (u.total_pl >= 0 ? 'profit-text' : 'loss-text') + '">$' + (u.total_pl ? u.total_pl.toFixed(2) : '0.00') + '</td><td><button class="icon-btn" onclick="deleteAdminUser(' + u.id + ')" style="color: #EF4444;">🗑️</button></td></tr>'; }); tbody.innerHTML = html; } } } catch (e) {}
}
window.deleteAdminUser = async function(id) { if (!confirm('Удалить?')) return; await fetch(API_BASE + '/api/admin/users/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } }); loadAdminUsers(); };

// ========== Лидерборд ==========
async function loadLeaderboard() {
    var limit = document.getElementById('leaderboardLimit')?.value || 25; var tbody = document.getElementById('leaderboardBody'); if (!tbody) return;
    try { var r = await fetch(API_BASE + '/api/leaderboard?limit=' + limit); var data = await r.json(); var html = ''; data.forEach(function(row) { html += '<tr><td>' + row.rank + '</td><td>' + row.username + '</td><td class="' + (row.totalPL >= 0 ? 'profit-text' : 'loss-text') + '">' + (row.totalPL >= 0 ? '+' : '') + '$' + row.totalPL.toFixed(2) + '</td><td>' + row.winRate + '%</td><td>' + row.totalTrades + '</td></tr>'; }); tbody.innerHTML = html || '<tr><td colspan="5" class="empty-message">Нет данных</td></tr>'; } catch (e) {}
}

// ========== Экспорт/импорт ==========
function exportData() { var data = { trades: trades, exportDate: new Date().toISOString() }; var blob = new Blob([JSON.stringify(data)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trades-' + Date.now() + '.json'; a.click(); showToast('Данные экспортированы', 'success'); }
function importData(e) { var file = e.target.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = async function(ev) { try { var data = JSON.parse(ev.target.result); if (data.trades && confirm('Импортировать ' + data.trades.length + ' сделок?')) { await fetch(API_BASE + '/api/trades/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ trades: data.trades }) }); await loadTrades(); renderJournal(); showToast('Импорт завершён', 'success'); } } catch (err) { showToast('Ошибка чтения файла', 'error'); } }; reader.readAsText(file); e.target.value = ''; }
async function clearAllData() { if (!confirm('Удалить все сделки?')) return; await fetch(API_BASE + '/api/trades/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ trades: [] }) }); trades = []; renderJournal(); showToast('Данные очищены', 'info'); }

// ========== Фон ==========
(function() {
    var canvas = document.getElementById('particleCanvas'); if (!canvas) return;
    var ctx = canvas.getContext('2d'), w = window.innerWidth, h = window.innerHeight, mx = w/2, my = h/2;
    var particles = [], count = 100, connDist = 150, infDist = 250;
    function Particle() { this.x = Math.random()*w; this.y = Math.random()*h; this.vx = (Math.random()-0.5)*0.2; this.vy = (Math.random()-0.5)*0.2; this.s = Math.random()*2.5+1.5; this.bx = this.x; this.by = this.y; }
    Particle.prototype.update = function() { var dx = mx-this.x, dy = my-this.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist < infDist) { var f = (1-dist/infDist)*0.15; this.vx += dx*f; this.vy += dy*f; } this.vx += (this.bx-this.x)*0.005; this.vy += (this.by-this.y)*0.005; this.vx *= 0.95; this.vy *= 0.95; this.x += this.vx; this.y += this.vy; if (this.x<0){this.x=0;this.vx*=-0.5;} if (this.x>w){this.x=w;this.vx*=-0.5;} if (this.y<0){this.y=0;this.vy*=-0.5;} if (this.y>h){this.y=h;this.vy*=-0.5;} };
    Particle.prototype.draw = function() { var dx = mx-this.x, dy = my-this.y, dist = Math.sqrt(dx*dx+dy*dy), op = 0.4, sz = this.s; if (dist < infDist) { op = 0.8; sz = this.s*1.5; } var g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, sz*2); g.addColorStop(0, 'rgba(16,185,129,'+op+')'); g.addColorStop(1, 'rgba(59,130,246,'+(op*0.5)+')'); ctx.beginPath(); ctx.arc(this.x, this.y, sz, 0, 2*Math.PI); ctx.fillStyle = g; ctx.fill(); };
    function init() { particles = []; for (var i=0; i<count; i++) particles.push(new Particle()); }
    function drawConnections() { for (var i=0; i<particles.length; i++) for (var j=i+1; j<particles.length; j++) { var dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y, dist=Math.sqrt(dx*dx+dy*dy); if (dist < connDist) { var op = 0.15*(1-dist/connDist); var g = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y); g.addColorStop(0, 'rgba(16,185,129,'+op+')'); g.addColorStop(1, 'rgba(59,130,246,'+op+')'); ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = g; ctx.lineWidth = 0.5; ctx.stroke(); } } }
    function animate() { ctx.clearRect(0, 0, w, h); particles.forEach(function(p){p.update();}); drawConnections(); particles.forEach(function(p){p.draw();}); requestAnimationFrame(animate); }
    window.addEventListener('resize', function(){ w=window.innerWidth; h=window.innerHeight; canvas.width=w; canvas.height=h; init(); });
    window.addEventListener('mousemove', function(e){ mx=e.clientX; my=e.clientY; });
    canvas.width=w; canvas.height=h; init(); animate();
})();

// Фон для онбординга (аналогично, сокращённо)
(function() {
    var canvas = document.getElementById('onboardingParticleCanvas'); if (!canvas) return;
    var ctx = canvas.getContext('2d'), w = window.innerWidth, h = window.innerHeight, mx = w/2, my = h/2, particles = [], count = 80;
    function Particle() { this.x = Math.random()*w; this.y = Math.random()*h; this.vx = (Math.random()-0.5)*0.2; this.vy = (Math.random()-0.5)*0.2; this.s = Math.random()*2.5+1.5; this.bx = this.x; this.by = this.y; }
    Particle.prototype.update = function() { var dx = mx-this.x, dy = my-this.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist < 250) { var f = (1-dist/250)*0.15; this.vx += dx*f; this.vy += dy*f; } this.vx += (this.bx-this.x)*0.005; this.vy += (this.by-this.y)*0.005; this.vx *= 0.95; this.vy *= 0.95; this.x += this.vx; this.y += this.vy; if (this.x<0){this.x=0;this.vx*=-0.5;} if (this.x>w){this.x=w;this.vx*=-0.5;} if (this.y<0){this.y=0;this.vy*=-0.5;} if (this.y>h){this.y=h;this.vy*=-0.5;} };
    Particle.prototype.draw = function() { var dx = mx-this.x, dy = my-this.y, dist = Math.sqrt(dx*dx+dy*dy), op = 0.4, sz = this.s; if (dist < 250) { op = 0.8; sz = this.s*1.5; } var g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, sz*2); g.addColorStop(0, 'rgba(16,185,129,'+op+')'); g.addColorStop(1, 'rgba(59,130,246,'+(op*0.5)+')'); ctx.beginPath(); ctx.arc(this.x, this.y, sz, 0, 2*Math.PI); ctx.fillStyle = g; ctx.fill(); };
    function init() { particles = []; for (var i=0; i<count; i++) particles.push(new Particle()); }
    function drawConnections() { for (var i=0; i<particles.length; i++) for (var j=i+1; j<particles.length; j++) { var dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y, dist=Math.sqrt(dx*dx+dy*dy); if (dist < 150) { var op = 0.15*(1-dist/150); var g = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y); g.addColorStop(0, 'rgba(16,185,129,'+op+')'); g.addColorStop(1, 'rgba(59,130,246,'+op+')'); ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = g; ctx.lineWidth = 0.5; ctx.stroke(); } } }
    function animate() { ctx.clearRect(0, 0, w, h); particles.forEach(function(p){p.update();}); drawConnections(); particles.forEach(function(p){p.draw();}); requestAnimationFrame(animate); }
    window.addEventListener('resize', function(){ w=window.innerWidth; h=window.innerHeight; canvas.width=w; canvas.height=h; init(); });
    window.addEventListener('mousemove', function(e){ mx=e.clientX; my=e.clientY; });
    canvas.width=w; canvas.height=h; init(); animate();
})();