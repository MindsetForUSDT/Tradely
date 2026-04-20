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

    var modeCards = document.querySelectorAll('.mode-card');
    for (var i = 0; i < modeCards.length; i++) {
        modeCards[i].classList.remove('selected');
    }

    var walletOptions = document.querySelectorAll('.wallet-option-new');
    for (var i = 0; i < walletOptions.length; i++) {
        walletOptions[i].classList.remove('selected');
    }

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
        alert('Premium раздел доступен только для Pro трейдеров');
        return;
    }
    if (viewName === 'admin' && !isAdmin) {
        alert('Доступ запрещён');
        return;
    }

    currentView = viewName;

    var views = document.querySelectorAll('.view-container');
    for (var i = 0; i < views.length; i++) {
        views[i].classList.add('hidden');
    }

    var viewEl = document.getElementById(viewName + 'View');
    if (viewEl) viewEl.classList.remove('hidden');

    var navLinks = document.querySelectorAll('.nav-link-header, .mobile-nav-link');
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].classList.remove('active');
        if (navLinks[i].dataset.view === viewName) {
            navLinks[i].classList.add('active');
        }
    }

    var titles = {
        journal: 'Журнал',
        analytics: 'Аналитика',
        premium: 'Premium',
        leaderboard: 'Рейтинг',
        admin: 'Админ-панель',
        settings: 'Настройки'
    };

    var h2 = document.querySelector('.page-header h2');
    if (h2) h2.textContent = titles[viewName] || 'Журнал';

    if (viewName === 'leaderboard') {
        if (!userStatus.wallet_connected && !isAdmin) {
            alert('Только Pro трейдеры имеют доступ к таблице лидеров');
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
    var authSwitches = document.querySelectorAll('.auth-switch');
    for (var i = 0; i < authSwitches.length; i++) {
        authSwitches[i].addEventListener('click', function() {
            var switches = document.querySelectorAll('.auth-switch');
            for (var j = 0; j < switches.length; j++) {
                switches[j].classList.remove('active');
            }
            this.classList.add('active');

            var isLogin = this.dataset.auth === 'login';
            var loginForm = document.getElementById('loginForm');
            var registerForm = document.getElementById('registerForm');
            var authError = document.getElementById('authError');

            if (loginForm) loginForm.classList.toggle('hidden', !isLogin);
            if (registerForm) registerForm.classList.toggle('hidden', isLogin);
            if (authError) authError.textContent = '';
        });
    }

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
                    body: JSON.stringify({
                        username: formData.get('username'),
                        password: formData.get('password')
                    })
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

                    if (userStatus.first_login) {
                        showOnboardingScreen();
                    } else {
                        await loadTrades();
                        showAppScreen();
                    }
                } else {
                    if (authError) authError.textContent = data.error || 'Ошибка входа';
                }
            } catch (error) {
                if (authError) authError.textContent = 'Ошибка соединения';
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

            if (!username || !password || !confirmPassword) {
                if (authError) authError.textContent = 'Все поля обязательны';
                return;
            }
            if (username.length < 3) {
                if (authError) authError.textContent = 'Логин: минимум 3 символа';
                return;
            }
            if (password.length < 6) {
                if (authError) authError.textContent = 'Пароль: минимум 6 символов';
                return;
            }
            if (password !== confirmPassword) {
                if (authError) authError.textContent = 'Пароли не совпадают';
                return;
            }

            try {
                var response = await fetch(API_BASE + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username, password: password })
                });

                var data = await response.json();

                if (response.ok) {
                    authToken = data.token;
                    currentUser = data.user;
                    userStatus = {
                        wallet_connected: false,
                        is_public: false,
                        first_login: true,
                        is_admin: false
                    };
                    localStorage.setItem('authToken', authToken);
                    showOnboardingScreen();
                } else {
                    if (authError) authError.textContent = data.error || 'Ошибка регистрации';
                }
            } catch (error) {
                if (authError) authError.textContent = 'Ошибка соединения';
            }
        });
    }

    // Онбординг: выбор режима
    var modeCards = document.querySelectorAll('.mode-card');
    for (var i = 0; i < modeCards.length; i++) {
        modeCards[i].addEventListener('click', function() {
            var cards = document.querySelectorAll('.mode-card');
            for (var j = 0; j < cards.length; j++) {
                cards[j].classList.remove('selected');
            }
            this.classList.add('selected');
            selectedMode = this.dataset.mode;
            var continueBtn = document.getElementById('continueOnboarding');
            if (continueBtn) continueBtn.disabled = false;
        });
    }

    // Онбординг: продолжить
    var continueBtn = document.getElementById('continueOnboarding');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            if (selectedMode === 'pro') {
                var modeStep = document.getElementById('modeStep');
                var walletStep = document.getElementById('walletStep');
                if (modeStep) modeStep.classList.add('hidden');
                if (walletStep) walletStep.classList.remove('hidden');
            } else {
                finishOnboarding(false);
            }
        });
    }

    // Онбординг: выбор кошелька
    var walletOptions = document.querySelectorAll('.wallet-option-new');
    for (var i = 0; i < walletOptions.length; i++) {
        walletOptions[i].addEventListener('click', function() {
            var options = document.querySelectorAll('.wallet-option-new');
            for (var j = 0; j < options.length; j++) {
                options[j].classList.remove('selected');
            }
            this.classList.add('selected');
            selectedWalletType = this.dataset.wallet;
            checkWalletForm();
        });
    }

    // Онбординг: ввод адреса
    var walletInput = document.getElementById('walletAddressInput');
    if (walletInput) {
        walletInput.addEventListener('input', checkWalletForm);
    }

    function checkWalletForm() {
        var addressInput = document.getElementById('walletAddressInput');
        var address = addressInput ? addressInput.value.trim() : '';
        var finishBtn = document.getElementById('finishOnboarding');
        if (finishBtn) finishBtn.disabled = !selectedWalletType || !address;
    }

    // Онбординг: назад
    var backBtn = document.getElementById('backToMode');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            var walletStep = document.getElementById('walletStep');
            var modeStep = document.getElementById('modeStep');
            if (walletStep) walletStep.classList.add('hidden');
            if (modeStep) modeStep.classList.remove('hidden');
        });
    }

    // Онбординг: завершить
    var finishBtn = document.getElementById('finishOnboarding');
    if (finishBtn) {
        finishBtn.addEventListener('click', function() {
            finishOnboarding(true);
        });
    }

    async function finishOnboarding(isPro) {
        try {
            if (isPro) {
                var addressInput = document.getElementById('walletAddressInput');
                var address = addressInput ? addressInput.value.trim() : '';
                await fetch(API_BASE + '/api/user/wallet', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ wallet_address: address, wallet_type: selectedWalletType })
                });
                userStatus.wallet_connected = true;
            } else {
                await fetch(API_BASE + '/api/user/skip-wallet', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                userStatus.wallet_connected = false;
            }

            userStatus.first_login = false;
            await loadTrades();
            showAppScreen();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    // Навигация
    var navElements = document.querySelectorAll('[data-view]');
    for (var i = 0; i < navElements.length; i++) {
        navElements[i].addEventListener('click', function(e) {
            e.preventDefault();
            switchView(this.dataset.view);
        });
    }

    // Мобильное меню
    var menuToggle = document.getElementById('menuToggle');
    var mobileMenu = document.getElementById('mobileMenu');
    var closeMenu = document.getElementById('closeMenu');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            if (mobileMenu) mobileMenu.classList.remove('hidden');
        });
    }
    if (closeMenu) {
        closeMenu.addEventListener('click', function() {
            if (mobileMenu) mobileMenu.classList.add('hidden');
        });
    }

    // Выход
    function logout() {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        trades = [];
        showWelcomeScreen();
    }

    var headerLogout = document.getElementById('headerLogout');
    var logoutBtn = document.getElementById('logoutBtn');
    if (headerLogout) headerLogout.addEventListener('click', logout);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Терминал
    var addTradeBtn = document.getElementById('addTradeBtn');
    if (addTradeBtn) addTradeBtn.addEventListener('click', addTrade);

    var refreshData = document.getElementById('refreshData');
    if (refreshData) {
        refreshData.addEventListener('click', async function() {
            await loadTrades();
            renderJournal();
        });
    }

    // Переключатель LONG/SHORT
    var typeOptions = document.querySelectorAll('.type-option');
    for (var i = 0; i < typeOptions.length; i++) {
        typeOptions[i].addEventListener('click', function() {
            var options = document.querySelectorAll('.type-option');
            for (var j = 0; j < options.length; j++) {
                options[j].classList.remove('active');
            }
            this.classList.add('active');
        });
    }

    // Фильтры
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].addEventListener('click', function() {
            var btns = document.querySelectorAll('.filter-btn');
            for (var j = 0; j < btns.length; j++) {
                btns[j].classList.remove('active');
            }
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderJournal();
        });
    }

    // Лидерборд
    var leaderboardLimit = document.getElementById('leaderboardLimit');
    if (leaderboardLimit) leaderboardLimit.addEventListener('change', loadLeaderboard);

    // Настройки
    var publicToggle = document.getElementById('publicProfileToggle');
    if (publicToggle) {
        publicToggle.addEventListener('change', async function(e) {
            if (!userStatus.wallet_connected) {
                e.target.checked = false;
                alert('Требуется Pro статус');
                return;
            }
            try {
                await fetch(API_BASE + '/api/user/public', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ is_public: e.target.checked })
                });
                userStatus.is_public = e.target.checked;
            } catch (error) {
                e.target.checked = !e.target.checked;
            }
        });
    }

    // Экспорт/импорт
    var exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);

    var importBtn = document.getElementById('importDataBtn');
    var importFile = document.getElementById('importFileInput');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', function() {
            importFile.click();
        });
    }
    if (importFile) importFile.addEventListener('change', importData);

    var clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);

    var upgradeBtn = document.getElementById('upgradeToProBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', function() {
            switchView('settings');
        });
    }
}

