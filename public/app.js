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
        document.getElementById('preloader')?.classList.add('fade-out');
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
    document.getElementById('onboardingUsername').textContent = currentUser?.username || 'Trader';

    // Сброс выбора
    selectedMode = null;
    selectedWalletType = null;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.wallet-option-new').forEach(w => w.classList.remove('selected'));
    document.getElementById('continueOnboarding').disabled = true;
    document.getElementById('finishOnboarding').disabled = true;
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
    document.getElementById(`${viewName}View`)?.classList.remove('hidden');

    document.querySelectorAll('.nav-link-header, .mobile-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) link.classList.add('active');
    });

    const titles = {
        journal: 'Терминал',
        analytics: 'Аналитика',
        premium: 'Premium',
        leaderboard: 'Рейтинг',
        admin: 'Админ-панель',
        settings: 'Настройки'
    };
    const pageTitle = document.querySelector('.page-title');
    if (!pageTitle) {
        const h2 = document.querySelector('.page-header h2');
        if (h2) h2.textContent = titles[viewName] || 'Терминал';
    }

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
            document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
            document.getElementById('registerForm').classList.toggle('hidden', isLogin);
            document.getElementById('authError').textContent = '';
        });
    });

    // Форма входа
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
                authError.textContent = data.error || 'Ошибка входа';
            }
        } catch (error) {
            authError.textContent = 'Ошибка соединения';
        }
    });

    // Форма регистрации
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const authError = document.getElementById('authError');

        const username = formData.get('username');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (!username || !password || !confirmPassword) {
            authError.textContent = 'Все поля обязательны';
            return;
        }
        if (username.length < 3) {
            authError.textContent = 'Имя должно быть не менее 3 символов';
            return;
        }
        if (password.length < 6) {
            authError.textContent = 'Пароль должен быть не менее 6 символов';
            return;
        }
        if (password !== confirmPassword) {
            authError.textContent = 'Пароли не совпадают';
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
                authError.textContent = data.error || 'Ошибка регистрации';
            }
        } catch (error) {
            authError.textContent = 'Ошибка соединения';
        }
    });

    // Онбординг: выбор режима
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedMode = card.dataset.mode;
            document.getElementById('continueOnboarding').disabled = false;
        });
    });

    // Онбординг: продолжить
    document.getElementById('continueOnboarding').addEventListener('click', () => {
        if (selectedMode === 'pro') {
            document.getElementById('modeStep').classList.add('hidden');
            document.getElementById('walletStep').classList.remove('hidden');
        } else {
            finishOnboarding(false);
        }
    });

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
    document.getElementById('walletAddressInput').addEventListener('input', checkWalletForm);

    function checkWalletForm() {
        const address = document.getElementById('walletAddressInput').value.trim();
        document.getElementById('finishOnboarding').disabled = !selectedWalletType || !address;
    }

    // Онбординг: назад
    document.getElementById('backToMode').addEventListener('click', () => {
        document.getElementById('walletStep').classList.add('hidden');
        document.getElementById('modeStep').classList.remove('hidden');
    });

    // Онбординг: завершить
    document.getElementById('finishOnboarding').addEventListener('click', () => {
        finishOnboarding(true);
    });

    async function finishOnboarding(isPro) {
        try {
            if (isPro) {
                const address = document.getElementById('walletAddressInput').value.trim();
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
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.remove('hidden');
    });
    document.getElementById('closeMenu')?.addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.add('hidden');
    });

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
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', importData);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);
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

    const pair = document.getElementById('pairInput').value.trim();
    const volume = parseFloat(document.getElementById('volumeInput').value.trim().replace(',', '.'));
    const isProfit = document.querySelector('.type-option.profit').classList.contains('active');

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
            document.getElementById('volumeInput').value = '';
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

    document.getElementById('totalPL').textContent = (totalPL >= 0 ? '+' : '−') + '$' + Math.abs(totalPL).toFixed(2);
    document.getElementById('totalPL').className = `stat-value-new ${totalPL >= 0 ? 'profit-text' : 'loss-text'}`;
    document.getElementById('winRate').textContent = winRate.toFixed(1) + '%';
    document.getElementById('winRateProgress').style.width = winRate + '%';
    document.getElementById('totalTradesCount').textContent = trades.length;
    document.getElementById('winCount').textContent = wins + ' LONG';
    document.getElementById('lossCount').textContent = (trades.length - wins) + ' SHORT';

    const plChange = document.getElementById('plChange');
    if (trades.length) {
        const last = trades[0];
        plChange.textContent = (last.type === 'profit' ? '+' : '-') + '$' + last.volume.toFixed(2);
        plChange.className = 'stat-change-new ' + (last.type === 'profit' ? 'positive' : 'negative');
    }

    // Аналитика
    document.getElementById('avgProfit').textContent = '$' + avgProfit.toFixed(2);
    document.getElementById('avgLoss').textContent = '$' + avgLoss.toFixed(2);
    document.getElementById('bestTrade').textContent = '$' + maxProfit.toFixed(2);
    document.getElementById('worstTrade').textContent = '$' + maxLoss.toFixed(2);
}

