(() => {
    "use strict";

    // ========== STORE (Private) ==========
    const Store = (() => {
        let trades = [];
        let filter = 'all';
        let userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
        let currentUser = null;
        const subscribers = [];

        const notify = () => subscribers.forEach(fn => fn());

        return {
            subscribe(fn) {
                subscribers.push(fn);
                return () => { const i = subscribers.indexOf(fn); if (i >= 0) subscribers.splice(i, 1); };
            },
            getTrades: () => [...trades],
            setTrades(newTrades) {
                trades = [...newTrades].sort((a, b) => b.timestamp - a.timestamp);
                notify();
            },
            addTrade(trade) {
                trades = [trade, ...trades];
                notify();
            },
            removeTrade(id) {
                trades = trades.filter(t => t.id !== id);
                notify();
            },
            getFilter: () => filter,
            setFilter(f) {
                filter = f;
                notify();
            },
            getUserStatus: () => ({ ...userStatus }),
            setUserStatus(s) {
                userStatus = { ...userStatus, ...s };
                notify();
            },
            getCurrentUser: () => currentUser,
            setCurrentUser(u) {
                currentUser = u;
                if (u) userStatus = {
                    wallet_connected: u.wallet_connected || false,
                    is_public: u.is_public || false,
                    first_login: u.first_login ?? true,
                    is_admin: u.is_admin || false
                };
                notify();
            },
            getFilteredTrades() {
                return filter === 'all' ? trades : trades.filter(t => t.type === filter);
            },
            getStats() {
                let pl = 0, w = 0, maxP = 0, maxL = 0, pS = 0, lS = 0;
                trades.forEach(t => {
                    if (t.type === 'profit') {
                        pl += t.volume; w++; pS += t.volume;
                        maxP = Math.max(maxP, t.volume);
                    } else {
                        pl -= t.volume; lS += t.volume;
                        maxL = Math.max(maxL, t.volume);
                    }
                });
                const wr = trades.length ? (w / trades.length) * 100 : 0;
                return {
                    totalPL: pl,
                    winRate: wr,
                    totalTrades: trades.length,
                    wins: w,
                    losses: trades.length - w,
                    avgProfit: w ? pS / w : 0,
                    avgLoss: (trades.length - w) ? lS / (trades.length - w) : 0,
                    maxProfit: maxP,
                    maxLoss: maxL
                };
            }
        };
    })();

    // ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ ==========
    let authToken = null;
    let currentView = 'journal';
    let plChart = null;
    let ratioChart = null;
    let selectedMode = null;
    let selectedWalletType = null;
    const API = '';

    // ========== УТИЛИТЫ ==========
    const toast = (msg, type = 'info') => {
        const c = document.getElementById('toastContainer');
        if (!c) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span><span style="cursor:pointer;margin-left:auto;" onclick="this.parentElement.remove()">✕</span>`;
        c.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    };

    const hidePreloader = () => {
        const p = document.getElementById('preloader');
        if (p) p.style.display = 'none';
    };

    const destroyCharts = () => {
        if (plChart) { plChart.destroy(); plChart = null; }
        if (ratioChart) { ratioChart.destroy(); ratioChart = null; }
    };

    const isElementVisible = el => el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

    // ========== ГРАФИКИ ==========
    const updateCharts = () => {
        const plCanvas = document.getElementById('plChart');
        const ratioCanvas = document.getElementById('ratioChart');

        if (!plCanvas || !ratioCanvas) return;
        if (!isElementVisible(plCanvas) || !isElementVisible(ratioCanvas)) return;
        if (!Store.getTrades().length) return;

        const ctx1 = plCanvas.getContext('2d');
        if (plChart) plChart.destroy();

        const sorted = [...Store.getTrades()].sort((a, b) => a.timestamp - b.timestamp);
        let cum = 0;
        const data = [];
        const labels = [];
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
                plugins: { legend: { display: false } }
            }
        });

        const ctx2 = ratioCanvas.getContext('2d');
        if (ratioChart) ratioChart.destroy();

        const wins = Store.getTrades().filter(t => t.type === 'profit').length;
        const losses = Store.getTrades().length - wins;

        ratioChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['LONG', 'SHORT'],
                datasets: [{
                    data: [wins, losses],
                    backgroundColor: ['#10b981', '#ef4444']
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
        if (profitPercent) profitPercent.textContent = Store.getTrades().length ? ((wins / Store.getTrades().length) * 100).toFixed(1) + '%' : '0%';
        if (lossPercent) lossPercent.textContent = Store.getTrades().length ? ((losses / Store.getTrades().length) * 100).toFixed(1) + '%' : '0%';
    };

    let chartFrame = null;
    const scheduleChartUpdate = () => {
        if (chartFrame) cancelAnimationFrame(chartFrame);
        chartFrame = requestAnimationFrame(() => {
            updateCharts();
            chartFrame = null;
        });
    };

    // ========== РЕНДЕРИНГ ==========
    const renderJournal = () => {
        const tb = document.getElementById('tradesList');
        if (!tb) return;

        const filtered = Store.getFilteredTrades();
        if (!filtered.length) {
            tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет сделок</td></tr>';
            return;
        }

        const isPro = Store.getUserStatus().wallet_connected;
        tb.innerHTML = filtered.map(t => {
            const tm = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const act = isPro ? '' : `<button class="icon-btn" data-delete="${t.id}" style="width:28px;height:28px;">🗑️</button>`;
            return `<tr>
                <td>${tm}</td>
                <td>${t.pair}</td>
                <td>${t.volume.toFixed(2)}</td>
                <td class="${t.type === 'profit' ? 'profit-text' : 'loss-text'}">${t.type === 'profit' ? '+' : '−'} $${t.volume.toFixed(2)}</td>
                <td>${act}</td>
            </tr>`;
        }).join('');

        document.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', e => deleteTrade(e.target.dataset.delete));
        });
    };

    const updateStats = () => {
        const s = Store.getStats();

        const totalPL = document.getElementById('totalPL');
        if (totalPL) totalPL.textContent = `${s.totalPL >= 0 ? '+' : '−'} $${Math.abs(s.totalPL).toFixed(2)}`;

        const winRate = document.getElementById('winRate');
        if (winRate) winRate.textContent = `${s.winRate.toFixed(1)}%`;

        const progress = document.getElementById('winRateProgress');
        if (progress) progress.style.width = `${s.winRate}%`;

        const totalTrades = document.getElementById('totalTradesCount');
        if (totalTrades) totalTrades.textContent = s.totalTrades;

        const winCount = document.getElementById('winCount');
        if (winCount) winCount.textContent = `${s.wins} LONG`;

        const lossCount = document.getElementById('lossCount');
        if (lossCount) lossCount.textContent = `${s.losses} SHORT`;

        if (Store.getTrades().length) {
            const lst = Store.getTrades()[0];
            const plChange = document.getElementById('plChange');
            if (plChange) plChange.textContent = `${lst.type === 'profit' ? '+' : '-'} $${lst.volume.toFixed(2)}`;
        }

        const avgProfit = document.getElementById('avgProfit');
        if (avgProfit) avgProfit.textContent = `$${s.avgProfit.toFixed(2)}`;

        const avgLoss = document.getElementById('avgLoss');
        if (avgLoss) avgLoss.textContent = `$${s.avgLoss.toFixed(2)}`;

        const bestTrade = document.getElementById('bestTrade');
        if (bestTrade) bestTrade.textContent = `$${s.maxProfit.toFixed(2)}`;

        const worstTrade = document.getElementById('worstTrade');
        if (worstTrade) worstTrade.textContent = `$${s.maxLoss.toFixed(2)}`;
    };

    const renderExtendedAnalytics = () => {
        const pairsEl = document.getElementById('pairsDistribution');
        const heatmapEl = document.getElementById('heatmapContainer');
        if (!pairsEl || !heatmapEl) return;

        const trades = Store.getTrades();
        if (!trades.length) {
            pairsEl.innerHTML = '<p style="color:#71717a;text-align:center;">Нет данных</p>';
            heatmapEl.innerHTML = '<p style="color:#71717a;text-align:center;">Нет данных</p>';
            return;
        }

        const pairs = {};
        trades.forEach(t => pairs[t.pair] = (pairs[t.pair] || 0) + 1);
        const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const max = sorted[0]?.[1] || 1;
        pairsEl.innerHTML = sorted.map(([p, c]) => `
            <div class="pair-item">
                <span class="pair-name">${p}</span>
                <div class="pair-bar"><div class="pair-bar-fill" style="width: ${(c / max) * 100}%"></div></div>
                <span class="pair-count">${c}</span>
            </div>
        `).join('');

        const days = {};
        const now = Date.now();
        for (let i = 0; i < 28; i++) {
            const d = new Date(now - i * 86400000).toLocaleDateString('ru-RU');
            days[d] = { pl: 0, count: 0 };
        }
        trades.forEach(t => {
            const d = new Date(t.timestamp).toLocaleDateString('ru-RU');
            if (days[d]) {
                days[d].pl += t.type === 'profit' ? t.volume : -t.volume;
                days[d].count++;
            }
        });
        heatmapEl.innerHTML = Object.entries(days).reverse().map(([date, data]) => {
            let cls = 'empty';
            if (data.count) cls = data.pl > 0 ? 'profit' : (data.pl < 0 ? 'loss' : 'neutral');
            return `<div class="heatmap-day ${cls}" title="${date}: ${data.count} сделок, ${data.pl >= 0 ? '+' : ''}$${data.pl.toFixed(2)}"></div>`;
        }).join('');
    };

    const updateProfileDisplay = () => {
        const u = Store.getCurrentUser();
        if (!u) return;
        const s = Store.getUserStatus();

        const headerUser = document.getElementById('headerUsername');
        if (headerUser) headerUser.textContent = u.username;

        const profileUser = document.getElementById('profileUsername');
        if (profileUser) profileUser.textContent = u.username;

        const tariffName = document.getElementById('tariffName');
        if (tariffName) tariffName.textContent = s.wallet_connected ? 'Pro' : 'Базовый';

        const tariffPrice = document.getElementById('tariffPrice');
        if (tariffPrice) tariffPrice.textContent = s.wallet_connected ? '500₽/мес' : 'Бесплатно';

        const accountType = document.getElementById('accountTypeDisplay');
        if (accountType) accountType.textContent = s.wallet_connected ? 'Pro' : 'Базовый';

        const toggle = document.getElementById('publicProfileToggle');
        if (toggle) toggle.checked = s.is_public;

        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !s.is_admin));
    };

    // Подписка на изменения Store
    Store.subscribe(() => {
        renderJournal();
        updateStats();
        updateProfileDisplay();
        scheduleChartUpdate();
        renderExtendedAnalytics();
    });

    // ========== API ==========
    const loadTrades = async () => {
        if (!authToken) return;
        try {
            const r = await fetch(API + '/api/trades', { headers: { 'Authorization': 'Bearer ' + authToken } });
            if (r.ok) Store.setTrades(await r.json());
        } catch (e) {
            console.error('loadTrades failed', e);
        }
    };

    const addTrade = async () => {
        if (Store.getUserStatus().wallet_connected) {
            toast('Pro: ручное добавление отключено', 'error');
            return;
        }
        const p = document.getElementById('pairInput')?.value.trim();
        const v = parseFloat(document.getElementById('volumeInput')?.value.replace(',', '.'));
        const isP = document.querySelector('.type-btn.profit')?.classList.contains('active');
        if (!p || isNaN(v) || v <= 0) return;

        const t = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            pair: p.toUpperCase(),
            volume: v,
            type: isP ? 'profit' : 'loss',
            timestamp: Date.now()
        };

        Store.addTrade(t);
        document.getElementById('volumeInput').value = '';
        toast('Сделка добавлена', 'success');

        try {
            const r = await fetch(API + '/api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                body: JSON.stringify(t)
            });
            if (!r.ok) {
                Store.removeTrade(t.id);
                toast('Ошибка сохранения', 'error');
            }
        } catch {
            Store.removeTrade(t.id);
            toast('Нет соединения', 'error');
        }
    };

    const deleteTrade = async id => {
        if (Store.getUserStatus().wallet_connected) {
            toast('Pro: удаление отключено', 'error');
            return;
        }
        Store.removeTrade(id);
        toast('Сделка удалена', 'info');

        try {
            await fetch(API + '/api/trades/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } });
        } catch {
            toast('Ошибка синхронизации', 'error');
            await loadTrades();
        }
    };

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    const checkAuth = () => {
        const t = localStorage.getItem('authToken');
        if (t) {
            authToken = t;
            fetchProfile();
        } else {
            hidePreloader();
            showAuthPage();
        }
    };

    const fetchProfile = async () => {
        try {
            const r = await fetch(API + '/api/user/profile', { headers: { 'Authorization': 'Bearer ' + authToken } });
            if (r.ok) {
                const u = await r.json();
                Store.setCurrentUser(u);
                hidePreloader();
                if (u.first_login) showTariffPage();
                else { await loadTrades(); showAppPage(); }
            } else {
                localStorage.removeItem('authToken');
                hidePreloader();
                showAuthPage();
            }
        } catch {
            hidePreloader();
            showAuthPage();
        }
    };

    const showAuthPage = () => {
        hideAll();
        document.getElementById('authPage')?.classList.remove('hidden');
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
        document.getElementById('loginForm')?.classList.remove('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        document.getElementById('forgotPasswordForm')?.classList.add('hidden');
        document.getElementById('resetPasswordForm')?.classList.add('hidden');
    };

    const showTariffPage = () => {
        hideAll();
        document.getElementById('tariffPage')?.classList.remove('hidden');
        selectedMode = selectedWalletType = null;
        document.querySelectorAll('.tariff-card').forEach(c => c.classList.remove('selected'));
        document.querySelector('.tariff-cards')?.classList.remove('hidden');
        document.querySelector('.tariff-header')?.classList.remove('hidden');
        document.querySelector('.tariff-note')?.classList.remove('hidden');
        document.getElementById('walletStepContainer')?.classList.add('hidden');
    };

    const showAppPage = () => {
        hideAll();
        document.getElementById('appPage')?.classList.remove('hidden');
        const el = document.getElementById('currentDate');
        if (el) el.textContent = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        switchView('journal');
    };

    const hideAll = () => {
        ['authPage', 'tariffPage', 'appPage'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    };

    const switchView = v => {
        const s = Store.getUserStatus();
        if (v === 'premium' && !s.wallet_connected && !s.is_admin) {
            toast('Требуется Pro', 'error');
            return;
        }
        if (v === 'admin' && !s.is_admin) {
            toast('Доступ запрещён', 'error');
            return;
        }

        currentView = v;
        document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));
        document.getElementById(v + 'View')?.classList.remove('hidden');

        document.querySelectorAll('.menu-link').forEach(l => {
            l.classList.remove('active');
            if (l.dataset.view === v) l.classList.add('active');
        });

        if (v === 'leaderboard') {
            if (!s.wallet_connected && !s.is_admin) {
                switchView('settings');
                return;
            }
            loadLeaderboard();
        }
        if (v === 'analytics') {
            destroyCharts();
            requestAnimationFrame(scheduleChartUpdate);
        }
        if (v === 'premium') loadPremium();
        if (v === 'admin') loadAdmin();
    };

    // ========== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ==========
    const setupDelegation = () => {
        document.addEventListener('click', e => {
            const link = e.target.closest('[data-view]');
            if (link) { e.preventDefault(); switchView(link.dataset.view); }

            if (e.target.closest('#headerLogout') || e.target.closest('#logoutBtn')) {
                localStorage.removeItem('authToken');
                authToken = null;
                Store.setCurrentUser(null);
                Store.setTrades([]);
                showAuthPage();
            }

            if (e.target.closest('#addTradeBtn')) addTrade();

            if (e.target.closest('.type-btn')) {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.type-btn').classList.add('active');
            }

            if (e.target.closest('.filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                const btn = e.target.closest('.filter-btn');
                btn.classList.add('active');
                Store.setFilter(btn.dataset.filter);
            }

            if (e.target.id === 'forgotPasswordLink') {
                e.preventDefault();
                document.getElementById('loginForm')?.classList.add('hidden');
                document.getElementById('forgotPasswordForm')?.classList.remove('hidden');
            }

            if (e.target.id === 'backToLoginLink' || e.target.id === 'backToLoginFromReset') {
                e.preventDefault();
                document.getElementById('loginForm')?.classList.remove('hidden');
                document.getElementById('forgotPasswordForm')?.classList.add('hidden');
                document.getElementById('resetPasswordForm')?.classList.add('hidden');
            }

            if (e.target.closest('#changePasswordBtn')) {
                document.getElementById('changePasswordModal')?.classList.remove('hidden');
            }

            if (e.target.closest('#closeChangePasswordModal')) {
                document.getElementById('changePasswordModal')?.classList.add('hidden');
            }

            if (e.target.closest('#exportDataBtn')) exportData();
            if (e.target.closest('#importDataBtn')) document.getElementById('importFileInput')?.click();
            if (e.target.closest('#clearDataBtn')) clearAllData();
            if (e.target.closest('#upgradeToProBtn')) showTariffPage();
        });

        document.addEventListener('change', async e => {
            if (e.target.id === 'publicProfileToggle') {
                if (!Store.getUserStatus().wallet_connected) {
                    e.target.checked = false;
                    toast('Требуется Pro', 'error');
                } else {
                    await fetch(API + '/api/user/public', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                        body: JSON.stringify({ is_public: e.target.checked })
                    });
                    Store.setUserStatus({ is_public: e.target.checked });
                }
            }
            if (e.target.id === 'leaderboardLimit') loadLeaderboard();
        });

        document.addEventListener('submit', async e => {
            e.preventDefault();

            if (e.target.id === 'loginForm') {
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
                        d.user.first_login ? showTariffPage() : (await loadTrades(), showAppPage());
                    } else {
                        document.getElementById('authError').textContent = d.error;
                    }
                } catch {
                    document.getElementById('authError').textContent = 'Ошибка соединения';
                }
            }

            if (e.target.id === 'registerForm') {
                const f = new FormData(e.target);
                if (f.get('password') !== f.get('confirmPassword')) {
                    document.getElementById('authError').textContent = 'Пароли не совпадают';
                    return;
                }
                try {
                    const r = await fetch(API + '/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: f.get('username'),
                            password: f.get('password'),
                            secretQuestion: f.get('secretQuestion'),
                            secretAnswer: f.get('secretAnswer')
                        })
                    });
                    const d = await r.json();
                    if (r.ok) {
                        authToken = d.token;
                        Store.setCurrentUser(d.user);
                        localStorage.setItem('authToken', authToken);
                        toast('Регистрация успешна', 'success');
                        showTariffPage();
                    } else {
                        document.getElementById('authError').textContent = d.error;
                    }
                } catch {
                    document.getElementById('authError').textContent = 'Ошибка соединения';
                }
            }

            if (e.target.id === 'forgotPasswordForm') {
                const u = e.target.querySelector('[name="forgotUsername"]').value;
                try {
                    const r = await fetch(API + '/api/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: u })
                    });
                    const d = await r.json();
                    if (r.ok) {
                        document.getElementById('resetUsername').value = u;
                        document.getElementById('secretQuestionLabel').textContent = d.secretQuestion;
                        document.getElementById('forgotPasswordForm').classList.add('hidden');
                        document.getElementById('resetPasswordForm').classList.remove('hidden');
                    } else {
                        document.getElementById('authError').textContent = d.error;
                    }
                } catch {}
            }

            if (e.target.id === 'resetPasswordForm') {
                const f = new FormData(e.target);
                if (f.get('newPassword') !== f.get('confirmNewPassword')) {
                    document.getElementById('authError').textContent = 'Пароли не совпадают';
                    return;
                }
                try {
                    const r = await fetch(API + '/api/auth/reset-password', {
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
                } catch {}
            }

            if (e.target.id === 'changePasswordForm') {
                const f = new FormData(e.target);
                if (f.get('newPassword') !== f.get('confirmNewPassword')) {
                    document.getElementById('changePasswordError').textContent = 'Пароли не совпадают';
                    return;
                }
                try {
                    const r = await fetch(API + '/api/user/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                        body: JSON.stringify({ currentPassword: f.get('currentPassword'), newPassword: f.get('newPassword') })
                    });
                    if (r.ok) {
                        toast('Пароль изменён', 'success');
                        document.getElementById('changePasswordModal')?.classList.add('hidden');
                    }
                } catch {}
            }
        });

        // Выбор тарифа
        document.querySelector('.tariff-cards')?.addEventListener('click', e => {
            const card = e.target.closest('.tariff-card');
            if (card) {
                document.querySelectorAll('.tariff-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedMode = card.dataset.mode;
            }
            if (e.target.classList.contains('tariff-select-btn')) {
                if (!selectedMode) { toast('Выберите тариф', 'error'); return; }
                if (selectedMode === 'pro') {
                    document.querySelector('.tariff-cards')?.classList.add('hidden');
                    document.querySelector('.tariff-header')?.classList.add('hidden');
                    document.querySelector('.tariff-note')?.classList.add('hidden');
                    document.getElementById('walletStepContainer')?.classList.remove('hidden');
                } else {
                    finishOnboarding(false);
                }
            }
        });

        // Кошелёк
        document.querySelector('.wallet-options')?.addEventListener('click', e => {
            const opt = e.target.closest('.wallet-option');
            if (opt) {
                document.querySelectorAll('.wallet-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedWalletType = opt.dataset.wallet;
                const btn = document.getElementById('finishOnboarding');
                if (btn) btn.disabled = !document.getElementById('walletAddressInput')?.value.trim();
            }
        });

        document.getElementById('walletAddressInput')?.addEventListener('input', function() {
            const btn = document.getElementById('finishOnboarding');
            if (btn) btn.disabled = !selectedWalletType || !this.value.trim();
        });

        document.getElementById('backToTariff')?.addEventListener('click', () => {
            document.querySelector('.tariff-cards')?.classList.remove('hidden');
            document.querySelector('.tariff-header')?.classList.remove('hidden');
            document.querySelector('.tariff-note')?.classList.remove('hidden');
            document.getElementById('walletStepContainer')?.classList.add('hidden');
        });

        document.getElementById('finishOnboarding')?.addEventListener('click', () => finishOnboarding(true));

        // Импорт
        document.getElementById('importFileInput')?.addEventListener('change', importData);
    };

    const finishOnboarding = async isPro => {
        try {
            if (isPro) {
                await fetch(API + '/api/user/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                    body: JSON.stringify({
                        wallet_address: document.getElementById('walletAddressInput').value.trim(),
                        wallet_type: selectedWalletType
                    })
                });
                Store.setUserStatus({ wallet_connected: true });
                toast('Pro активирован', 'success');
            } else {
                await fetch(API + '/api/user/skip-wallet', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                toast('Базовый тариф', 'success');
            }
            Store.setUserStatus({ first_login: false });
            await loadTrades();
            showAppPage();
        } catch {
            toast('Ошибка', 'error');
        }
    };

    // ========== ЗАГРУЗКА ДАННЫХ ==========
    const loadPremium = async () => {
        try {
            const r = await fetch(API + '/api/premium/analytics', { headers: { 'Authorization': 'Bearer ' + authToken } });
            if (r.ok) {
                const d = await r.json();
                Object.entries({
                    profitFactor: d.profitFactor,
                    sharpeRatio: d.sharpeRatio,
                    maxDrawdown: '$' + d.maxDrawdown,
                    monthlyProjection: '$' + d.monthlyProjection,
                    bestPair: d.bestPair,
                    worstPair: d.worstPair
                }).forEach(([id, v]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = v;
                });
                const bestDay = document.getElementById('bestDay');
                if (bestDay) bestDay.textContent = d.bestDay ? `${d.bestDay.date} (+$${d.bestDay.pl})` : '—';
                const worstDay = document.getElementById('worstDay');
                if (worstDay) worstDay.textContent = d.worstDay ? `${d.worstDay.date} (-$${Math.abs(d.worstDay.pl)})` : '—';

                const recs = [];
                if (d.winRate > 60) recs.push('Отличный винрейт!');
                if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отлично!');
                const recEl = document.getElementById('premiumRecommendations');
                if (recEl) recEl.innerHTML = recs.length ? recs.map(r => `<p>• ${r}</p>`).join('') : '<p>Недостаточно данных</p>';
            }
        } catch {}
    };

    const loadAdmin = async () => {
        try {
            const r = await fetch(API + '/api/admin/users', { headers: { 'Authorization': 'Bearer ' + authToken } });
            if (r.ok) {
                const u = await r.json();
                const tb = document.getElementById('adminUsersList');
                if (tb) {
                    tb.innerHTML = u.map(u => `<tr>
                        <td>${u.id}</td><td>${u.username}</td><td>${u.wallet_connected ? '✅' : '❌'}</td>
                        <td>${u.trades_count || 0}</td>
                        <td class="${u.total_pl >= 0 ? 'profit-text' : 'loss-text'}">$${u.total_pl?.toFixed(2) || '0.00'}</td>
                        <td><button class="icon-btn" data-delete-admin="${u.id}" style="color:#ef4444;">🗑️</button></td>
                    </tr>`).join('');
                    document.querySelectorAll('[data-delete-admin]').forEach(b => {
                        b.addEventListener('click', async e => {
                            if (!confirm('Удалить?')) return;
                            await fetch(API + '/api/admin/users/' + b.dataset.deleteAdmin, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } });
                            loadAdmin();
                        });
                    });
                }
            }
        } catch {}
    };

    const loadLeaderboard = async () => {
        const l = document.getElementById('leaderboardLimit')?.value || 25;
        const tb = document.getElementById('leaderboardBody');
        if (!tb) return;
        try {
            const r = await fetch(API + '/api/leaderboard?limit=' + l);
            const d = await r.json();
            tb.innerHTML = d.map(r => `<tr>
                <td>${r.rank}</td><td>${r.username}</td>
                <td class="${r.totalPL >= 0 ? 'profit-text' : 'loss-text'}">${r.totalPL >= 0 ? '+' : ''}$${r.totalPL.toFixed(2)}</td>
                <td>${r.winRate}%</td><td>${r.totalTrades}</td>
            </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет данных</td></tr>';
        } catch {}
    };

    // ========== ЭКСПОРТ/ИМПОРТ ==========
    const exportData = () => {
        const d = { trades: Store.getTrades(), exportDate: new Date().toISOString() };
        const b = new Blob([JSON.stringify(d)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'trades-' + Date.now() + '.json';
        a.click();
        toast('Экспортировано', 'success');
    };

    const importData = e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = async ev => {
            try {
                const d = JSON.parse(ev.target.result);
                if (d.trades && confirm('Импортировать ' + d.trades.length + ' сделок?')) {
                    await fetch(API + '/api/trades/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                        body: JSON.stringify({ trades: d.trades })
                    });
                    await loadTrades();
                    toast('Импорт завершён', 'success');
                }
            } catch {
                toast('Ошибка чтения файла', 'error');
            }
        };
        r.readAsText(f);
        e.target.value = '';
    };

    const clearAllData = async () => {
        if (!confirm('Удалить все сделки?')) return;
        await fetch(API + '/api/trades/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify({ trades: [] })
        });
        Store.setTrades([]);
        toast('Данные очищены', 'info');
    };

    // Старт
    document.addEventListener('DOMContentLoaded', () => {
        checkAuth();
        setupDelegation();
    });

    setTimeout(() => {
        const p = document.getElementById('preloader');
        if (p && p.style.display !== 'none') {
            p.style.display = 'none';
            document.getElementById('authPage')?.classList.remove('hidden');
        }
    }, 5000);
})();