// ========== Глобальные переменные ==========
let currentUser = null;
let authToken = null;
let trades = [];
let currentView = 'journal';
let currentFilter = 'all';
let plChart = null;
let ratioChart = null;

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

// Анимация прелоадера
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
    renderJournal();
    switchView('journal');
}

function switchView(viewName) {
    currentView = viewName;

    // Скрываем все view
    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
    document.getElementById(`${viewName}View`)?.classList.remove('hidden');

    // Обновляем активную ссылку в сайдбаре
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) link.classList.add('active');
    });

    // Обновляем заголовок
    const titles = {
        journal: 'Терминал',
        analytics: 'Аналитика',
        leaderboard: 'Рейтинг',
        settings: 'Настройки'
    };
    document.getElementById('pageTitle').textContent = titles[viewName] || 'Терминал';

    // Загружаем данные для view
    if (viewName === 'leaderboard') loadLeaderboard();
    if (viewName === 'analytics') setTimeout(updateCharts, 100);
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
    document.getElementById('addTradeBtn').addEventListener('click', addTrade);
    document.getElementById('pairInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('volumeInput').focus();
    });
    document.getElementById('volumeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTrade();
    });

    // Переключатель LONG/SHORT
    document.querySelectorAll('.result-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        trades = [];
        showAuthScreen();
    });

    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        trades = [];
        showAuthScreen();
    });

    // Настройки
    document.getElementById('publicProfileToggle').addEventListener('change', async (e) => {
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
                currentUser.is_public = isPublic;
            }
        } catch (error) {
            console.error('Ошибка обновления настроек:', error);
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
    const pairInput = document.getElementById('pairInput');
    const volumeInput = document.getElementById('volumeInput');
    const profitBtn = document.querySelector('[data-type="profit"]');
    const isProfit = profitBtn.classList.contains('active');

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
        }
    } catch (error) {
        console.error('Ошибка добавления сделки:', error);
    }
}

async function deleteTrade(tradeId) {
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
            return `
                <tr>
                    <td>${time}</td>
                    <td>${trade.pair}</td>
                    <td>${trade.volume.toFixed(2)}</td>
                    <td class="${isProfit ? 'profit-text' : 'loss-text'}">
                        ${isProfit ? '+' : '−'} $${trade.volume.toFixed(2)}
                    </td>
                    <td>
                        <button class="delete-button" onclick="deleteTrade('${trade.id}')">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </button>
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

    // Основные показатели
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

    // Аналитика
    const avgProfitEl = document.getElementById('avgProfit');
    if (avgProfitEl) avgProfitEl.textContent = '$' + avgProfit.toFixed(2);

    const avgLossEl = document.getElementById('avgLoss');
    if (avgLossEl) avgLossEl.textContent = '$' + avgLoss.toFixed(2);

    const bestTradeEl = document.getElementById('bestTrade');
    if (bestTradeEl) bestTradeEl.textContent = '$' + maxProfit.toFixed(2);

    const worstTradeEl = document.getElementById('worstTrade');
    if (worstTradeEl) worstTradeEl.textContent = '$' + maxLoss.toFixed(2);

    // Изменение за последнюю сделку
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
        [...trades].reverse().forEach(t => {
            const date = new Date(t.timestamp).toLocaleDateString('ru-RU');
            if (!dailyData[date]) dailyData[date] = 0;
            dailyData[date] += t.type === 'profit' ? t.volume : -t.volume;
        });

        plChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: Object.keys(dailyData),
                datasets: [{
                    label: 'P/L',
                    data: Object.values(dailyData),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
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
                plugins: { legend: { display: false } }
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
                <td>${row.username}</td>
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

        const toggleEl = document.getElementById('publicProfileToggle');
        if (toggleEl) toggleEl.checked = currentUser.is_public;
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