// ========== Работа со сделками ==========
async function loadTrades() {
    try {
        var response = await fetch(API_BASE + '/api/trades', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (response.ok) {
            trades = await response.json();
            trades.sort(function(a, b) { return b.timestamp - a.timestamp; });
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

async function addTrade() {
    if (userStatus.wallet_connected) {
        alert('Ручное добавление недоступно для Pro');
        return;
    }

    var pairInput = document.getElementById('pairInput');
    var volumeInput = document.getElementById('volumeInput');
    var profitBtn = document.querySelector('.type-option.profit');

    var pair = pairInput ? pairInput.value.trim() : '';
    var volume = volumeInput ? parseFloat(volumeInput.value.trim().replace(',', '.')) : NaN;
    var isProfit = profitBtn ? profitBtn.classList.contains('active') : true;

    if (!pair) { alert('Введите пару'); return; }
    if (isNaN(volume) || volume <= 0) { alert('Введите объём'); return; }

    var newTrade = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        pair: pair.toUpperCase(),
        volume: volume,
        type: isProfit ? 'profit' : 'loss',
        timestamp: Date.now()
    };

    try {
        var response = await fetch(API_BASE + '/api/trades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(newTrade)
        });

        if (response.ok) {
            trades.unshift(newTrade);
            renderJournal();
            if (volumeInput) volumeInput.value = '';
        } else {
            var data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function deleteTrade(tradeId) {
    if (userStatus.wallet_connected) {
        alert('Удаление недоступно для Pro');
        return;
    }

    try {
        var response = await fetch(API_BASE + '/api/trades/' + tradeId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (response.ok) {
            trades = trades.filter(function(t) { return t.id !== tradeId; });
            renderJournal();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

window.deleteTrade = deleteTrade;

function renderJournal() {
    var tbody = document.getElementById('tradesList');
    if (!tbody) return;

    var filtered = currentFilter === 'all' ? trades : trades.filter(function(t) { return t.type === currentFilter; });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-message">Нет сделок</td></tr>';
    } else {
        var html = '';
        for (var i = 0; i < filtered.length; i++) {
            var t = filtered[i];
            var time = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            var isProfit = t.type === 'profit';
            var actions = userStatus.wallet_connected ? '' :
                '<button class="icon-btn" onclick="deleteTrade(\'' + t.id + '\')" style="width: 28px; height: 28px;">🗑️</button>';
            html += '<tr>' +
                '<td>' + time + '</td>' +
                '<td>' + t.pair + '</td>' +
                '<td>' + t.volume.toFixed(2) + '</td>' +
                '<td class="' + (isProfit ? 'profit-text' : 'loss-text') + '">' + (isProfit ? '+' : '−') + ' $' + t.volume.toFixed(2) + '</td>' +
                '<td>' + actions + '</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    updateStats();
}

function updateStats() {
    var totalPL = 0, wins = 0, maxProfit = 0, maxLoss = 0, profitSum = 0, lossSum = 0;

    for (var i = 0; i < trades.length; i++) {
        var t = trades[i];
        if (t.type === 'profit') {
            totalPL += t.volume; wins++; profitSum += t.volume;
            maxProfit = Math.max(maxProfit, t.volume);
        } else {
            totalPL -= t.volume; lossSum += t.volume;
            maxLoss = Math.max(maxLoss, t.volume);
        }
    }

    var winRate = trades.length ? (wins / trades.length) * 100 : 0;
    var avgProfit = wins ? profitSum / wins : 0;
    var avgLoss = (trades.length - wins) ? lossSum / (trades.length - wins) : 0;

    var totalPLEl = document.getElementById('totalPL');
    if (totalPLEl) {
        totalPLEl.textContent = (totalPL >= 0 ? '+' : '−') + '$' + Math.abs(totalPL).toFixed(2);
        totalPLEl.className = 'stat-value-new ' + (totalPL >= 0 ? 'profit-text' : 'loss-text');
    }

    var winRateEl = document.getElementById('winRate');
    if (winRateEl) winRateEl.textContent = winRate.toFixed(1) + '%';

    var progressEl = document.getElementById('winRateProgress');
    if (progressEl) progressEl.style.width = winRate + '%';

    var totalTradesEl = document.getElementById('totalTradesCount');
    if (totalTradesEl) totalTradesEl.textContent = trades.length;

    var winCountEl = document.getElementById('winCount');
    if (winCountEl) winCountEl.textContent = wins + ' LONG';

    var lossCountEl = document.getElementById('lossCount');
    if (lossCountEl) lossCountEl.textContent = (trades.length - wins) + ' SHORT';

    var plChange = document.getElementById('plChange');
    if (plChange && trades.length) {
        var last = trades[0];
        plChange.textContent = (last.type === 'profit' ? '+' : '-') + '$' + last.volume.toFixed(2);
        plChange.className = 'stat-change-new ' + (last.type === 'profit' ? 'positive' : 'negative');
    }

    var avgProfitEl = document.getElementById('avgProfit');
    if (avgProfitEl) avgProfitEl.textContent = '$' + avgProfit.toFixed(2);

    var avgLossEl = document.getElementById('avgLoss');
    if (avgLossEl) avgLossEl.textContent = '$' + avgLoss.toFixed(2);

    var bestTradeEl = document.getElementById('bestTrade');
    if (bestTradeEl) bestTradeEl.textContent = '$' + maxProfit.toFixed(2);

    var worstTradeEl = document.getElementById('worstTrade');
    if (worstTradeEl) worstTradeEl.textContent = '$' + maxLoss.toFixed(2);
}

function updateCharts() {
    var ctx1 = document.getElementById('plChart');
    if (ctx1) {
        var context1 = ctx1.getContext('2d');
        if (plChart) plChart.destroy();
        var sorted = trades.slice().sort(function(a, b) { return a.timestamp - b.timestamp; });
        var cum = 0;
        var data = [], labels = [];
        for (var i = 0; i < sorted.length; i++) {
            var t = sorted[i];
            cum += t.type === 'profit' ? t.volume : -t.volume;
            data.push(cum);
            labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
        }
        plChart = new Chart(context1, {
            type: 'line',
            data: {
                labels: labels.slice(-50),
                datasets: [{
                    data: data.slice(-50),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    var ctx2 = document.getElementById('ratioChart');
    if (ctx2) {
        var context2 = ctx2.getContext('2d');
        if (ratioChart) ratioChart.destroy();
        var wins = trades.filter(function(t) { return t.type === 'profit'; }).length;
        var losses = trades.length - wins;
        ratioChart = new Chart(context2, {
            type: 'doughnut',
            data: {
                labels: ['LONG', 'SHORT'],
                datasets: [{
                    data: [wins, losses],
                    backgroundColor: ['#10B981', '#EF4444']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        var profitPercent = document.getElementById('profitPercent');
        var lossPercent = document.getElementById('lossPercent');
        if (profitPercent) profitPercent.textContent = trades.length ? ((wins / trades.length) * 100).toFixed(1) + '%' : '0%';
        if (lossPercent) lossPercent.textContent = trades.length ? ((losses / trades.length) * 100).toFixed(1) + '%' : '0%';
    }
}

function updateDate() {
    var now = new Date();
    var el = document.getElementById('currentDate');
    if (el) el.textContent = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function updateProfileDisplay() {
    if (currentUser) {
        var headerUsername = document.getElementById('headerUsername');
        var profileUsername = document.getElementById('profileUsername');
        if (headerUsername) headerUsername.textContent = currentUser.username;
        if (profileUsername) profileUsername.textContent = currentUser.username;

        var tariffName = document.getElementById('tariffName');
        var tariffPrice = document.getElementById('tariffPrice');
        var accountType = document.getElementById('accountTypeDisplay');

        if (userStatus.wallet_connected) {
            if (tariffName) tariffName.textContent = 'Pro Аналитика';
            if (tariffPrice) tariffPrice.textContent = '500 ₽/мес';
            if (accountType) accountType.textContent = 'Pro';
        } else {
            if (tariffName) tariffName.textContent = 'Базовый';
            if (tariffPrice) tariffPrice.textContent = 'Бесплатно';
            if (accountType) accountType.textContent = 'Базовый';
        }

        var toggle = document.getElementById('publicProfileToggle');
        if (toggle) toggle.checked = userStatus.is_public;
    }
}

// ========== Premium ==========
async function loadPremiumAnalytics() {
    try {
        var res = await fetch(API_BASE + '/api/premium/analytics', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (res.ok) {
            var d = await res.json();
            var profitFactor = document.getElementById('profitFactor');
            var sharpeRatio = document.getElementById('sharpeRatio');
            var maxDrawdown = document.getElementById('maxDrawdown');
            var monthlyProjection = document.getElementById('monthlyProjection');
            var bestPair = document.getElementById('bestPair');
            var worstPair = document.getElementById('worstPair');
            var bestDay = document.getElementById('bestDay');
            var worstDay = document.getElementById('worstDay');

            if (profitFactor) profitFactor.textContent = d.profitFactor;
            if (sharpeRatio) sharpeRatio.textContent = d.sharpeRatio;
            if (maxDrawdown) maxDrawdown.textContent = '$' + d.maxDrawdown;
            if (monthlyProjection) monthlyProjection.textContent = '$' + d.monthlyProjection;
            if (bestPair) bestPair.textContent = d.bestPair;
            if (worstPair) worstPair.textContent = d.worstPair;
            if (bestDay) bestDay.textContent = d.bestDay ? d.bestDay.date + ' (+$' + d.bestDay.pl + ')' : '—';
            if (worstDay) worstDay.textContent = d.worstDay ? d.worstDay.date + ' (-$' + Math.abs(d.worstDay.pl) + ')' : '—';

            var recs = [];
            if (d.winRate > 60) recs.push('Отличный винрейт!');
            if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!');
            var recEl = document.getElementById('premiumRecommendations');
            if (recEl) {
                var html = '';
                for (var i = 0; i < recs.length; i++) {
                    html += '<p>• ' + recs[i] + '</p>';
                }
                recEl.innerHTML = html || '<p>Недостаточно данных</p>';
            }
        }
    } catch (e) {}
}

// ========== Админ ==========
async function loadAdminUsers() {
    try {
        var res = await fetch(API_BASE + '/api/admin/users', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (res.ok) {
            var users = await res.json();
            var tbody = document.getElementById('adminUsersList');
            if (tbody) {
                var html = '';
                for (var i = 0; i < users.length; i++) {
                    var u = users[i];
                    html += '<tr>' +
                        '<td>' + u.id + '</td>' +
                        '<td>' + u.username + '</td>' +
                        '<td>' + (u.wallet_connected ? '✅' : '❌') + '</td>' +
                        '<td>' + (u.trades_count || 0) + '</td>' +
                        '<td class="' + (u.total_pl >= 0 ? 'profit-text' : 'loss-text') + '">$' + (u.total_pl ? u.total_pl.toFixed(2) : '0.00') + '</td>' +
                        '<td><button class="icon-btn" onclick="deleteAdminUser(' + u.id + ')" style="color: #EF4444;">🗑️</button></td>' +
                        '</tr>';
                }
                tbody.innerHTML = html;
            }
        }
    } catch (e) {}
}

window.deleteAdminUser = async function(id) {
    if (!confirm('Удалить?')) return;
    await fetch(API_BASE + '/api/admin/users/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + authToken }
    });
    loadAdminUsers();
};

// ========== Лидерборд ==========
async function loadLeaderboard() {
    var limitEl = document.getElementById('leaderboardLimit');
    var limit = limitEl ? limitEl.value : 25;
    var tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    try {
        var res = await fetch(API_BASE + '/api/leaderboard?limit=' + limit);
        var data = await res.json();
        var html = '';
        for (var i = 0; i < data.length; i++) {
            var r = data[i];
            html += '<tr>' +
                '<td>' + r.rank + '</td>' +
                '<td>' + r.username + '</td>' +
                '<td class="' + (r.totalPL >= 0 ? 'profit-text' : 'loss-text') + '">' + (r.totalPL >= 0 ? '+' : '') + '$' + r.totalPL.toFixed(2) + '</td>' +
                '<td>' + r.winRate + '%</td>' +
                '<td>' + r.totalTrades + '</td>' +
                '</tr>';
        }
        tbody.innerHTML = html || '<tr><td colspan="5" class="empty-message">Нет данных</td></tr>';
    } catch (e) {}
}

// ========== Экспорт/импорт ==========
function exportData() {
    var data = { trades: trades, exportDate: new Date().toISOString() };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trades-' + Date.now() + '.json';
    a.click();
}

function importData(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            var data = JSON.parse(ev.target.result);
            if (data.trades && confirm('Импортировать ' + data.trades.length + ' сделок?')) {
                await fetch(API_BASE + '/api/trades/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ trades: data.trades })
                });
                await loadTrades();
                renderJournal();
            }
        } catch (err) {}
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function clearAllData() {
    if (!confirm('Удалить всё?')) return;
    await fetch(API_BASE + '/api/trades/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ trades: [] })
    });
    trades = [];
    renderJournal();
}

// ========== ДИНАМИЧНЫЙ ФОН ==========
(function() {
    var canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width = window.innerWidth;
    var height = window.innerHeight;
    var mouseX = width / 2;
    var mouseY = height / 2;

    var particles = [];
    var particleCount = 100;
    var connectionDistance = 150;
    var mouseInfluenceDistance = 250;

    function Particle() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.size = Math.random() * 2.5 + 1.5;
        this.baseX = this.x;
        this.baseY = this.y;
    }

    Particle.prototype.update = function() {
        var dx = mouseX - this.x;
        var dy = mouseY - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseInfluenceDistance) {
            var force = (1 - dist / mouseInfluenceDistance) * 0.15;
            this.vx += dx * force;
            this.vy += dy * force;
        }

        var homeDx = this.baseX - this.x;
        var homeDy = this.baseY - this.y;
        this.vx += homeDx * 0.005;
        this.vy += homeDy * 0.005;

        this.vx *= 0.95;
        this.vy *= 0.95;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; this.vx *= -0.5; }
        if (this.x > width) { this.x = width; this.vx *= -0.5; }
        if (this.y < 0) { this.y = 0; this.vy *= -0.5; }
        if (this.y > height) { this.y = height; this.vy *= -0.5; }
    };

    Particle.prototype.draw = function() {
        var dx = mouseX - this.x;
        var dy = mouseY - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        var opacity = 0.4;
        var size = this.size;

        if (dist < mouseInfluenceDistance) {
            opacity = 0.8;
            size = this.size * 1.5;
        }

        var gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 2);
        gradient.addColorStop(0, 'rgba(16, 185, 129, ' + opacity + ')');
        gradient.addColorStop(1, 'rgba(59, 130, 246, ' + (opacity * 0.5) + ')');

        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    };

    function init() {
        particles.length = 0;
        for (var i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function drawConnections() {
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    var opacity = 0.15 * (1 - dist / connectionDistance);

                    var gradient = ctx.createLinearGradient(
                        particles[i].x, particles[i].y,
                        particles[j].x, particles[j].y
                    );
                    gradient.addColorStop(0, 'rgba(16, 185, 129, ' + opacity + ')');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, ' + opacity + ')');

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (var i = 0; i < particles.length; i++) particles[i].update();
        drawConnections();
        for (var i = 0; i < particles.length; i++) particles[i].draw();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', function() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    });

    window.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    canvas.width = width;
    canvas.height = height;
    init();
    animate();
})();

// ========== ФОН ДЛЯ ОНБОРДИНГА ==========
(function() {
    var canvas = document.getElementById('onboardingParticleCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width = window.innerWidth;
    var height = window.innerHeight;
    var mouseX = width / 2;
    var mouseY = height / 2;

    var particles = [];
    var particleCount = 80;
    var connectionDistance = 150;
    var mouseInfluenceDistance = 250;

    function Particle() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.size = Math.random() * 2.5 + 1.5;
        this.baseX = this.x;
        this.baseY = this.y;
    }

    Particle.prototype.update = function() {
        var dx = mouseX - this.x;
        var dy = mouseY - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseInfluenceDistance) {
            var force = (1 - dist / mouseInfluenceDistance) * 0.15;
            this.vx += dx * force;
            this.vy += dy * force;
        }

        var homeDx = this.baseX - this.x;
        var homeDy = this.baseY - this.y;
        this.vx += homeDx * 0.005;
        this.vy += homeDy * 0.005;

        this.vx *= 0.95;
        this.vy *= 0.95;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; this.vx *= -0.5; }
        if (this.x > width) { this.x = width; this.vx *= -0.5; }
        if (this.y < 0) { this.y = 0; this.vy *= -0.5; }
        if (this.y > height) { this.y = height; this.vy *= -0.5; }
    };

    Particle.prototype.draw = function() {
        var dx = mouseX - this.x;
        var dy = mouseY - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        var opacity = 0.4;
        var size = this.size;

        if (dist < mouseInfluenceDistance) {
            opacity = 0.8;
            size = this.size * 1.5;
        }

        var gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 2);
        gradient.addColorStop(0, 'rgba(16, 185, 129, ' + opacity + ')');
        gradient.addColorStop(1, 'rgba(59, 130, 246, ' + (opacity * 0.5) + ')');

        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    };

    function init() {
        particles.length = 0;
        for (var i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function drawConnections() {
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    var opacity = 0.15 * (1 - dist / connectionDistance);

                    var gradient = ctx.createLinearGradient(
                        particles[i].x, particles[i].y,
                        particles[j].x, particles[j].y
                    );
                    gradient.addColorStop(0, 'rgba(16, 185, 129, ' + opacity + ')');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, ' + opacity + ')');

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (var i = 0; i < particles.length; i++) particles[i].update();
        drawConnections();
        for (var i = 0; i < particles.length; i++) particles[i].draw();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', function() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    });

    window.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    canvas.width = width;
    canvas.height = height;
    init();
    animate();
})();