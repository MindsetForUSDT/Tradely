// ========== Глобальные переменные ==========
let currentUser = null;
let authToken = null;
let trades = [];
let currentView = 'journal';
let currentFilter = 'all';
let plChart = null;
let ratioChart = null;
let isAdmin = false;

let userStatus = {
    wallet_connected: false,
    wallet_address: null,
    is_public: false,
    first_login: true,
    is_admin: false
};

let selectedWalletType = null;

const API_BASE = '';

// DOM элементы
const preloader = document.getElementById('preloader');
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const statusBar = document.getElementById('statusBar');
const onboardingScreen = document.getElementById('onboardingScreen');

// ========== Инициализация ==========
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

window.addEventListener('load', () => {
    setTimeout(() => {
        if (preloader) preloader.classList.add('fade-out');
    }, 500);
});

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        fetchUserProfile();
    } else {
        showAuthScreen();
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
            showAuthScreen();
        }
    } catch (error) {
        showAuthScreen();
    }
}

async function fetchUserStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/user/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            userStatus = await response.json();
            isAdmin = userStatus.is_admin;
            updateUIForUserStatus();
        }
    } catch (error) {
        console.error('Ошибка получения статуса:', error);
    }
}

function updateUIForUserStatus() {
    const accountTypeEl = document.getElementById('accountType');
    const accountDescriptionEl = document.getElementById('accountDescription');
    const privacyToggle = document.getElementById('publicProfileToggle');
    const privacyDesc = document.getElementById('privacyDescription');
    const dataNote = document.getElementById('dataManagementNote');
    const walletNotConnected = document.getElementById('walletNotConnected');
    const walletConnected = document.getElementById('walletConnected');
    const connectedWalletAddress = document.getElementById('connectedWalletAddress');

    if (userStatus.wallet_connected) {
        if (accountTypeEl) accountTypeEl.textContent = 'Pro Trader';
        if (accountDescriptionEl) accountDescriptionEl.textContent = 'Кошелек подключен, автоимпорт активен';
        if (privacyToggle) {
            privacyToggle.disabled = false;
            privacyToggle.checked = userStatus.is_public;
        }
        if (privacyDesc) privacyDesc.textContent = 'Ваш профиль отображается в таблице лидеров';
        if (dataNote) dataNote.textContent = 'Pro режим: сделки импортируются автоматически, редактирование недоступно';

        if (walletNotConnected) walletNotConnected.classList.add('hidden');
        if (walletConnected) {
            walletConnected.classList.remove('hidden');
            if (connectedWalletAddress && userStatus.wallet_address) {
                connectedWalletAddress.textContent = userStatus.wallet_address.slice(0, 6) + '...' + userStatus.wallet_address.slice(-4);
            }
        }

        const addTradeBtn = document.getElementById('addTradeBtn');
        if (addTradeBtn) addTradeBtn.style.display = 'none';
    } else {
        if (accountTypeEl) accountTypeEl.textContent = 'Manual Trader';
        if (accountDescriptionEl) accountDescriptionEl.textContent = 'Ручной ввод сделок, редактирование доступно';
        if (privacyToggle) {
            privacyToggle.disabled = true;
            privacyToggle.checked = false;
        }
        if (privacyDesc) privacyDesc.textContent = 'Подключите кошелек для доступа к таблице лидеров';
        if (dataNote) dataNote.textContent = 'Manual режим: редактирование и удаление сделок доступно';

        if (walletNotConnected) walletNotConnected.classList.remove('hidden');
        if (walletConnected) walletConnected.classList.add('hidden');

        const addTradeBtn = document.getElementById('addTradeBtn');
        if (addTradeBtn) addTradeBtn.style.display = 'flex';
    }
}

function showOnboardingScreen() {
    if (preloader) preloader.style.display = 'none';
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.add('hidden');
    if (onboardingScreen) onboardingScreen.classList.remove('hidden');

    const usernameEl = document.getElementById('onboardingUsername');
    if (usernameEl && currentUser) usernameEl.textContent = currentUser.username;
}

function showAuthScreen() {
    if (preloader) preloader.style.display = 'none';
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (statusBar) statusBar.classList.add('hidden');
}

