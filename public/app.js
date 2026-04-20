// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
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
    is_public: false,
    first_login: true,
    is_admin: false
};

const API = '';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function toast(msg, type = 'info') {
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + (type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ') + '</span><span>' + msg + '</span><span style="cursor:pointer;margin-left:auto;" onclick="this.parentElement.remove()">✕</span>';
    c.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 4000);
}

function hidePreloader() {
    var p = document.getElementById('preloader');
    if (p) p.style.display = 'none';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupListeners();
});

function checkAuth() {
    var t = localStorage.getItem('authToken');
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
        var r = await fetch(API + '/api/user/profile', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (r.ok) {
            currentUser = await r.json();
            userStatus = {
                wallet_connected: currentUser.wallet_connected,
                is_public: currentUser.is_public,
                first_login: currentUser.first_login,
                is_admin: currentUser.is_admin
            };
            isAdmin = currentUser.is_admin;
            hidePreloader();
            if (userStatus.first_login) {
                showTariffPage();
            } else {
                await loadTrades();
                showAppPage();
            }
        } else {
            localStorage.removeItem('authToken');
            hidePreloader();
            showAuthPage();
        }
    } catch (e) {
        console.error('Fetch profile error:', e);
        hidePreloader();
        showAuthPage();
    }
}

function showAuthPage() {
    hideAll();
    var el = document.getElementById('authPage');
    if (el) el.classList.remove('hidden');
    // Сбрасываем на вкладку входа
    document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelector('.auth-tab[data-tab="login"]').classList.add('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showTariffPage() {
    hideAll();
    var el = document.getElementById('tariffPage');
    if (el) el.classList.remove('hidden');
    selectedMode = null;
    selectedWalletType = null;
    // Сбрасываем выбор карточек
    document.querySelectorAll('.tariff-card').forEach(function(c) { c.classList.remove('selected'); });
    // Показываем шаг 1, скрываем шаг 2
    document.querySelector('.tariff-cards').classList.remove('hidden');
    document.querySelector('.tariff-header').classList.remove('hidden');
    document.querySelector('.tariff-note').classList.remove('hidden');
    document.getElementById('walletStepContainer').classList.add('hidden');
}

function showAppPage() {
    hideAll();
    var el = document.getElementById('appPage');
    if (el) el.classList.remove('hidden');
    updateDate();
    updateProfile();
    renderJournal();
    switchView('journal');
}

function hideAll() {
    var pages = ['authPage', 'tariffPage', 'appPage'];
    pages.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function switchView(v) {
    if (v === 'premium' && !userStatus.wallet_connected && !isAdmin) {
        toast('Требуется Pro', 'error');
        return;
    }
    if (v === 'admin' && !isAdmin) {
        toast('Доступ запрещён', 'error');
        return;
    }
    currentView = v;
    document.querySelectorAll('.view-container').forEach(function(c) { c.classList.add('hidden'); });
    var viewEl = document.getElementById(v + 'View');
    if (viewEl) viewEl.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(function(l) {
        l.classList.remove('active');
        if (l.dataset.view === v) l.classList.add('active');
    });

    if (v === 'leaderboard') {
        if (!userStatus.wallet_connected && !isAdmin) {
            switchView('settings');
            return;
        }
        loadLeaderboard();
    }
    if (v === 'analytics') setTimeout(updateCharts, 100);
    if (v === 'premium') loadPremium();
    if (v === 'admin') loadAdmin();
}

// ========== НАСТРОЙКА СЛУШАТЕЛЕЙ ==========
function setupListeners() {
    // Табы авторизации
    document.querySelectorAll('.auth-tab').forEach(function(t) {
        t.onclick = function() {
            document.querySelectorAll('.auth-tab').forEach(function(x) { x.classList.remove('active'); });
            this.classList.add('active');
            var isL = this.dataset.tab === 'login';
            document.getElementById('loginForm').classList.toggle('hidden', !isL);
            document.getElementById('registerForm').classList.toggle('hidden', isL);
            var errEl = document.getElementById('authError');
            if (errEl) errEl.textContent = '';
        };
    });

    // Логин
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault();
            var f = new FormData(e.target);
            try {
                var r = await fetch(API + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: f.get('username'), password: f.get('password') })
                });
                var d = await r.json();
                if (r.ok) {
                    authToken = d.token;
                    currentUser = d.user;
                    userStatus = {
                        wallet_connected: d.user.wallet_connected,
                        is_public: d.user.is_public,
                        first_login: d.user.first_login,
                        is_admin: d.user.is_admin
                    };
                    isAdmin = d.user.is_admin;
                    localStorage.setItem('authToken', authToken);
                    toast('Вход выполнен', 'success');
                    if (userStatus.first_login) {
                        showTariffPage();
                    } else {
                        await loadTrades();
                        showAppPage();
                    }
                } else {
                    var errEl = document.getElementById('authError');
                    if (errEl) errEl.textContent = d.error;
                    toast(d.error, 'error');
                }
            } catch (err) {
                var errEl = document.getElementById('authError');
                if (errEl) errEl.textContent = 'Ошибка соединения';
            }
        };
    }

    // Регистрация
    var regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.onsubmit = async function(e) {
            e.preventDefault();
            var f = new FormData(e.target);
            if (f.get('password') !== f.get('confirmPassword')) {
                var errEl = document.getElementById('authError');
                if (errEl) errEl.textContent = 'Пароли не совпадают';
                return;
            }
            try {
                var r = await fetch(API + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: f.get('username'),
                        password: f.get('password'),
                        secretQuestion: f.get('secretQuestion'),
                        secretAnswer: f.get('secretAnswer')
                    })
                });
                var d = await r.json();
                if (r.ok) {
                    authToken = d.token;
                    currentUser = d.user;
                    userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
                    localStorage.setItem('authToken', authToken);
                    toast('Регистрация успешна', 'success');
                    showTariffPage();
                } else {
                    var errEl = document.getElementById('authError');
                    if (errEl) errEl.textContent = d.error;
                }
            } catch (err) {
                var errEl = document.getElementById('authError');
                if (errEl) errEl.textContent = 'Ошибка соединения';
            }
        };
    }

    // Восстановление пароля
    var forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.onclick = function(e) {
            e.preventDefault();
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('forgotPasswordForm').classList.remove('hidden');
        };
    }

    var backLink = document.getElementById('backToLoginLink');
    if (backLink) {
        backLink.onclick = function(e) {
            e.preventDefault();
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('forgotPasswordForm').classList.add('hidden');
        };
    }

    var backFromReset = document.getElementById('backToLoginFromReset');
    if (backFromReset) {
        backFromReset.onclick = function(e) {
            e.preventDefault();
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('resetPasswordForm').classList.add('hidden');
        };
    }

    var forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.onsubmit = async function(e) {
            e.preventDefault();
            var u = e.target.querySelector('[name="forgotUsername"]').value;
            try {
                var r = await fetch(API + '/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u })
                });
                var d = await r.json();
                if (r.ok) {
                    document.getElementById('resetUsername').value = u;
                    document.getElementById('secretQuestionLabel').textContent = d.secretQuestion;
                    document.getElementById('forgotPasswordForm').classList.add('hidden');
                    document.getElementById('resetPasswordForm').classList.remove('hidden');
                } else {
                    var errEl = document.getElementById('authError');
                    if (errEl) errEl.textContent = d.error;
                }
            } catch (err) {}
        };
    }

    var resetForm = document.getElementById('resetPasswordForm');
    if (resetForm) {
        resetForm.onsubmit = async function(e) {
            e.preventDefault();
            var f = new FormData(e.target);
            if (f.get('newPassword') !== f.get('confirmNewPassword')) {
                var errEl = document.getElementById('authError');
                if (errEl) errEl.textContent = 'Пароли не совпадают';
                return;
            }
            try {
                var r = await fetch(API + '/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('resetUsername').value,
                        secretAnswer: f.get('secretAnswer'),
                        newPassword: f.get('newPassword')
                    })
                });
                if (r.ok) {
                    toast('Пароль изменён', 'success');
                    document.getElementById('resetPasswordForm').classList.add('hidden');
                    document.getElementById('loginForm').classList.remove('hidden');
                }
            } catch (err) {}
        };
    }

    // Выбор тарифа
    document.querySelectorAll('.tariff-card').forEach(function(c) {
        c.onclick = function() {
            document.querySelectorAll('.tariff-card').forEach(function(x) { x.classList.remove('selected'); });
            this.classList.add('selected');
            selectedMode = this.dataset.mode;
        };
    });

    // Кнопки выбора тарифа
    document.querySelectorAll('.tariff-select-btn').forEach(function(b) {
        b.onclick = function(e) {
            e.stopPropagation();
            if (!selectedMode) {
                toast('Выберите тариф', 'error');
                return;
            }
            if (selectedMode === 'pro') {
                document.querySelector('.tariff-cards').classList.add('hidden');
                document.querySelector('.tariff-header').classList.add('hidden');
                document.querySelector('.tariff-note').classList.add('hidden');
                document.getElementById('walletStepContainer').classList.remove('hidden');
            } else {
                finishOnboarding(false);
            }
        };
    });

    // Кошелёк
    document.querySelectorAll('.wallet-option').forEach(function(o) {
        o.onclick = function() {
            document.querySelectorAll('.wallet-option').forEach(function(w) { w.classList.remove('selected'); });
            this.classList.add('selected');
            selectedWalletType = this.dataset.wallet;
            checkWallet();
        };
    });

    var walletInput = document.getElementById('walletAddressInput');
    if (walletInput) walletInput.oninput = checkWallet;

    function checkWallet() {
        var btn = document.getElementById('finishOnboarding');
        if (btn) btn.disabled = !selectedWalletType || !document.getElementById('walletAddressInput').value.trim();
    }

    var backBtn = document.getElementById('backToTariff');
    if (backBtn) {
        backBtn.onclick = function() {
            document.querySelector('.tariff-cards').classList.remove('hidden');
            document.querySelector('.tariff-header').classList.remove('hidden');
            document.querySelector('.tariff-note').classList.remove('hidden');
            document.getElementById('walletStepContainer').classList.add('hidden');
        };
    }

    var finishBtn = document.getElementById('finishOnboarding');
    if (finishBtn) finishBtn.onclick = function() { finishOnboarding(true); };

    async function finishOnboarding(isPro) {
        try {
            if (isPro) {
                await fetch(API + '/api/user/wallet', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({
                        wallet_address: document.getElementById('walletAddressInput').value.trim(),
                        wallet_type: selectedWalletType
                    })
                });
                userStatus.wallet_connected = true;
                toast('Pro активирован', 'success');
            } else {
                await fetch(API + '/api/user/skip-wallet', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                toast('Базовый тариф активирован', 'success');
            }
            userStatus.first_login = false;
            await loadTrades();
            showAppPage();
        } catch (e) {
            toast('Ошибка активации', 'error');
        }
    }

    // Навигация
    document.querySelectorAll('[data-view]').forEach(function(el) {
        el.onclick = function(e) {
            e.preventDefault();
            switchView(el.dataset.view);
        };
    });

    // Выход
    function logout() {
        localStorage.removeItem('authToken');
        authToken = null; currentUser = null; trades = [];
        showAuthPage();
    }
    var logoutBtn = document.getElementById('headerLogout');
    if (logoutBtn) logoutBtn.onclick = logout;
    var logoutBtn2 = document.getElementById('logoutBtn');
    if (logoutBtn2) logoutBtn2.onclick = logout;

    // Сделки
    var addBtn = document.getElementById('addTradeBtn');
    if (addBtn) addBtn.onclick = addTrade;

    document.querySelectorAll('.type-btn').forEach(function(b) {
        b.onclick = function() {
            document.querySelectorAll('.type-btn').forEach(function(x) { x.classList.remove('active'); });
            this.classList.add('active');
        };
    });

    document.querySelectorAll('.filter-btn').forEach(function(b) {
        b.onclick = function() {
            document.querySelectorAll('.filter-btn').forEach(function(x) { x.classList.remove('active'); });
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderJournal();
        };
    });

    // Настройки
    var toggle = document.getElementById('publicProfileToggle');
    if (toggle) {
        toggle.onchange = async function(e) {
            if (!userStatus.wallet_connected) {
                e.target.checked = false;
                toast('Требуется Pro', 'error');
                return;
            }
            await fetch(API + '/api/user/public', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify({ is_public: e.target.checked })
            });
        };
    }

    var exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) exportBtn.onclick = exportData;
    var importBtn = document.getElementById('importDataBtn');
    if (importBtn) importBtn.onclick = function() { document.getElementById('importFileInput').click(); };
    var importFile = document.getElementById('importFileInput');
    if (importFile) importFile.onchange = importData;
    var clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) clearBtn.onclick = clearAllData;
    var upgradeBtn = document.getElementById('upgradeToProBtn');
    if (upgradeBtn) upgradeBtn.onclick = function() { showTariffPage(); };

    var changeBtn = document.getElementById('changePasswordBtn');
    if (changeBtn) changeBtn.onclick = function() { document.getElementById('changePasswordModal').classList.remove('hidden'); };
    var closeModal = document.getElementById('closeChangePasswordModal');
    if (closeModal) closeModal.onclick = function() { document.getElementById('changePasswordModal').classList.add('hidden'); };

    var changeForm = document.getElementById('changePasswordForm');
    if (changeForm) {
        changeForm.onsubmit = async function(e) {
            e.preventDefault();
            var f = new FormData(e.target);
            if (f.get('newPassword') !== f.get('confirmNewPassword')) {
                document.getElementById('changePasswordError').textContent = 'Пароли не совпадают';
                return;
            }
            try {
                var r = await fetch(API + '/api/user/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({
                        currentPassword: f.get('currentPassword'),
                        newPassword: f.get('newPassword')
                    })
                });
                if (r.ok) {
                    toast('Пароль изменён', 'success');
                    document.getElementById('changePasswordModal').classList.add('hidden');
                }
            } catch (err) {}
        };
    }
}

