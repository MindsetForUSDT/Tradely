// ========== STORE (Observer Pattern) ==========
const Store = {
    trades: [],
    filter: 'all',
    userStatus: {
        wallet_connected: false,
        is_public: false,
        first_login: true,
        is_admin: false
    },
    currentUser: null,
    subscribers: [],

    subscribe(fn) {
        this.subscribers.push(fn);
        return () => { this.subscribers = this.subscribers.filter(sub => sub !== fn); };
    },

    notify() {
        this.subscribers.forEach(fn => fn(this));
    },

    setTrades(newTrades) {
        this.trades = [...newTrades].sort((a, b) => b.timestamp - a.timestamp);
        this.notify();
    },

    addTrade(trade) {
        this.trades = [trade, ...this.trades];
        this.notify();
    },

    removeTrade(id) {
        this.trades = this.trades.filter(t => t.id !== id);
        this.notify();
    },

    setFilter(newFilter) {
        this.filter = newFilter;
        this.notify();
    },

    setUserStatus(status) {
        this.userStatus = { ...this.userStatus, ...status };
        this.notify();
    },

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            this.userStatus = {
                wallet_connected: user.wallet_connected || false,
                is_public: user.is_public || false,
                first_login: user.first_login ?? true,
                is_admin: user.is_admin || false
            };
        }
        this.notify();
    },

    getFilteredTrades() {
        if (this.filter === 'all') return this.trades;
        return this.trades.filter(t => t.type === this.filter);
    },

    getStats() {
        let pl = 0, w = 0, maxP = 0, maxL = 0, pS = 0, lS = 0;
        this.trades.forEach(t => {
            if (t.type === 'profit') {
                pl += t.volume; w++; pS += t.volume;
                maxP = Math.max(maxP, t.volume);
            } else {
                pl -= t.volume; lS += t.volume;
                maxL = Math.max(maxL, t.volume);
            }
        });
        const wr = this.trades.length ? (w / this.trades.length) * 100 : 0;
        const avgProfit = w ? pS / w : 0;
        const avgLoss = (this.trades.length - w) ? lS / (this.trades.length - w) : 0;

        return { totalPL: pl, winRate: wr, totalTrades: this.trades.length, wins: w, losses: this.trades.length - w, avgProfit, avgLoss, maxProfit: maxP, maxLoss: maxL };
    }
};

window.Store = Store;

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let authToken = null;
let currentView = 'journal';
let plChart = null;
let ratioChart = null;
let selectedMode = null;
let selectedWalletType = null;

const API = '';

