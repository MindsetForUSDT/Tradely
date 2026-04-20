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
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

window.addEventListener('load', () => {
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.classList.add('fade-out');
    }, 500);
});

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        fetchUserProfile();
    } else {
        showWelcomeScreen();
    }
}

async function fetchUserProfile() {
    try {
        const response = await fetch(`${API_BASE}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
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
    document.getElementById('preloader')?.classList.add('hidden');
    document.getElementById('welcomeScreen')?.classList.remove('hidden');
    document.getElementById('onboardingScreen')?.classList.add('hidden');
    document.getElementById('appScreen')?.classList.add('hidden');
}

function showOnboardingScreen() {
    document.getElementById('preloader')?.classList.add('hidden');
    document.getElementById('welcomeScreen')?.classList.add('hidden');
    document.getElementById('onboardingScreen')?.classList.remove('hidden');
    document.getElementById('appScreen')?.classList.add('hidden');

    const usernameEl = document.getElementById('onboardingUsername');
    if (usernameEl) usernameEl.textContent = currentUser?.username || 'Trader';

    selectedMode = null;
    selectedWalletType = null;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.wallet-option-new').forEach(w => w.classList.remove('selected'));

    const continueBtn = document.getElementById('continueOnboarding');
    if (continueBtn) continueBtn.disabled = true;

    const finishBtn = document.getElementById('finishOnboarding');
    if (finishBtn) finishBtn.disabled = true;
}

function showAppScreen() {
    document.getElementById('preloader')?.classList.add('hidden');
    document.getElementById('welcomeScreen')?.classList.add('hidden');
    document.getElementById('onboardingScreen')?.classList.add('hidden');
    document.getElementById('appScreen')?.classList.remove('hidden');

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

    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
    const viewEl = document.getElementById(`${viewName}View`);
    if (viewEl) viewEl.classList.remove('hidden');

    document.querySelectorAll('.nav-link-header, .mobile-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) link.classList.add('active');
    });

    const titles = {
        journal: 'Журнал',
        analytics: 'Аналитика',
        premium: 'Premium',
        leaderboard: 'Рейтинг',
        admin: 'Админ-панель',
        settings: 'Настройки'
    };

    const h2 = document.querySelector('.page-header h2');
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
    document.querySelectorAll('.auth-switch').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-switch').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const isLogin = tab.dataset.auth === 'login';
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            const authError = document.getElementById('authError');

            if (loginForm) loginForm.classList.toggle('hidden', !isLogin);
            if (registerForm) registerForm.classList.toggle('hidden', isLogin);
            if (authError) authError.textContent = '';
        });
    });

    // Форма входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const authError = document.getElementById('authError');

            try {
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.get('username'),
                        password: formData.get('password')
                    })
                });

                const data = await response.json();

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
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const authError = document.getElementById('authError');

            const username = formData.get('username');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');

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
                const response = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

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
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedMode = card.dataset.mode;
            const continueBtn = document.getElementById('continueOnboarding');
            if (continueBtn) continueBtn.disabled = false;
        });
    });

    // Онбординг: продолжить
    const continueBtn = document.getElementById('continueOnboarding');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            if (selectedMode === 'pro') {
                document.getElementById('modeStep')?.classList.add('hidden');
                document.getElementById('walletStep')?.classList.remove('hidden');
            } else {
                finishOnboarding(false);
            }
        });
    }

    // Онбординг: выбор кошелька
    document.querySelectorAll('.wallet-option-new').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.wallet-option-new').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedWalletType = opt.dataset.wallet;
            checkWalletForm();
        });
    });

    // Онбординг: ввод адреса
    const walletInput = document.getElementById('walletAddressInput');
    if (walletInput) {
        walletInput.addEventListener('input', checkWalletForm);
    }

    function checkWalletForm() {
        const address = document.getElementById('walletAddressInput')?.value.trim();
        const finishBtn = document.getElementById('finishOnboarding');
        if (finishBtn) finishBtn.disabled = !selectedWalletType || !address;
    }

    // Онбординг: назад
    const backBtn = document.getElementById('backToMode');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('walletStep')?.classList.add('hidden');
            document.getElementById('modeStep')?.classList.remove('hidden');
        });
    }

    // Онбординг: завершить
    const finishBtn = document.getElementById('finishOnboarding');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => finishOnboarding(true));
    }

    async function finishOnboarding(isPro) {
        try {
            if (isPro) {
                const address = document.getElementById('walletAddressInput')?.value.trim();
                await fetch(`${API_BASE}/api/user/wallet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ wallet_address: address, wallet_type: selectedWalletType })
                });
                userStatus.wallet_connected = true;
            } else {
                await fetch(`${API_BASE}/api/user/skip-wallet`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` }
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
    document.querySelectorAll('[data-view]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(el.dataset.view);
        });
    });

    // Мобильное меню
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = document.getElementById('closeMenu');
    if (menuToggle) menuToggle.addEventListener('click', () => mobileMenu?.classList.remove('hidden'));
    if (closeMenu) closeMenu.addEventListener('click', () => mobileMenu?.classList.add('hidden'));

    // Выход
    const logout = () => {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        trades = [];
        showWelcomeScreen();
    };
    document.getElementById('headerLogout')?.addEventListener('click', logout);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Терминал
    document.getElementById('addTradeBtn')?.addEventListener('click', addTrade);
    document.getElementById('refreshData')?.addEventListener('click', async () => {
        await loadTrades();
        renderJournal();
    });

    // Переключатель LONG/SHORT
    document.querySelectorAll('.type-option').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderJournal();
        });
    });

    // Лидерборд
    document.getElementById('leaderboardLimit')?.addEventListener('change', loadLeaderboard);

    // Настройки
    document.getElementById('publicProfileToggle')?.addEventListener('change', async (e) => {
        if (!userStatus.wallet_connected) {
            e.target.checked = false;
            alert('Требуется Pro статус');
            return;
        }
        try {
            await fetch(`${API_BASE}/api/user/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ is_public: e.target.checked })
            });
            userStatus.is_public = e.target.checked;
        } catch (error) {
            e.target.checked = !e.target.checked;
        }
    });

    // Экспорт/импорт
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', () => {
        document.getElementById('importFileInput')?.click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', importData);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);

    // Upgrade to Pro
    document.getElementById('upgradeToProBtn')?.addEventListener('click', () => {
        switchView('settings');
    });
}