function showAppScreen() {
    if (preloader) preloader.style.display = 'none';
    if (authScreen) authScreen.classList.add('hidden');
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    if (statusBar) statusBar.classList.remove('hidden');

    updateDate();
    updateProfileDisplay();
    updateUIForUserStatus();
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

    document.querySelectorAll('.nav-link').forEach(link => {
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
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[viewName] || 'Терминал';

    if (viewName === 'leaderboard') {
        if (!userStatus.wallet_connected && !isAdmin) {
            alert('Только Pro трейдеры имеют доступ к таблице лидеров');
            switchView('settings');
            return;
        }
        loadLeaderboard();
    }
    if (viewName === 'analytics') {
        setTimeout(updateCharts, 100);
    }
    if (viewName === 'premium') {
        loadPremiumAnalytics();
    }
    if (viewName === 'admin') {
        loadAdminUsers();
    }
    if (viewName === 'settings') {
        fetchUserStatus();
    }
}

// ========== Настройка слушателей ==========
function setupEventListeners() {
    // Табы авторизации
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
            document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
        });
    });

    // Форма входа
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

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
                document.getElementById('authError').textContent = data.error;
            }
        } catch (error) {
            document.getElementById('authError').textContent = 'Ошибка соединения';
        }
    });

    // Форма регистрации
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        if (formData.get('password') !== formData.get('confirmPassword')) {
            document.getElementById('authError').textContent = 'Пароли не совпадают';
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
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
                    wallet_connected: false,
                    is_public: false,
                    first_login: true,
                    is_admin: false
                };
                localStorage.setItem('authToken', authToken);
                showOnboardingScreen();
            } else {
                document.getElementById('authError').textContent = data.error;
            }
        } catch (error) {
            document.getElementById('authError').textContent = 'Ошибка соединения';
        }
    });

    // Онбординг: выбор Pro
    document.getElementById('choosePro')?.addEventListener('click', () => {
        document.getElementById('walletForm')?.classList.remove('hidden');
    });

    // Онбординг: выбор Manual
    document.getElementById('chooseManual')?.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/api/user/skip-wallet`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            userStatus.first_login = false;
            userStatus.wallet_connected = false;
            await loadTrades();
            showAppScreen();
        } catch (error) {
            alert('Ошибка');
        }
    });

    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            switchView(link.dataset.view);
        });
    });

    // Добавление сделки
    const addTradeBtn = document.getElementById('addTradeBtn');
    if (addTradeBtn) {
        addTradeBtn.addEventListener('click', addTrade);
    }

    const pairInput = document.getElementById('pairInput');
    const volumeInput = document.getElementById('volumeInput');
    if (pairInput) {
        pairInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') volumeInput?.focus();
        });
    }
    if (volumeInput) {
        volumeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTrade();
        });
    }

    // Переключатель LONG/SHORT
    document.querySelectorAll('.result-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Выход
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', logout);

    // Настройки
    const publicToggle = document.getElementById('publicProfileToggle');
    if (publicToggle) {
        publicToggle.addEventListener('change', async (e) => {
            const isPublic = e.target.checked;
            try {
                const response = await fetch(`${API_BASE}/api/user/public`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ is_public: isPublic })
                });
                if (response.ok) userStatus.is_public = isPublic;
            } catch (error) {
                console.error('Ошибка:', error);
            }
        });
    }

    // Выбор кошелька
    document.querySelectorAll('.wallet-option').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedWalletType = btn.dataset.wallet;
            document.getElementById('walletForm').classList.remove('hidden');
        });
    });

    // Отмена выбора кошелька
    document.getElementById('cancelWalletBtn')?.addEventListener('click', () => {
        document.getElementById('walletForm').classList.add('hidden');
        selectedWalletType = null;
    });

    // Подключение кошелька
    document.getElementById('connectWalletBtn')?.addEventListener('click', async () => {
        const address = document.getElementById('walletAddress').value.trim();
        if (!address) { alert('Введите адрес'); return; }

        try {
            const response = await fetch(`${API_BASE}/api/user/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ wallet_address: address, wallet_type: selectedWalletType })
            });
            const data = await response.json();
            if (response.ok) {
                userStatus.wallet_connected = true;
                userStatus.wallet_address = address;
                userStatus.is_public = true;
                userStatus.first_login = false;
                await loadTrades();
                showAppScreen();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Ошибка подключения');
        }
    });

    // Отключение кошелька
    document.getElementById('disconnectWalletBtn')?.addEventListener('click', async () => {
        if (!confirm('Отключить кошелек? Все сделки будут удалены.')) return;
        try {
            const response = await fetch(`${API_BASE}/api/user/wallet/disconnect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                userStatus.wallet_connected = false;
                userStatus.wallet_address = null;
                userStatus.is_public = false;
                trades = [];
                updateUIForUserStatus();
                renderJournal();
                alert('Кошелек отключен');
            }
        } catch (error) {
            alert('Ошибка');
        }
    });

    // Фильтры
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderJournal();
        });
    });

    // Лидерборд
    document.getElementById('refreshLeaderboard')?.addEventListener('click', loadLeaderboard);
    document.getElementById('leaderboardLimit')?.addEventListener('change', loadLeaderboard);
    document.getElementById('refreshData')?.addEventListener('click', async () => {
        await loadTrades();
        renderJournal();
        if (currentView === 'leaderboard') loadLeaderboard();
        if (currentView === 'analytics') updateCharts();
    });

    // Экспорт/импорт
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', importData);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
    isAdmin = false;
    trades = [];
    showAuthScreen();
}

// ========== Premium аналитика ==========
async function loadPremiumAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/api/premium/analytics`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('profitFactor').textContent = data.profitFactor;
            document.getElementById('sharpeRatio').textContent = data.sharpeRatio;
            document.getElementById('maxDrawdown').textContent = '$' + data.maxDrawdown;
            document.getElementById('monthlyProjection').textContent = '$' + data.monthlyProjection;
            document.getElementById('bestPair').textContent = data.bestPair;
            document.getElementById('worstPair').textContent = data.worstPair;
            document.getElementById('bestDay').textContent = data.bestDay ? `${data.bestDay.date} (+$${data.bestDay.pl})` : '—';
            document.getElementById('worstDay').textContent = data.worstDay ? `${data.worstDay.date} (-$${Math.abs(data.worstDay.pl)})` : '—';

            const recs = [];
            if (data.winRate > 60) recs.push('Отличный винрейт! Продолжайте в том же духе.');
            else if (data.winRate < 40) recs.push('Винрейт ниже 40%. Пересмотрите стратегию.');
            if (data.profitFactor > 2) recs.push('Profit Factor > 2 — отличный результат!');
            else if (data.profitFactor < 1) recs.push('Profit Factor < 1 — стратегия убыточна.');
            if (data.sharpeRatio > 1) recs.push('Sharpe Ratio > 1 — хорошее соотношение риск/доходность.');

            const recEl = document.getElementById('premiumRecommendations');
            if (recEl) {
                recEl.innerHTML = recs.length ? recs.map(r => `<p>• ${r}</p>`).join('') : '<p>Недостаточно данных для рекомендаций</p>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки Premium:', error);
    }
}

// ========== Админ-панель ==========
async function loadAdminUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const users = await response.json();
            const tbody = document.getElementById('adminUsersList');
            if (tbody) {
                tbody.innerHTML = users.map(u => `
                    <tr>
                        <td>${u.id}</td>
                        <td>${u.username}</td>
                        <td>${u.wallet_connected ? '✅' : '❌'}</td>
                        <td>${u.trades_count || 0}</td>
                        <td class="${u.total_pl >= 0 ? 'profit-text' : 'loss-text'}">$${u.total_pl?.toFixed(2) || '0.00'}</td>
                        <td class="admin-actions">
                            <button class="admin-btn" onclick="viewUserTrades(${u.id})">Сделки</button>
                            <button class="admin-btn danger" onclick="deleteAdminUser(${u.id})">Удалить</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

window.viewUserTrades = async (userId) => {
    try {
        const response = await fetch(`${API_BASE}/api/admin/trades/${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const trades = await response.json();
        console.log('Сделки пользователя:', trades);
        alert(`Загружено ${trades.length} сделок. Смотрите консоль.`);
    } catch (error) {
        alert('Ошибка загрузки');
    }
};

window.deleteAdminUser = async (userId) => {
    if (!confirm('Удалить пользователя?')) return;
    try {
        await fetch(`${API_BASE}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        loadAdminUsers();
    } catch (error) {
        alert('Ошибка удаления');
    }
};

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
        console.error('Ошибка загрузки сделок:', error);
    }
}

async function addTrade() {
    if (userStatus.wallet_connected) {
        alert('Ручное добавление недоступно для Pro трейдеров');
        return;
    }

    const pairInput = document.getElementById('pairInput');
    const volumeInput = document.getElementById('volumeInput');
    const profitBtn = document.querySelector('[data-type="profit"]');
    const isProfit = profitBtn?.classList.contains('active');

    const pair = pairInput.value.trim();
    const volume = parseFloat(volumeInput.value.trim().replace(',', '.'));

    if (!pair) { alert('Введите торговую пару'); return; }
    if (isNaN(volume) || volume <= 0) { alert('Введите корректный объем'); return; }

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
            volumeInput.value = '';
            pairInput.focus();
            if (currentView === 'analytics') updateCharts();
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
        alert('Удаление недоступно для Pro трейдеров');
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
            if (currentView === 'analytics') updateCharts();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

window.deleteTrade = deleteTrade;

async function editTrade(tradeId) {
    if (userStatus.wallet_connected) {
        alert('Редактирование недоступно для Pro трейдеров');
        return;
    }

    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    const newPair = prompt('Введите новую пару:', trade.pair);
    if (!newPair) return;

    const newVolume = prompt('Введите новый объем:', trade.volume);
    if (!newVolume || isNaN(parseFloat(newVolume))) return;

    const newType = confirm('Нажмите OK для LONG, Отмена для SHORT') ? 'profit' : 'loss';

    try {
        const response = await fetch(`${API_BASE}/api/trades/${tradeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ pair: newPair, volume: parseFloat(newVolume), type: newType })
        });

        if (response.ok) {
            const index = trades.findIndex(t => t.id === tradeId);
            trades[index] = { ...trades[index], pair: newPair.toUpperCase(), volume: parseFloat(newVolume), type: newType };
            renderJournal();
            if (currentView === 'analytics') updateCharts();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

window.editTrade = editTrade;

function renderJournal() {
    const tradesList = document.getElementById('tradesList');
    const filteredTrades = currentFilter === 'all' ? trades : trades.filter(t => t.type === currentFilter);

    if (filteredTrades.length === 0) {
        tradesList.innerHTML = '<tr class="empty-row"><td colspan="5">Нет активных позиций</td></tr>';
    } else {
        tradesList.innerHTML = filteredTrades.map(trade => {
            const time = new Date(trade.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const isProfit = trade.type === 'profit';
            const actions = userStatus.wallet_connected ? '' : `
                <button class="edit-button" onclick="editTrade('${trade.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.3333 2.00004L14 4.66671M12.6667 1.33337L4.66667 9.33337L4 12L6.66667 11.3334L14.6667 3.33337L12.6667 1.33337Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="delete-button" onclick="deleteTrade('${trade.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            `;
            return `
                <tr>
                    <td>${time}</td>
                    <td>${trade.pair}</td>
                    <td>${trade.volume.toFixed(2)}</td>
                    <td class="${isProfit ? 'profit-text' : 'loss-text'}">${isProfit ? '+' : '−'} $${trade.volume.toFixed(2)}</td>
                    <td class="actions-cell">${actions}</td>
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

    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgProfit = wins > 0 ? profitSum / wins : 0;
    const avgLoss = (trades.length - wins) > 0 ? lossSum / (trades.length - wins) : 0;

    const totalPLEl = document.getElementById('totalPL');
    if (totalPLEl) { totalPLEl.textContent = totalPL.toFixed(2); totalPLEl.className = `stat-value ${totalPL >= 0 ? 'profit-text' : 'loss-text'}`; }

    const winRateEl = document.getElementById('winRate');
    if (winRateEl) winRateEl.textContent = winRate.toFixed(1);

    const progressEl = document.getElementById('winRateProgress');
    if (progressEl) progressEl.style.width = winRate + '%';

    const totalTradesEl = document.getElementById('totalTradesCount');
    if (totalTradesEl) totalTradesEl.textContent = trades.length;

    const winCountEl = document.getElementById('winCount');
    if (winCountEl) winCountEl.textContent = wins + ' LONG';

    const lossCountEl = document.getElementById('lossCount');
    if (lossCountEl) lossCountEl.textContent = (trades.length - wins) + ' SHORT';

    const avgProfitEl = document.getElementById('avgProfit');
    if (avgProfitEl) avgProfitEl.textContent = '$' + avgProfit.toFixed(2);

    const avgLossEl = document.getElementById('avgLoss');
    if (avgLossEl) avgLossEl.textContent = '$' + avgLoss.toFixed(2);

    const bestTradeEl = document.getElementById('bestTrade');
    if (bestTradeEl) bestTradeEl.textContent = '$' + maxProfit.toFixed(2);

    const worstTradeEl = document.getElementById('worstTrade');
    if (worstTradeEl) worstTradeEl.textContent = '$' + maxLoss.toFixed(2);

    const plChangeEl = document.getElementById('plChange');
    if (plChangeEl && trades.length > 0) {
        const lastTrade = trades[0];
        plChangeEl.textContent = (lastTrade.type === 'profit' ? '+' : '-') + '$' + lastTrade.volume.toFixed(2);
        plChangeEl.className = 'stat-change ' + (lastTrade.type === 'profit' ? 'positive' : 'negative');
    }
}

function updateCharts() {
    const ctx1 = document.getElementById('plChart')?.getContext('2d');
    if (ctx1) {
        if (plChart) plChart.destroy();
        const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
        let cumulativePL = 0;
        const cumulativeData = [], labels = [];
        sortedTrades.forEach(t => {
            cumulativePL += t.type === 'profit' ? t.volume : -t.volume;
            cumulativeData.push(cumulativePL);
            labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
        });
        plChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: labels.slice(-50),
                datasets: [{
                    label: 'P/L', data: cumulativeData.slice(-50),
                    borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4, fill: true
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
            data: { labels: ['LONG', 'SHORT'], datasets: [{ data: [wins, losses], backgroundColor: ['#10B981', '#EF4444'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const profitPercentEl = document.getElementById('profitPercent');
    const lossPercentEl = document.getElementById('lossPercent');
    if (profitPercentEl && lossPercentEl && trades.length > 0) {
        const wins = trades.filter(t => t.type === 'profit').length;
        profitPercentEl.textContent = ((wins / trades.length) * 100).toFixed(1) + '%';
        lossPercentEl.textContent = (((trades.length - wins) / trades.length) * 100).toFixed(1) + '%';
    }
}

function updateDate() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ========== Лидерборд ==========
async function loadLeaderboard() {
    const limit = document.getElementById('leaderboardLimit')?.value || '25';
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Загрузка...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/api/leaderboard?limit=${limit}`);
        const data = await response.json();
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Нет публичных профилей</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(row => `
            <tr>
                <td>${row.rank}</td>
                <td>${row.username} <span class="wallet-badge">${row.wallet_type || ''}</span></td>
                <td class="${row.totalPL >= 0 ? 'profit-text' : 'loss-text'}">${row.totalPL >= 0 ? '+' : ''}$${row.totalPL.toFixed(2)}</td>
                <td>${row.winRate}%</td>
                <td>${row.totalTrades}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Ошибка загрузки</td></tr>';
    }
}

// ========== Настройки ==========
function updateProfileDisplay() {
    if (currentUser) {
        const usernameEls = document.querySelectorAll('#profileUsername, #sidebarUsername');
        usernameEls.forEach(el => { if (el) el.textContent = currentUser.username; });
    }
}

function exportData() {
    const data = { trades, exportDate: new Date().toISOString(), version: '2.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${currentUser?.username || 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.trades && Array.isArray(data.trades)) {
                if (confirm(`Импортировать ${data.trades.length} сделок?`)) {
                    const response = await fetch(`${API_BASE}/api/trades/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                        body: JSON.stringify({ trades: data.trades })
                    });
                    if (response.ok) { await loadTrades(); renderJournal(); alert('Импорт завершен'); }
                }
            }
        } catch (error) { alert('Ошибка чтения файла'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function clearAllData() {
    if (userStatus.wallet_connected) { alert('Очистка недоступна для Pro'); return; }
    if (confirm('Удалить ВСЕ сделки?')) {
        try {
            await fetch(`${API_BASE}/api/trades/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ trades: [] })
            });
            trades = []; renderJournal();
            if (currentView === 'analytics') updateCharts();
            alert('Данные очищены');
        } catch (error) { alert('Ошибка'); }
    }
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
    const particleCount = 50;

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }

        update() {
            // Притяжение к мышке
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 200) {
                const force = (200 - dist) / 200;
                this.vx += dx * force * 0.01;
                this.vy += dy * force * 0.01;
            }

            // Трение
            this.vx *= 0.98;
            this.vy *= 0.98;

            this.x += this.vx;
            this.y += this.vy;

            // Границы
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

            // Градиент в зависимости от расстояния до мышки
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const opacity = Math.max(0.1, 1 - dist / 300);

            ctx.fillStyle = `rgba(16, 185, 129, ${opacity * 0.5})`;
            ctx.fill();
        }
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Рисуем связи между частицами
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.lineWidth = 0.5;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${0.1 * (1 - dist / 100)})`;
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initParticles();
    }

    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Обновляем позицию свечения
        const glow = document.getElementById('mouseGlow');
        if (glow) {
            glow.style.left = (mouseX - 200) + 'px';
            glow.style.top = (mouseY - 200) + 'px';
        }
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    canvas.width = width;
    canvas.height = height;
    initParticles();
    animate();
})();