// ========== УТИЛИТЫ ==========
function toast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span><span style="cursor:pointer;margin-left:auto;" onclick="this.parentElement.remove()">✕</span>`;
    c.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 4000);
}

function hidePreloader() {
    const p = document.getElementById('preloader');
    if (p) p.style.display = 'none';
}

// ========== ГРАФИКИ (Исправлены) ==========
function destroyCharts() {
    if (plChart) { plChart.destroy(); plChart = null; }
    if (ratioChart) { ratioChart.destroy(); ratioChart = null; }
}

function isElementVisible(el) {
    if (!el) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function updateCharts() {
    const plCanvas = document.getElementById('plChart');
    const ratioCanvas = document.getElementById('ratioChart');

    if (!plCanvas || !ratioCanvas) return;
    if (!isElementVisible(plCanvas) || !isElementVisible(ratioCanvas)) return;
    if (!Store.trades.length) return;

    // P/L Chart
    const ctx1 = plCanvas.getContext('2d');
    if (plChart) plChart.destroy();

    const sorted = [...Store.trades].sort((a, b) => a.timestamp - b.timestamp);
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
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { maxRotation: 45 } } }
        }
    });

    // Ratio Chart
    const ctx2 = ratioCanvas.getContext('2d');
    if (ratioChart) ratioChart.destroy();

    const wins = Store.trades.filter(t => t.type === 'profit').length;
    const losses = Store.trades.length - wins;

    ratioChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['LONG', 'SHORT'],
            datasets: [{
                data: [wins, losses],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    const profitPercent = document.getElementById('profitPercent');
    const lossPercent = document.getElementById('lossPercent');
    if (profitPercent) profitPercent.textContent = Store.trades.length ? ((wins / Store.trades.length) * 100).toFixed(1) + '%' : '0%';
    if (lossPercent) lossPercent.textContent = Store.trades.length ? ((losses / Store.trades.length) * 100).toFixed(1) + '%' : '0%';
}

let chartUpdateScheduled = false;
function scheduleChartUpdate() {
    if (chartUpdateScheduled) return;
    chartUpdateScheduled = true;
    requestAnimationFrame(() => {
        updateCharts();
        chartUpdateScheduled = false;
    });
}

// ========== РЕНДЕРИНГ ==========
function renderJournal() {
    const tb = document.getElementById('tradesList');
    if (!tb) return;

    const filtered = Store.getFilteredTrades();
    if (!filtered.length) {
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет сделок</td></tr>';
        return;
    }

    const isPro = Store.userStatus.wallet_connected;
    tb.innerHTML = filtered.map(t => {
        const tm = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const act = isPro ? '' : `<button class="icon-btn" onclick="window.deleteTrade('${t.id}')" style="width:28px;height:28px;">🗑️</button>`;
        return `<tr><td>${tm}</td><td>${t.pair}</td><td>${t.volume.toFixed(2)}</td><td class="${t.type === 'profit' ? 'profit-text' : 'loss-text'}">${t.type === 'profit' ? '+' : '−'} $${t.volume.toFixed(2)}</td><td>${act}</td></tr>`;
    }).join('');
}

function updateStats() {
    const stats = Store.getStats();

    const totalPL = document.getElementById('totalPL');
    if (totalPL) totalPL.textContent = (stats.totalPL >= 0 ? '+' : '−') + '$' + Math.abs(stats.totalPL).toFixed(2);

    const winRate = document.getElementById('winRate');
    if (winRate) winRate.textContent = stats.winRate.toFixed(1) + '%';

    const progress = document.getElementById('winRateProgress');
    if (progress) progress.style.width = stats.winRate + '%';

    const totalTrades = document.getElementById('totalTradesCount');
    if (totalTrades) totalTrades.textContent = stats.totalTrades;

    const winCount = document.getElementById('winCount');
    if (winCount) winCount.textContent = stats.wins + ' LONG';

    const lossCount = document.getElementById('lossCount');
    if (lossCount) lossCount.textContent = stats.losses + ' SHORT';

    if (Store.trades.length) {
        const lst = Store.trades[0];
        const plChange = document.getElementById('plChange');
        if (plChange) plChange.textContent = (lst.type === 'profit' ? '+' : '-') + '$' + lst.volume.toFixed(2);
    }

    const avgProfit = document.getElementById('avgProfit');
    if (avgProfit) avgProfit.textContent = '$' + stats.avgProfit.toFixed(2);

    const avgLoss = document.getElementById('avgLoss');
    if (avgLoss) avgLoss.textContent = '$' + stats.avgLoss.toFixed(2);

    const bestTrade = document.getElementById('bestTrade');
    if (bestTrade) bestTrade.textContent = '$' + stats.maxProfit.toFixed(2);

    const worstTrade = document.getElementById('worstTrade');
    if (worstTrade) worstTrade.textContent = '$' + stats.maxLoss.toFixed(2);
}

function updateProfileDisplay() {
    if (!Store.currentUser) return;
    const user = Store.currentUser;
    const status = Store.userStatus;

    const headerUser = document.getElementById('headerUsername');
    if (headerUser) headerUser.textContent = user.username;
    const profileUser = document.getElementById('profileUsername');
    if (profileUser) profileUser.textContent = user.username;

    const tariffName = document.getElementById('tariffName');
    if (tariffName) tariffName.textContent = status.wallet_connected ? 'Pro' : 'Базовый';
    const tariffPrice = document.getElementById('tariffPrice');
    if (tariffPrice) tariffPrice.textContent = status.wallet_connected ? '500₽/мес' : 'Бесплатно';
    const accountType = document.getElementById('accountTypeDisplay');
    if (accountType) accountType.textContent = status.wallet_connected ? 'Pro' : 'Базовый';

    const toggle = document.getElementById('publicProfileToggle');
    if (toggle) toggle.checked = status.is_public;
}

function updateDate() {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Подписка на изменения Store
Store.subscribe(() => {
    renderJournal();
    updateStats();
    updateProfileDisplay();
    scheduleChartUpdate();
});

// ========== API ==========
async function loadTrades() {
    if (!authToken) return;
    try {
        const r = await fetch(API + '/api/trades', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) {
            const data = await r.json();
            Store.setTrades(data);
        }
    } catch (e) {
        console.error('loadTrades failed', e);
    }
}

async function addTrade() {
    if (Store.userStatus.wallet_connected) {
        toast('Pro: ручное добавление отключено', 'error');
        return;
    }
    const p = document.getElementById('pairInput')?.value.trim();
    const v = parseFloat(document.getElementById('volumeInput')?.value.replace(',', '.'));
    const isP = document.querySelector('.type-btn.profit')?.classList.contains('active');

    if (!p || isNaN(v) || v <= 0) return;

    const newTrade = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        pair: p.toUpperCase(),
        volume: v,
        type: isP ? 'profit' : 'loss',
        timestamp: Date.now()
    };

    Store.addTrade(newTrade);
    const volInput = document.getElementById('volumeInput');
    if (volInput) volInput.value = '';
    toast('Сделка добавлена', 'success');

    try {
        const r = await fetch(API + '/api/trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify(newTrade)
        });
        if (!r.ok) {
            Store.removeTrade(newTrade.id);
            toast('Ошибка сохранения', 'error');
        }
    } catch (e) {
        Store.removeTrade(newTrade.id);
        toast('Нет соединения', 'error');
    }
}

window.deleteTrade = async function(id) {
    if (Store.userStatus.wallet_connected) {
        toast('Pro: удаление отключено', 'error');
        return;
    }
    Store.removeTrade(id);
    toast('Сделка удалена', 'info');

    try {
        await fetch(API + '/api/trades/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } });
    } catch (e) {
        toast('Ошибка синхронизации', 'error');
        await loadTrades();
    }
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupListeners();
});

function checkAuth() {
    const t = localStorage.getItem('authToken');
    if (t) {
        authToken = t;
        fetchProfile();
    } else {
        hidePreloader();
        showAuthPage();
    }
}

async function fetchProfile() {
    try {
        const r = await fetch(API + '/api/user/profile', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) {
            const user = await r.json();
            Store.setCurrentUser(user);
            hidePreloader();
            if (Store.userStatus.first_login) showTariffPage();
            else { await loadTrades(); showAppPage(); }
        } else {
            localStorage.removeItem('authToken');
            hidePreloader();
            showAuthPage();
        }
    } catch (e) {
        hidePreloader();
        showAuthPage();
    }
}

function showAuthPage() {
    hideAll();
    document.getElementById('authPage')?.classList.remove('hidden');
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
    document.getElementById('loginForm')?.classList.remove('hidden');
    document.getElementById('registerForm')?.classList.add('hidden');
}

function showTariffPage() {
    hideAll();
    document.getElementById('tariffPage')?.classList.remove('hidden');
    selectedMode = selectedWalletType = null;
    document.querySelectorAll('.tariff-card').forEach(c => c.classList.remove('selected'));
    document.querySelector('.tariff-cards')?.classList.remove('hidden');
    document.querySelector('.tariff-header')?.classList.remove('hidden');
    document.querySelector('.tariff-note')?.classList.remove('hidden');
    document.getElementById('walletStepContainer')?.classList.add('hidden');
}

function showAppPage() {
    hideAll();
    document.getElementById('appPage')?.classList.remove('hidden');
    updateDate();
    switchView('journal');
}

function hideAll() {
    ['authPage', 'tariffPage', 'appPage'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

function switchView(v) {
    if (v === 'premium' && !Store.userStatus.wallet_connected && !Store.userStatus.is_admin) {
        toast('Требуется Pro', 'error');
        return;
    }
    if (v === 'admin' && !Store.userStatus.is_admin) {
        toast('Доступ запрещён', 'error');
        return;
    }
    currentView = v;
    document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));
    const viewEl = document.getElementById(v + 'View');
    if (viewEl) viewEl.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.dataset.view === v) l.classList.add('active');
    });

    if (v === 'leaderboard') {
        if (!Store.userStatus.wallet_connected && !Store.userStatus.is_admin) {
            switchView('settings');
            return;
        }
        loadLeaderboard();
    }
    if (v === 'analytics') {
        destroyCharts();
        setTimeout(() => scheduleChartUpdate(), 50);
    }
    if (v === 'premium') loadPremium();
    if (v === 'admin') loadAdmin();
}

// ========== СЛУШАТЕЛИ ==========
function setupListeners() {
    // Табы
    document.querySelectorAll('.auth-tab').forEach(t => {
        t.onclick = function() {
            document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
            this.classList.add('active');
            const isL = this.dataset.tab === 'login';
            document.getElementById('loginForm')?.classList.toggle('hidden', !isL);
            document.getElementById('registerForm')?.classList.toggle('hidden', isL);
        };
    });

    // Логин
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            const r = await fetch(API + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: f.get('username'), password: f.get('password') })
            });
            const d = await r.json();
            if (r.ok) {
                authToken = d.token;
                Store.setCurrentUser(d.user);
                localStorage.setItem('authToken', authToken);
                toast('Вход выполнен', 'success');
                Store.userStatus.first_login ? showTariffPage() : (await loadTrades(), showAppPage());
            } else {
                document.getElementById('authError').textContent = d.error;
                toast(d.error, 'error');
            }
        } catch { document.getElementById('authError').textContent = 'Ошибка соединения'; }
    });

    // Регистрация
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        if (f.get('password') !== f.get('confirmPassword')) {
            document.getElementById('authError').textContent = 'Пароли не совпадают';
            return;
        }
        try {
            const r = await fetch(API + '/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: f.get('username'), password: f.get('password'), secretQuestion: f.get('secretQuestion'), secretAnswer: f.get('secretAnswer') })
            });
            const d = await r.json();
            if (r.ok) {
                authToken = d.token;
                Store.setCurrentUser(d.user);
                localStorage.setItem('authToken', authToken);
                toast('Регистрация успешна', 'success');
                showTariffPage();
            } else document.getElementById('authError').textContent = d.error;
        } catch { document.getElementById('authError').textContent = 'Ошибка соединения'; }
    });

    // Восстановление пароля
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm')?.classList.add('hidden');
        document.getElementById('forgotPasswordForm')?.classList.remove('hidden');
    });
    document.getElementById('backToLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm')?.classList.remove('hidden');
        document.getElementById('forgotPasswordForm')?.classList.add('hidden');
    });
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = e.target.querySelector('[name="forgotUsername"]').value;
        try {
            const r = await fetch(API + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u }) });
            const d = await r.json();
            if (r.ok) {
                document.getElementById('resetUsername').value = u;
                document.getElementById('secretQuestionLabel').textContent = d.secretQuestion;
                document.getElementById('forgotPasswordForm').classList.add('hidden');
                document.getElementById('resetPasswordForm').classList.remove('hidden');
            } else document.getElementById('authError').textContent = d.error;
        } catch {}
    });
    document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        if (f.get('newPassword') !== f.get('confirmNewPassword')) {
            document.getElementById('authError').textContent = 'Пароли не совпадают';
            return;
        }
        try {
            const r = await fetch(API + '/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: document.getElementById('resetUsername').value, secretAnswer: f.get('secretAnswer'), newPassword: f.get('newPassword') })
            });
            if (r.ok) {
                toast('Пароль изменён', 'success');
                document.getElementById('resetPasswordForm').classList.add('hidden');
                document.getElementById('loginForm').classList.remove('hidden');
            }
        } catch {}
    });

    // Тарифы
    document.querySelectorAll('.tariff-card').forEach(c => c.onclick = function() {
        document.querySelectorAll('.tariff-card').forEach(x => x.classList.remove('selected'));
        this.classList.add('selected');
        selectedMode = this.dataset.mode;
    });
    document.querySelectorAll('.tariff-select-btn').forEach(b => b.onclick = function(e) {
        e.stopPropagation();
        if (!selectedMode) { toast('Выберите тариф', 'error'); return; }
        if (selectedMode === 'pro') {
            document.querySelector('.tariff-cards')?.classList.add('hidden');
            document.querySelector('.tariff-header')?.classList.add('hidden');
            document.querySelector('.tariff-note')?.classList.add('hidden');
            document.getElementById('walletStepContainer')?.classList.remove('hidden');
        } else finishOnboarding(false);
    });

    // Кошелёк
    document.querySelectorAll('.wallet-option').forEach(o => o.onclick = function() {
        document.querySelectorAll('.wallet-option').forEach(w => w.classList.remove('selected'));
        this.classList.add('selected');
        selectedWalletType = this.dataset.wallet;
        document.getElementById('finishOnboarding').disabled = !document.getElementById('walletAddressInput')?.value.trim();
    });
    document.getElementById('walletAddressInput')?.addEventListener('input', function() {
        document.getElementById('finishOnboarding').disabled = !selectedWalletType || !this.value.trim();
    });
    document.getElementById('backToTariff')?.addEventListener('click', () => {
        document.querySelector('.tariff-cards')?.classList.remove('hidden');
        document.querySelector('.tariff-header')?.classList.remove('hidden');
        document.querySelector('.tariff-note')?.classList.remove('hidden');
        document.getElementById('walletStepContainer')?.classList.add('hidden');
    });
    document.getElementById('finishOnboarding')?.addEventListener('click', () => finishOnboarding(true));

    async function finishOnboarding(isPro) {
        try {
            if (isPro) {
                await fetch(API + '/api/user/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                    body: JSON.stringify({ wallet_address: document.getElementById('walletAddressInput').value.trim(), wallet_type: selectedWalletType })
                });
                Store.setUserStatus({ wallet_connected: true });
                toast('Pro активирован', 'success');
            } else {
                await fetch(API + '/api/user/skip-wallet', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } });
                toast('Базовый тариф', 'success');
            }
            Store.setUserStatus({ first_login: false });
            await loadTrades();
            showAppPage();
        } catch { toast('Ошибка', 'error'); }
    }

    // Навигация
    document.querySelectorAll('[data-view]').forEach(el => el.onclick = (e) => { e.preventDefault(); switchView(el.dataset.view); });

    // Выход
    const logout = () => { localStorage.removeItem('authToken'); authToken = null; Store.setCurrentUser(null); Store.setTrades([]); showAuthPage(); };
    document.getElementById('headerLogout')?.addEventListener('click', logout);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Сделки
    document.getElementById('addTradeBtn')?.addEventListener('click', addTrade);
    document.querySelectorAll('.type-btn').forEach(b => b.onclick = function() {
        document.querySelectorAll('.type-btn').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
    });
    document.querySelectorAll('.filter-btn').forEach(b => b.onclick = function() {
        document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        Store.setFilter(this.dataset.filter);
    });

    // Настройки
    document.getElementById('publicProfileToggle')?.addEventListener('change', async (e) => {
        if (!Store.userStatus.wallet_connected) { e.target.checked = false; toast('Требуется Pro', 'error'); return; }
        await fetch(API + '/api/user/public', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ is_public: e.target.checked }) });
        Store.setUserStatus({ is_public: e.target.checked });
    });
    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
        const d = { trades: Store.trades, exportDate: new Date().toISOString() };
        const b = new Blob([JSON.stringify(d)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'trades-' + Date.now() + '.json'; a.click();
        toast('Экспортировано', 'success');
    });
    document.getElementById('importDataBtn')?.addEventListener('click', () => document.getElementById('importFileInput')?.click());
    document.getElementById('importFileInput')?.addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = async (ev) => {
            try {
                const d = JSON.parse(ev.target.result);
                if (d.trades && confirm('Импортировать ' + d.trades.length + ' сделок?')) {
                    await fetch(API + '/api/trades/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ trades: d.trades }) });
                    await loadTrades();
                }
            } catch { toast('Ошибка файла', 'error'); }
        };
        r.readAsText(f); e.target.value = '';
    });
    document.getElementById('clearDataBtn')?.addEventListener('click', async () => {
        if (!confirm('Удалить всё?')) return;
        await fetch(API + '/api/trades/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ trades: [] }) });
        Store.setTrades([]);
        toast('Очищено', 'info');
    });
    document.getElementById('upgradeToProBtn')?.addEventListener('click', () => showTariffPage());
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => document.getElementById('changePasswordModal')?.classList.remove('hidden'));
    document.getElementById('closeChangePasswordModal')?.addEventListener('click', () => document.getElementById('changePasswordModal')?.classList.add('hidden'));
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        if (f.get('newPassword') !== f.get('confirmNewPassword')) { document.getElementById('changePasswordError').textContent = 'Пароли не совпадают'; return; }
        try {
            const r = await fetch(API + '/api/user/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ currentPassword: f.get('currentPassword'), newPassword: f.get('newPassword') }) });
            if (r.ok) { toast('Пароль изменён', 'success'); document.getElementById('changePasswordModal')?.classList.add('hidden'); }
        } catch {}
    });
}

// ========== PREMIUM, ADMIN, LEADERBOARD ==========
async function loadPremium() {
    try {
        const r = await fetch(API + '/api/premium/analytics', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) {
            const d = await r.json();
            document.getElementById('profitFactor').textContent = d.profitFactor;
            document.getElementById('sharpeRatio').textContent = d.sharpeRatio;
            document.getElementById('maxDrawdown').textContent = '$' + d.maxDrawdown;
            document.getElementById('monthlyProjection').textContent = '$' + d.monthlyProjection;
            document.getElementById('bestPair').textContent = d.bestPair;
            document.getElementById('worstPair').textContent = d.worstPair;
            document.getElementById('bestDay').textContent = d.bestDay ? d.bestDay.date + ' (+$' + d.bestDay.pl + ')' : '—';
            document.getElementById('worstDay').textContent = d.worstDay ? d.worstDay.date + ' (-$' + Math.abs(d.worstDay.pl) + ')' : '—';
            const recs = [];
            if (d.winRate > 60) recs.push('Отличный винрейт!');
            if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!');
            document.getElementById('premiumRecommendations').innerHTML = recs.length ? recs.map(r => '<p>• ' + r + '</p>').join('') : '<p>Недостаточно данных</p>';
        }
    } catch {}
}

async function loadAdmin() {
    try {
        const r = await fetch(API + '/api/admin/users', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) {
            const u = await r.json();
            document.getElementById('adminUsersList').innerHTML = u.map(u => `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.wallet_connected ? '✅' : '❌'}</td><td>${u.trades_count || 0}</td><td class="${u.total_pl >= 0 ? 'profit-text' : 'loss-text'}">$${u.total_pl?.toFixed(2) || '0.00'}</td><td><button class="icon-btn" onclick="window.deleteAdminUser(${u.id})">🗑️</button></td></tr>`).join('');
        }
    } catch {}
}
window.deleteAdminUser = async (id) => { if (confirm('Удалить?')) { await fetch(API + '/api/admin/users/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } }); loadAdmin(); } };

async function loadLeaderboard() {
    const l = document.getElementById('leaderboardLimit')?.value || 25;
    try {
        const r = await fetch(API + '/api/leaderboard?limit=' + l);
        const d = await r.json();
        document.getElementById('leaderboardBody').innerHTML = d.map(r => `<tr><td>${r.rank}</td><td>${r.username}</td><td class="${r.totalPL >= 0 ? 'profit-text' : 'loss-text'}">${r.totalPL >= 0 ? '+' : ''}$${r.totalPL.toFixed(2)}</td><td>${r.winRate}%</td><td>${r.totalTrades}</td></tr>`).join('') || '<tr><td colspan="5">Нет данных</td></tr>';
    } catch {}
}

// Таймаут прелоадера
setTimeout(() => {
    const p = document.getElementById('preloader');
    if (p && p.style.display !== 'none') { p.style.display = 'none'; document.getElementById('authPage')?.classList.remove('hidden'); }
}, 5000);