function updateCharts() {
    // График P/L
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

    // Круговая диаграмма
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

        document.getElementById('profitPercent').textContent = trades.length ? ((wins / trades.length) * 100).toFixed(1) + '%' : '0%';
        document.getElementById('lossPercent').textContent = trades.length ? ((losses / trades.length) * 100).toFixed(1) + '%' : '0%';
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
        document.getElementById('accountTypeDisplay').textContent = userStatus.wallet_connected ? 'Pro' : 'Manual';
        document.getElementById('publicProfileToggle').checked = userStatus.is_public;
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
            document.getElementById('profitFactor').textContent = d.profitFactor;
            document.getElementById('sharpeRatio').textContent = d.sharpeRatio;
            document.getElementById('maxDrawdown').textContent = '$' + d.maxDrawdown;
            document.getElementById('monthlyProjection').textContent = '$' + d.monthlyProjection;
            document.getElementById('bestPair').textContent = d.bestPair;
            document.getElementById('worstPair').textContent = d.worstPair;
            document.getElementById('bestDay').textContent = d.bestDay ? `${d.bestDay.date} (+$${d.bestDay.pl})` : '—';
            document.getElementById('worstDay').textContent = d.worstDay ? `${d.worstDay.date} (-$${Math.abs(d.worstDay.pl)})` : '—';

            const recs = [];
            if (d.winRate > 60) recs.push('Отличный винрейт!');
            if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!');
            document.getElementById('premiumRecommendations').innerHTML = recs.length ? recs.map(r => `<p>• ${r}</p>`).join('') : '<p>Недостаточно данных</p>';
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

// ========== ДИНАМИЧНЫЙ ФОН (МЕДЛЕННЫЙ + 120 ЧАСТИЦ) ==========
(function() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouseX = width / 2;
    let mouseY = height / 2;

    const particles = [];
    const particleCount = 120;

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.1;
            this.vy = (Math.random() - 0.5) * 0.1;
            this.size = Math.random() * 2 + 1;
        }

        update() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 200) {
                const force = (200 - dist) / 200;
                this.vx += dx * force * 0.003;
                this.vy += dy * force * 0.003;
            }

            this.vx *= 0.995;
            this.vy *= 0.995;

            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const opacity = Math.max(0.1, 1 - dist / 300);

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(16, 185, 129, ${opacity * 0.4})`;
            ctx.fill();
        }
    }

    function init() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${0.08 * (1 - dist / 120)})`;
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => { p.update(); p.draw(); });
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
        const glow = document.getElementById('mouseGlow');
        if (glow) {
            glow.style.left = (mouseX - 200) + 'px';
            glow.style.top = (mouseY - 200) + 'px';
        }
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

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.1;
            this.vy = (Math.random() - 0.5) * 0.1;
            this.size = Math.random() * 2 + 1;
        }

        update() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 200) {
                const force = (200 - dist) / 200;
                this.vx += dx * force * 0.003;
                this.vy += dy * force * 0.003;
            }

            this.vx *= 0.995;
            this.vy *= 0.995;

            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const opacity = Math.max(0.1, 1 - dist / 300);

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(16, 185, 129, ${opacity * 0.4})`;
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
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${0.08 * (1 - dist / 120)})`;
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
        const glow = document.getElementById('onboardingMouseGlow');
        if (glow) {
            glow.style.left = (mouseX - 200) + 'px';
            glow.style.top = (mouseY - 200) + 'px';
        }
    });

    canvas.width = width;
    canvas.height = height;
    init();
    animate();
})();