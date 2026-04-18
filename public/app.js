// ========== Глобальные переменные ==========
let currentUser = null;
let authToken = null;
let trades = [];
let currentView = 'journal';
let currentFilter = 'all';
let plChart = null;
let ratioChart = null;
let userStatus = {
    wallet_connected: false,
    wallet_address: null,
    is_public: false
};
let selectedWalletType = null;

const API_BASE = '';

// DOM элементы
const preloader = document.getElementById('preloader');
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const statusBar = document.getElementById('statusBar');

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
                is_public: currentUser.is_public
            };
            await loadTrades();
            showAppScreen();
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
            if (connectedWalletAddress) {
                connectedWalletAddress.textContent = userStatus.wallet_address?.slice(0, 6) + '...' + userStatus.wallet_address?.slice(-4);
            }
        }

        // Скрываем кнопки добавления/редактирования
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

function showAuthScreen() {
    if (preloader) preloader.style.display = 'none';
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
    if (statusBar) statusBar.classList.add('hidden');
}

function showAppScreen() {
    if (preloader) preloader.style.display = 'none';
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    if (statusBar) statusBar.classList.remove('hidden');

    updateDate();
    updateProfileDisplay();
    updateUIForUserStatus();
    renderJournal();
    switchView('journal');
}

function switchView(viewName) {
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
        leaderboard: 'Рейтинг',
        settings: 'Настройки'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[viewName] || 'Терминал';

    if (viewName === 'leaderboard') {
        if (!userStatus.wallet_connected) {
            alert('Только Pro трейдеры имеют доступ к таблице лидеров. Подключите кошелек в настройках.');
            switchView('settings');
            return;
        }
        loadLeaderboard();
    }
    if (viewName === 'analytics') {
        setTimeout(updateCharts, 100);
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
                    is_public: data.user.is_public
                };
                localStorage.setItem('authToken', authToken);
                await loadTrades();
                showAppScreen();
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
                userStatus = { wallet_connected: false, is_public: false };
                localStorage.setItem('authToken', authToken);
                await loadTrades();
                showAppScreen();
            } else {
                document.getElementById('authError').textContent = data.error;
            }
        } catch (error) {
            document.getElementById('authError').textContent = 'Ошибка соединения';
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
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', logout);
    }

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

                if (response.ok) {
                    userStatus.is_public = isPublic;
                }
            } catch (error) {
                console.error('Ошибка обновления настроек:', error);
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
    const cancelBtn = document.getElementById('cancelWalletBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('walletForm').classList.add('hidden');
            selectedWalletType = null;
        });
    }

    // Подключение кошелька
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            const address = document.getElementById('walletAddress').value.trim();

            if (!address) {
                alert('Введите адрес кошелька');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/user/wallet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        wallet_address: address,
                        wallet_type: selectedWalletType
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    userStatus.wallet_connected = true;
                    userStatus.wallet_address = address;
                    userStatus.is_public = true;

                    await loadTrades();
                    updateUIForUserStatus();
                    renderJournal();

                    alert(`Кошелек подключен! Импортировано ${data.trades_imported} сделок.`);
                } else {
                    alert(data.error);
                }
            } catch (error) {
                alert('Ошибка подключения кошелька');
            }
        });
    }

    // Отключение кошелька
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
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
                alert('Ошибка отключения кошелька');
            }
        });
    }

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
    const refreshLeaderboard = document.getElementById('refreshLeaderboard');
    const leaderboardLimit = document.getElementById('leaderboardLimit');
    if (refreshLeaderboard) refreshLeaderboard.addEventListener('click', loadLeaderboard);
    if (leaderboardLimit) leaderboardLimit.addEventListener('change', loadLeaderboard);

    const refreshData = document.getElementById('refreshData');
    if (refreshData) {
        refreshData.addEventListener('click', async () => {
            await loadTrades();
            renderJournal();
            if (currentView === 'leaderboard') loadLeaderboard();
            if (currentView === 'analytics') updateCharts();
        });
    }

    // Экспорт/импорт
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const importFile = document.getElementById('importFileInput');
    const clearBtn = document.getElementById('clearDataBtn');

    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) importBtn.addEventListener('click', () => importFile?.click());
    if (importFile) importFile.addEventListener('change', importData);
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    userStatus = { wallet_connected: false, is_public: false };
    trades = [];
    showAuthScreen();
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

    if (!pair) {
        alert('Введите торговую пару');
        return;
    }

    if (isNaN(volume) || volume <= 0) {
        alert('Введите корректный объем');
        return;
    }

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
        console.error('Ошибка добавления сделки:', error);
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
        console.error('Ошибка удаления сделки:', error);
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
            body: JSON.stringify({
                pair: newPair,
                volume: parseFloat(newVolume),
                type: newType
            })
        });

        if (response.ok) {
            const index = trades.findIndex(t => t.id === tradeId);
            trades[index] = {
                ...trades[index],
                pair: newPair.toUpperCase(),
                volume: parseFloat(newVolume),
                type: newType
            };
            renderJournal();
            if (currentView === 'analytics') updateCharts();
        }
    } catch (error) {
        console.error('Ошибка редактирования:', error);
    }
}