// ========== Работа со сделками ==========
async function loadTrades() {
    try {
        const response = await fetch(`${API_BASE}/api/trades`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            trades = await response.json();
            trades.sort((a, b) => b.timestamp - a.timestamp);
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

    const pairInput = document.getElementById('pairInput');
    const volumeInput = document.getElementById('volumeInput');
    const profitBtn = document.querySelector('.type-option.profit');

    const pair = pairInput?.value.trim();
    const volume = parseFloat(volumeInput?.value.trim().replace(',', '.'));
    const isProfit = profitBtn?.classList.contains('active');

    if (!pair) { alert('Введите пару'); return; }
    if (isNaN(volume) || volume <= 0) { alert('Введите объём'); return; }

    const newTrade = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        pair: pair.toUpperCase(),
        volume: volume,
        type: isProfit ? 'profit' : 'loss',
        timestamp: Date.now()
    };

    try {
        const response = await fetch(`${API_BASE}/api/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(newTrade)
        });

        if (response.ok) {
            trades.unshift(newTrade);
            renderJournal();
            if (volumeInput) volumeInput.value = '';
        } else {
            const data = await response.json();
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
        const response = await fetch(`${API_BASE}/api/trades/${tradeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            trades = trades.filter(t => t.id !== tradeId);
            renderJournal();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

window.deleteTrade = deleteTrade;

function renderJournal() {
    const tbody = document.getElementById('tradesList');
    if (!tbody) return;

    const filtered = currentFilter === 'all' ? trades : trades.filter(t => t.type === currentFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-message">Нет сделок</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(t => {
            const time = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const isProfit = t.type === 'profit';
            const actions = userStatus.wallet_connected ? '' : `
                <button class="icon-btn" onclick="deleteTrade('${t.id}')" style="width: 28px; height: 28px;">🗑️</button>
            `;
            return `
                <tr>
                    <td>${time}</td>
                    <td>${t.pair}</td>
                    <td>${t.volume.toFixed(2)}</td>
                    <td class="${isProfit ? 'profit-text' : 'loss-text'}">${isProfit ? '+' : '−'} $${t.volume.toFixed(2)}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    }

    updateStats();
}

function updateStats() {
    let totalPL = 0, wins = 0, maxProfit = 0, maxLoss = 0, profitSum = 0, lossSum = 0;

    trades.forEach(t => {
        if (t.type === 'profit') {
            totalPL += t.volume; wins++; profitSum += t.volume;
            maxProfit = Math.max(maxProfit, t.volume);
        } else {
            totalPL -= t.volume; lossSum += t.volume;
            maxLoss = Math.max(maxLoss, t.volume);
        }
    });

    const winRate = trades.length ? (wins / trades.length) * 100 : 0;
    const avgProfit = wins ? profitSum / wins : 0;
    const avgLoss = (trades.length - wins) ? lossSum / (trades.length - wins) : 0;

    const totalPLEl = document.getElementById('totalPL');
    if (totalPLEl) {
        totalPLEl.textContent = (totalPL >= 0 ? '+' : '−') + '$' + Math.abs(totalPL).toFixed(2);
        totalPLEl.className = `stat-value-new ${totalPL >= 0 ? 'profit-text' : 'loss-text'}`;
    }

    const winRateEl = document.getElementById('winRate');
    if (winRateEl) winRateEl.textContent = winRate.toFixed(1) + '%';

    const progressEl = document.getElementById('winRateProgress');
    if (progressEl) progressEl.style.width = winRate + '%';

    const totalTradesEl = document.getElementById('totalTradesCount');
    if (totalTradesEl) totalTradesEl.textContent = trades.length;

    const winCountEl = document.getElementById('winCount');
    if (winCountEl) winCountEl.textContent = wins + ' LONG';

    const lossCountEl = document.getElementById('lossCount');
    if (lossCountEl) lossCountEl.textContent = (trades.length - wins) + ' SHORT';

    const plChange = document.getElementById('plChange');
    if (plChange && trades.length) {
        const last = trades[0];
        plChange.textContent = (last.type === 'profit' ? '+' : '-') + '$' + last.volume.toFixed(2);
        plChange.className = 'stat-change-new ' + (last.type === 'profit' ? 'positive' : 'negative');
    }

    // Аналитика
    const avgProfitEl = document.getElementById('avgProfit');
    if (avgProfitEl) avgProfitEl.textContent = '$' + avgProfit.toFixed(2);

    const avgLossEl = document.getElementById('avgLoss');
    if (avgLossEl) avgLossEl.textContent = '$' + avgLoss.toFixed(2);

    const bestTradeEl = document.getElementById('bestTrade');
    if (bestTradeEl) bestTradeEl.textContent = '$' + maxProfit.toFixed(2);

    const worstTradeEl = document.getElementById('worstTrade');
    if (worstTradeEl) worstTradeEl.textContent = '$' + maxLoss.toFixed(2);
}

function updateCharts() {
    const ctx1 = document.getElementById('plChart')?.getContext('2d');
    if (ctx1) {
        if (plChart) plChart.destroy();
        const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
        let cum = 0;
        const data = [], labels = [];
        sorted.forEach(t => {
            cum += t.type === 'profit' ? t.volume : -t.volume;
            data.push(cum);
            labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
        });
        plChart = new Chart(ctx1, {
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

    const ctx2 = document.getElementById('ratioChart')?.getContext('2d');
    if (ctx2) {
        if (ratioChart) ratioChart.destroy();
        const wins = trades.filter(t => t.type === 'profit').length;
        const losses = trades.length - wins;
        ratioChart = new Chart(ctx2, {
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

        const profitPercent = document.getElementById('profitPercent');
        const lossPercent = document.getElementById('lossPercent');
        if (profitPercent) profitPercent.textContent = trades.length ? ((wins / trades.length) * 100).toFixed(1) + '%' : '0%';
        if (lossPercent) lossPercent.textContent = trades.length ? ((losses / trades.length) * 100).toFixed(1) + '%' : '0%';
    }
}

function updateDate() {
    const now = new Date();
    const el = document.getElementById('currentDate');
    if (el) el.textContent = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function updateProfileDisplay() {
    if (currentUser) {
        document.querySelectorAll('#headerUsername, #profileUsername').forEach(el => {
            if (el) el.textContent = currentUser.username;
        });
        const tariffName = document.getElementById('tariffName');
        const tariffPrice = document.getElementById('tariffPrice');
        const accountType = document.getElementById('accountTypeDisplay');

        if (userStatus.wallet_connected) {
            if (tariffName) tariffName.textContent = 'Pro Аналитика';
            if (tariffPrice) tariffPrice.textContent = '500 ₽/мес';
            if (accountType) accountType.textContent = 'Pro';
        } else {
            if (tariffName) tariffName.textContent = 'Базовый';
            if (tariffPrice) tariffPrice.textContent = 'Бесплатно';
            if (accountType) accountType.textContent = 'Базовый';
        }

        const toggle = document.getElementById('publicProfileToggle');
        if (toggle) toggle.checked = userStatus.is_public;
    }
}

// ========== Premium ==========
async function loadPremiumAnalytics() {
    try {
        const res = await fetch(`${API_BASE}/api/premium/analytics`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const d = await res.json();
            document.getElementById('profitFactor')?.textContent = d.profitFactor;
            document.getElementById('sharpeRatio')?.textContent = d.sharpeRatio;
            document.getElementById('maxDrawdown')?.textContent = '$' + d.maxDrawdown;
            document.getElementById('monthlyProjection')?.textContent = '$' + d.monthlyProjection;
            document.getElementById('bestPair')?.textContent = d.bestPair;
            document.getElementById('worstPair')?.textContent = d.worstPair;
            document.getElementById('bestDay')?.textContent = d.bestDay ? `${d.bestDay.date} (+$${d.bestDay.pl})` : '—';
            document.getElementById('worstDay')?.textContent = d.worstDay ? `${d.worstDay.date} (-$${Math.abs(d.worstDay.pl)})` : '—';

            const recs = [];
            if (d.winRate > 60) recs.push('Отличный винрейт!');
            if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!');
            const recEl = document.getElementById('premiumRecommendations');
            if (recEl) recEl.innerHTML = recs.length ? recs.map(r => `<p>• ${r}</p>`).join('') : '<p>Недостаточно данных</p>';
        }
    } catch (e) {}
}

// ========== Админ ==========
async function loadAdminUsers() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const users = await res.json();
            const tbody = document.getElementById('adminUsersList');
            if (tbody) {
                tbody.innerHTML = users.map(u => `
                    <tr>
                        <td>${u.id}</td>
                        <td>${u.username}</td>
                        <td>${u.wallet_connected ? '✅' : '❌'}</td>
                        <td>${u.trades_count || 0}</td>
                        <td class="${u.total_pl >= 0 ? 'profit-text' : 'loss-text'}">$${u.total_pl?.toFixed(2) || '0'}</td>
                        <td><button class="icon-btn" onclick="deleteAdminUser(${u.id})" style="color: #EF4444;">🗑️</button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {}
}

window.deleteAdminUser = async (id) => {
    if (!confirm('Удалить?')) return;
    await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    loadAdminUsers();
};

// ========== Лидерборд ==========
async function loadLeaderboard() {
    const limit = document.getElementById('leaderboardLimit')?.value || 25;
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/leaderboard?limit=${limit}`);
        const data = await res.json();
        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.rank}</td>
                <td>${r.username}</td>
                <td class="${r.totalPL >= 0 ? 'profit-text' : 'loss-text'}">${r.totalPL >= 0 ? '+' : ''}$${r.totalPL.toFixed(2)}</td>
                <td>${r.winRate}%</td>
                <td>${r.totalTrades}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="empty-message">Нет данных</td></tr>';
    } catch (e) {}
}

// ========== Экспорт/импорт ==========
function exportData() {
    const data = { trades, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trades-${Date.now()}.json`;
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.trades && confirm(`Импортировать ${data.trades.length} сделок?`)) {
                await fetch(`${API_BASE}/api/trades/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
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
    await fetch(`${API_BASE}/api/trades/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ trades: [] })
    });
    trades = [];
    renderJournal();
}

// ========== ДИНАМИЧНЫЙ ФОН ==========
(function() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouseX = width / 2;
    let mouseY = height / 2;

    const particles = [];
    const particleCount = 100;
    const connectionDistance = 150;
    const mouseInfluenceDistance = 250;

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
            this.size = Math.random() * 2.5 + 1.5;
            this.baseX = this.x;
            this.baseY = this.y;
        }

        update() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouseInfluenceDistance) {
                const force = (1 - dist / mouseInfluenceDistance) * 0.15;
                this.vx += dx * force;
                this.vy += dy * force;
            }

            const homeDx = this.baseX - this.x;
            const homeDy = this.baseY - this.y;
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
        }

        draw() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let opacity = 0.4;
            let size = this.size;

            if (dist < mouseInfluenceDistance) {
                opacity = 0.8;
                size = this.size * 1.5;
            }

            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 2);
            gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity})`);
            gradient.addColorStop(1, `rgba(59, 130, 246, ${opacity * 0.5})`);

            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    function init() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    const opacity = 0.15 * (1 - dist / connectionDistance);

                    const gradient = ctx.createLinearGradient(
                        particles[i].x, particles[i].y,
                        particles[j].x, particles[j].y
                    );
                    gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity})`);
                    gradient.addColorStop(1, `rgba(59, 130, 246, ${opacity})`);

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
        particles.forEach(p => p.update());
        drawConnections();
        particles.forEach(p => p.draw());
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    });

    window.addEventListener('mousemove', (e) => {
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
    const canvas = document.getElementById('onboardingParticleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouseX = width / 2;
    let mouseY = height / 2;

    const particles = [];
    const particleCount = 80;
    const connectionDistance = 150;
    const mouseInfluenceDistance = 250;

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
            this.size = Math.random() * 2.5 + 1.5;
            this.baseX = this.x;
            this.baseY = this.y;
        }

        update() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouseInfluenceDistance) {
                const force = (1 - dist / mouseInfluenceDistance) * 0.15;
                this.vx += dx * force;
                this.vy += dy * force;
            }

            const homeDx = this.baseX - this.x;
            const homeDy = this.baseY - this.y;
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
        }

        draw() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let opacity = 0.4;
            let size = this.size;

            if (dist < mouseInfluenceDistance) {
                opacity = 0.8;
                size = this.size * 1.5;
            }

            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 2);
            gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity})`);
            gradient.addColorStop(1, `rgba(59, 130, 246, ${opacity * 0.5})`);

            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    function init() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    const opacity = 0.15 * (1 - dist / connectionDistance);

                    const gradient = ctx.createLinearGradient(
                        particles[i].x, particles[i].y,
                        particles[j].x, particles[j].y
                    );
                    gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity})`);
                    gradient.addColorStop(1, `rgba(59, 130, 246, ${opacity})`);

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
        particles.forEach(p => p.update());
        drawConnections();
        particles.forEach(p => p.draw());
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    });

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    canvas.width = width;
    canvas.height = height;
    init();
    animate();
})();