// ========== СДЕЛКИ ==========
async function loadTrades() {
    try {
        var r = await fetch(API + '/api/trades', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) trades = await r.json();
    } catch (e) {}
}

async function addTrade() {
    if (userStatus.wallet_connected) {
        toast('Pro: ручное добавление отключено', 'error');
        return;
    }
    var p = document.getElementById('pairInput').value.trim();
    var v = parseFloat(document.getElementById('volumeInput').value.replace(',', '.'));
    var isP = document.querySelector('.type-btn.profit').classList.contains('active');
    if (!p || isNaN(v) || v <= 0) return;
    var t = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        pair: p.toUpperCase(),
        volume: v,
        type: isP ? 'profit' : 'loss',
        timestamp: Date.now()
    };
    try {
        var r = await fetch(API + '/api/trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify(t)
        });
        if (r.ok) {
            trades.unshift(t);
            renderJournal();
            document.getElementById('volumeInput').value = '';
            toast('Сделка добавлена', 'success');
        }
    } catch (e) {}
}

async function deleteTrade(id) {
    if (userStatus.wallet_connected) return;
    await fetch(API + '/api/trades/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } });
    trades = trades.filter(function(t) { return t.id !== id; });
    renderJournal();
}
window.deleteTrade = deleteTrade;

function renderJournal() {
    var tb = document.getElementById('tradesList');
    if (!tb) return;
    var f = currentFilter === 'all' ? trades : trades.filter(function(t) { return t.type === currentFilter; });
    if (!f.length) {
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет сделок</td></tr>';
    } else {
        tb.innerHTML = f.map(function(t) {
            var tm = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            var act = userStatus.wallet_connected ? '' : '<button class="icon-btn" onclick="deleteTrade(\'' + t.id + '\')" style="width:28px;height:28px;">🗑️</button>';
            return '<tr><td>' + tm + '</td><td>' + t.pair + '</td><td>' + t.volume.toFixed(2) + '</td><td class="' + (t.type === 'profit' ? 'profit-text' : 'loss-text') + '">' + (t.type === 'profit' ? '+' : '−') + ' $' + t.volume.toFixed(2) + '</td><td>' + act + '</td></tr>';
        }).join('');
    }
    updateStats();
}

function updateStats() {
    var pl = 0, w = 0, maxP = 0, maxL = 0, pS = 0, lS = 0;
    trades.forEach(function(t) {
        if (t.type === 'profit') { pl += t.volume; w++; pS += t.volume; maxP = Math.max(maxP, t.volume); }
        else { pl -= t.volume; lS += t.volume; maxL = Math.max(maxL, t.volume); }
    });
    var wr = trades.length ? (w / trades.length) * 100 : 0;
    var totalPL = document.getElementById('totalPL');
    if (totalPL) totalPL.textContent = (pl >= 0 ? '+' : '−') + '$' + Math.abs(pl).toFixed(2);
    var winRate = document.getElementById('winRate');
    if (winRate) winRate.textContent = wr.toFixed(1) + '%';
    var progress = document.getElementById('winRateProgress');
    if (progress) progress.style.width = wr + '%';
    var totalTrades = document.getElementById('totalTradesCount');
    if (totalTrades) totalTrades.textContent = trades.length;
    var winCount = document.getElementById('winCount');
    if (winCount) winCount.textContent = w + ' LONG';
    var lossCount = document.getElementById('lossCount');
    if (lossCount) lossCount.textContent = (trades.length - w) + ' SHORT';
    if (trades.length) {
        var lst = trades[0];
        var plChange = document.getElementById('plChange');
        if (plChange) plChange.textContent = (lst.type === 'profit' ? '+' : '-') + '$' + lst.volume.toFixed(2);
    }
    var avgProfit = document.getElementById('avgProfit');
    if (avgProfit) avgProfit.textContent = '$' + (w ? pS / w : 0).toFixed(2);
    var avgLoss = document.getElementById('avgLoss');
    if (avgLoss) avgLoss.textContent = '$' + ((trades.length - w) ? lS / (trades.length - w) : 0).toFixed(2);
    var bestTrade = document.getElementById('bestTrade');
    if (bestTrade) bestTrade.textContent = '$' + maxP.toFixed(2);
    var worstTrade = document.getElementById('worstTrade');
    if (worstTrade) worstTrade.textContent = '$' + maxL.toFixed(2);
}

function updateCharts() {
    if (!trades.length) return;
    var ctx1 = document.getElementById('plChart')?.getContext('2d');
    if (ctx1) {
        if (plChart) plChart.destroy();
        var s = [].concat(trades).sort(function(a, b) { return a.timestamp - b.timestamp; });
        var cum = 0, data = [], labels = [];
        s.forEach(function(t) {
            cum += t.type === 'profit' ? t.volume : -t.volume;
            data.push(cum);
            labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
        });
        plChart = new Chart(ctx1, {
            type: 'line',
            data: { labels: labels.slice(-50), datasets: [{ data: data.slice(-50), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
    var ctx2 = document.getElementById('ratioChart')?.getContext('2d');
    if (ctx2) {
        if (ratioChart) ratioChart.destroy();
        var w = trades.filter(function(t) { return t.type === 'profit'; }).length;
        var l = trades.length - w;
        ratioChart = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: ['LONG', 'SHORT'], datasets: [{ data: [w, l], backgroundColor: ['#10b981', '#ef4444'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        var profitPercent = document.getElementById('profitPercent');
        if (profitPercent) profitPercent.textContent = trades.length ? ((w / trades.length) * 100).toFixed(1) + '%' : '0%';
        var lossPercent = document.getElementById('lossPercent');
        if (lossPercent) lossPercent.textContent = trades.length ? ((l / trades.length) * 100).toFixed(1) + '%' : '0%';
    }
}

function updateDate() {
    var el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function updateProfile() {
    if (!currentUser) return;
    var headerUser = document.getElementById('headerUsername');
    if (headerUser) headerUser.textContent = currentUser.username;
    var profileUser = document.getElementById('profileUsername');
    if (profileUser) profileUser.textContent = currentUser.username;
    var tariffName = document.getElementById('tariffName');
    if (tariffName) tariffName.textContent = userStatus.wallet_connected ? 'Pro' : 'Базовый';
    var tariffPrice = document.getElementById('tariffPrice');
    if (tariffPrice) tariffPrice.textContent = userStatus.wallet_connected ? '500₽/мес' : 'Бесплатно';
    var accountType = document.getElementById('accountTypeDisplay');
    if (accountType) accountType.textContent = userStatus.wallet_connected ? 'Pro' : 'Базовый';
    var toggle = document.getElementById('publicProfileToggle');
    if (toggle) toggle.checked = userStatus.is_public;
}

async function loadPremium() {
    try {
        var r = await fetch(API + '/api/premium/analytics', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) {
            var d = await r.json();
            document.getElementById('profitFactor').textContent = d.profitFactor;
            document.getElementById('sharpeRatio').textContent = d.sharpeRatio;
            document.getElementById('maxDrawdown').textContent = '$' + d.maxDrawdown;
            document.getElementById('monthlyProjection').textContent = '$' + d.monthlyProjection;
            document.getElementById('bestPair').textContent = d.bestPair;
            document.getElementById('worstPair').textContent = d.worstPair;
            document.getElementById('bestDay').textContent = d.bestDay ? d.bestDay.date + ' (+$' + d.bestDay.pl + ')' : '—';
            document.getElementById('worstDay').textContent = d.worstDay ? d.worstDay.date + ' (-$' + Math.abs(d.worstDay.pl) + ')' : '—';
            var recs = [];
            if (d.winRate > 60) recs.push('Отличный винрейт!');
            if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!');
            var recEl = document.getElementById('premiumRecommendations');
            if (recEl) recEl.innerHTML = recs.length ? recs.map(function(r) { return '<p>• ' + r + '</p>'; }).join('') : '<p>Недостаточно данных</p>';
        }
    } catch (e) {}
}

async function loadAdmin() {
    try {
        var r = await fetch(API + '/api/admin/users', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (r.ok) {
            var u = await r.json();
            var tb = document.getElementById('adminUsersList');
            if (tb) {
                tb.innerHTML = u.map(function(u) {
                    return '<tr><td>' + u.id + '</td><td>' + u.username + '</td><td>' + (u.wallet_connected ? '✅' : '❌') + '</td><td>' + (u.trades_count || 0) + '</td><td class="' + (u.total_pl >= 0 ? 'profit-text' : 'loss-text') + '">$' + (u.total_pl ? u.total_pl.toFixed(2) : '0.00') + '</td><td><button class="icon-btn" onclick="deleteAdminUser(' + u.id + ')" style="color:#ef4444;">🗑️</button></td></tr>';
                }).join('');
            }
        }
    } catch (e) {}
}
window.deleteAdminUser = async function(id) {
    if (!confirm('Удалить?')) return;
    await fetch(API + '/api/admin/users/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } });
    loadAdmin();
};

async function loadLeaderboard() {
    var l = document.getElementById('leaderboardLimit')?.value || 25;
    var tb = document.getElementById('leaderboardBody');
    if (!tb) return;
    try {
        var r = await fetch(API + '/api/leaderboard?limit=' + l);
        var d = await r.json();
        tb.innerHTML = d.map(function(r) {
            return '<tr><td>' + r.rank + '</td><td>' + r.username + '</td><td class="' + (r.totalPL >= 0 ? 'profit-text' : 'loss-text') + '">' + (r.totalPL >= 0 ? '+' : '') + '$' + r.totalPL.toFixed(2) + '</td><td>' + r.winRate + '%</td><td>' + r.totalTrades + '</td></tr>';
        }).join('') || '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет данных</td></tr>';
    } catch (e) {}
}

function exportData() {
    var d = { trades: trades, exportDate: new Date().toISOString() };
    var b = new Blob([JSON.stringify(d)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'trades-' + Date.now() + '.json';
    a.click();
    toast('Экспортировано', 'success');
}

function importData(e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = async function(ev) {
        try {
            var d = JSON.parse(ev.target.result);
            if (d.trades && confirm('Импортировать ' + d.trades.length + ' сделок?')) {
                await fetch(API + '/api/trades/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                    body: JSON.stringify({ trades: d.trades })
                });
                await loadTrades();
                renderJournal();
                toast('Импорт завершён', 'success');
            }
        } catch (err) {
            toast('Ошибка чтения файла', 'error');
        }
    };
    r.readAsText(f);
    e.target.value = '';
}

async function clearAllData() {
    if (!confirm('Удалить все сделки?')) return;
    await fetch(API + '/api/trades/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ trades: [] })
    });
    trades = [];
    renderJournal();
    toast('Данные очищены', 'info');
}

// Таймаут для принудительного скрытия прелоадера
setTimeout(function() {
    var p = document.getElementById('preloader');
    if (p && p.style.display !== 'none') {
        p.style.display = 'none';
        var authPage = document.getElementById('authPage');
        if (authPage) authPage.classList.remove('hidden');
        console.log('Прелоадер принудительно скрыт');
    }
}, 5000);