window.editTrade = editTrade;

function renderJournal() {
    const tradesList = document.getElementById('tradesList');
    const filteredTrades = currentFilter === 'all'
        ? trades
        : trades.filter(t => t.type === currentFilter);

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
                    <td class="${isProfit ? 'profit-text' : 'loss-text'}">
                        ${isProfit ? '+' : '−'} $${trade.volume.toFixed(2)}
                    </td>
                    <td class="actions-cell">
                        ${actions}
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStats();
}

function updateStats() {
    let totalPL = 0;
    let wins = 0;
    let maxProfit = 0;
    let maxLoss = 0;
    let profitSum = 0;
    let lossSum = 0;

    trades.forEach(t => {
        if (t.type === 'profit') {
            totalPL += t.volume;
            wins++;
            profitSum += t.volume;
            maxProfit = Math.max(maxProfit, t.volume);
        } else {
            totalPL -= t.volume;
            lossSum += t.volume;
            maxLoss = Math.max(maxLoss, t.volume);
        }
    });

    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgProfit = wins > 0 ? profitSum / wins : 0;
    const avgLoss = (trades.length - wins) > 0 ? lossSum / (trades.length - wins) : 0;
    const profitFactor = avgLoss > 0 ? (avgProfit / avgLoss) : 0;

    const totalPLEl = document.getElementById('totalPL');
    if (totalPLEl) {
        totalPLEl.textContent = totalPL.toFixed(2);
        totalPLEl.className = `stat-value ${totalPL >= 0 ? 'profit-text' : 'loss-text'}`;
    }

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

    const profitFactorEl = document.getElementById('profitFactor');
    if (profitFactorEl) profitFactorEl.textContent = profitFactor.toFixed(2);

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

        const dailyData = {};
        const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
        let cumulativePL = 0;
        const cumulativeData = [];
        const labels = [];

        sortedTrades.forEach(t => {
            const date = new Date(t.timestamp).toLocaleDateString('ru-RU');
            if (!dailyData[date]) dailyData[date] = 0;
            dailyData[date] += t.type === 'profit' ? t.volume : -t.volume;

            cumulativePL += t.type === 'profit' ? t.volume : -t.volume;
            cumulativeData.push(cumulativePL);
            labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
        });

        plChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: labels.slice(-50),
                datasets: [{
                    label: 'Кумулятивный P/L',
                    data: cumulativeData.slice(-50),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `P/L: $${context.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#A1A1AA' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#A1A1AA', maxRotation: 45 }
                    }
                }
            }
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
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = wins + losses;
                                const percent = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
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
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }
}

// ========== Лидерборд ==========
async function loadLeaderboard() {
    const limit = document.getElementById('leaderboardLimit')?.value || '25';
    const tbody = document.getElementById('leaderboardBody');

    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Загрузка данных...</td></tr>';

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
                <td>
                    ${row.username}
                    <span class="wallet-badge">${row.wallet_type || ''}</span>
                </td>
                <td class="${row.totalPL >= 0 ? 'profit-text' : 'loss-text'}">
                    ${row.totalPL >= 0 ? '+' : ''}$${row.totalPL.toFixed(2)}
                </td>
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
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ trades: data.trades })
                    });

                    if (response.ok) {
                        await loadTrades();
                        renderJournal();
                        alert('Импорт завершен');
                    }
                }
            }
        } catch (error) {
            alert('Ошибка чтения файла');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function clearAllData() {
    if (userStatus.wallet_connected) {
        alert('Очистка данных недоступна для Pro трейдеров');
        return;
    }

    if (confirm('Удалить ВСЕ сделки безвозвратно?')) {
        try {
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
            if (currentView === 'analytics') updateCharts();
            alert('Данные очищены');
        } catch (error) {
            alert('Ошибка очистки');
        }
    }
}