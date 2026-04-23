(() => {
    "use strict";

    // ========== КОНСТАНТЫ И УТИЛИТЫ ==========
    const API = '';
    const WALLET_VALIDATION_REGEX = /^[a-zA-Z0-9]{5,}$/;
    const DEBOUNCE_DELAY = 300;
    const MAX_RETRIES = 2;

    const escapeHtml = (text) => {
        if (!text && text !== 0) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    };

    const toast = (msg, type = 'info') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toastEl = document.createElement('div');
        toastEl.className = `toast ${type}`;
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
        toastEl.innerHTML = `
            <span>${icon}</span>
            <span style="flex:1;">${escapeHtml(msg)}</span>
            <span class="toast-close" style="cursor:pointer;opacity:0.7;">✕</span>
        `;
        toastEl.querySelector('.toast-close').addEventListener('click', () => toastEl.remove());
        container.appendChild(toastEl);
        setTimeout(() => {
            if (toastEl.isConnected) toastEl.remove();
        }, 4000);
    };

    const safeLocalStorage = {
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value !== null ? value : defaultValue;
            } catch { return defaultValue; }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch { return false; }
        },
        getJSON(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch { return defaultValue; }
        },
        setJSON(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch { return false; }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch { /* ignore */ }
        }
    };

    const disableButton = (btn, ms = DEBOUNCE_DELAY) => {
        if (!btn || btn.disabled) return;
        btn.disabled = true;
        setTimeout(() => { btn.disabled = false; }, ms);
    };

    const isElementVisible = (el) => {
        return el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    };

    // ========== API HELPER ==========
    const apiFetch = async (url, options = {}, retries = MAX_RETRIES) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = safeLocalStorage.get('authToken');
        if (token && headers['Authorization'] === undefined) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const fetchOptions = {
            ...options,
            headers,
            credentials: 'same-origin'
        };

        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(API + url, fetchOptions);

                if (response.status === 401) {
                    Store.setAuthToken(null);
                    safeLocalStorage.remove('authToken');
                    showAuthPage();
                    throw new Error('Unauthorized');
                }

                return response;
            } catch (error) {
                if (i === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    };

    // ========== STORE ==========
    const Store = (() => {
        let trades = [];
        let filter = 'all';
        let userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
        let currentUser = null;
        let authToken = null;
        const subscribers = [];

        const notify = () => {
            subscribers.forEach(fn => {
                try { fn(); } catch (e) { console.error('Store subscriber error:', e); }
            });
        };

        return {
            subscribe(fn) {
                subscribers.push(fn);
                return () => {
                    const i = subscribers.indexOf(fn);
                    if (i >= 0) subscribers.splice(i, 1);
                };
            },
            getAuthToken: () => authToken,
            setAuthToken: (token) => {
                authToken = token;
                if (token) {
                    safeLocalStorage.set('authToken', token);
                } else {
                    safeLocalStorage.remove('authToken');
                }
            },
            getTrades: () => [...trades],
            setTrades(newTrades) {
                trades = Array.isArray(newTrades)
                    ? [...newTrades].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    : [];
                notify();
            },
            addTrade(trade) {
                if (!trade || !trade.id) return;
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
                if (u) {
                    userStatus = {
                        wallet_connected: u.wallet_connected || false,
                        is_public: u.is_public || false,
                        first_login: u.first_login ?? true,
                        is_admin: u.is_admin || false
                    };
                }
                notify();
            },
            getFilteredTrades() {
                return filter === 'all'
                    ? trades
                    : trades.filter(t => t.type === filter);
            },
            getStats() {
                let pl = 0, w = 0, maxP = 0, maxL = 0, pS = 0, lS = 0;
                trades.forEach(t => {
                    if (t.type === 'profit') {
                        pl += t.volume;
                        w++;
                        pS += t.volume;
                        maxP = Math.max(maxP, t.volume);
                    } else {
                        pl -= t.volume;
                        lS += t.volume;
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
            },
            reset: () => {
                trades = [];
                filter = 'all';
                userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
                currentUser = null;
                authToken = null;
                safeLocalStorage.remove('authToken');
                safeLocalStorage.remove('pro_activated');
                safeLocalStorage.remove('wallet_verified');
                notify();
            }
        };
    })();

    // ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
    let plChart = null;
    let ratioChart = null;
    let selectedMode = null;
    let selectedWalletType = null;
    let sortableInstance = null;
    let chartFrame = null;
    let isSubmitting = false;

    // ========== ГРАФИКИ ==========
    const destroyCharts = () => {
        if (plChart) { plChart.destroy(); plChart = null; }
        if (ratioChart) { ratioChart.destroy(); ratioChart = null; }
    };

    const updateCharts = () => {
        const plCanvas = document.getElementById('plChart');
        const ratioCanvas = document.getElementById('ratioChart');
        if (!plCanvas || !ratioCanvas) return;
        if (!isElementVisible(plCanvas) || !isElementVisible(ratioCanvas)) return;

        const trades = Store.getTrades();
        if (!trades.length) {
            destroyCharts();
            return;
        }

        destroyCharts();

        const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
        let cum = 0;
        const data = [];
        const labels = [];
        sorted.forEach(t => {
            cum += t.type === 'profit' ? t.volume : -t.volume;
            data.push(cum);
            labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }));
        });

        plChart = new Chart(plCanvas, {
            type: 'line',
            data: {
                labels: labels.slice(-50),
                datasets: [{
                    data: data.slice(-50),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        const wins = trades.filter(t => t.type === 'profit').length;
        const losses = trades.length - wins;

        ratioChart = new Chart(ratioCanvas, {
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
                plugins: { legend: { display: false } },
                cutout: '60%'
            }
        });

        const profitPercent = document.getElementById('profitPercent');
        const lossPercent = document.getElementById('lossPercent');
        if (profitPercent) profitPercent.textContent = trades.length
            ? ((wins / trades.length) * 100).toFixed(1) + '%'
            : '0%';
        if (lossPercent) lossPercent.textContent = trades.length
            ? ((losses / trades.length) * 100).toFixed(1) + '%'
            : '0%';
    };

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
            tb.innerHTML = `<tr><td colspan="5" class="empty-state">Нет сделок</td></tr>`;
            return;
        }

        const isPro = Store.getUserStatus().wallet_connected;
        tb.innerHTML = filtered.map(t => {
            const tm = new Date(t.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const deleteBtn = isPro
                ? ''
                : `<button class="icon-btn" data-delete="${escapeHtml(t.id)}" aria-label="Удалить">🗑️</button>`;
            return `<tr>
                <td>${tm}</td>
                <td>${escapeHtml(t.pair)}</td>
                <td>${t.volume.toFixed(2)}</td>
                <td class="${t.type === 'profit' ? 'profit-text' : 'loss-text'}">
                    ${t.type === 'profit' ? '+' : '−'} $${t.volume.toFixed(2)}
                </td>
                <td>${deleteBtn}</td>
            </tr>`;
        }).join('');

        tb.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTrade(btn.dataset.delete);
            });
        });
    };

    const updateStats = () => {
        const s = Store.getStats();
        const trades = Store.getTrades();

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('totalPL', `${s.totalPL >= 0 ? '+' : '−'} $${Math.abs(s.totalPL).toFixed(2)}`);
        setText('winRate', `${s.winRate.toFixed(1)}%`);

        const progress = document.getElementById('winRateProgress');
        if (progress) progress.style.width = `${s.winRate}%`;

        setText('totalTradesCount', String(s.totalTrades));
        setText('winCount', `${s.wins} LONG`);
        setText('lossCount', `${s.losses} SHORT`);

        if (trades.length) {
            const lst = trades[0];
            setText('plChange', `${lst.type === 'profit' ? '+' : '-'} $${lst.volume.toFixed(2)}`);
        } else {
            setText('plChange', '—');
        }

        setText('avgProfit', `$${s.avgProfit.toFixed(2)}`);
        setText('avgLoss', `$${s.avgLoss.toFixed(2)}`);
        setText('bestTrade', `$${s.maxProfit.toFixed(2)}`);
        setText('worstTrade', `$${s.maxLoss.toFixed(2)}`);
    };

    const renderExtendedAnalytics = () => {
        const pairsEl = document.getElementById('pairsDistribution');
        const heatmapEl = document.getElementById('heatmapContainer');
        if (!pairsEl || !heatmapEl) return;

        const trades = Store.getTrades();
        if (!trades.length) {
            pairsEl.innerHTML = '<p class="empty-state">Нет данных</p>';
            heatmapEl.innerHTML = '<p class="empty-state" style="grid-column:span 7;">Нет данных</p>';
            return;
        }

        const pairs = {};
        trades.forEach(t => {
            pairs[t.pair] = (pairs[t.pair] || 0) + 1;
        });
        const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const max = sorted[0]?.[1] || 1;

        pairsEl.innerHTML = sorted.map(([p, c]) => `
            <div class="pair-item">
                <span class="pair-name">${escapeHtml(p)}</span>
                <div class="pair-bar">
                    <div class="pair-bar-fill" style="width: ${(c / max) * 100}%"></div>
                </div>
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
            if (data.count) {
                cls = data.pl > 0 ? 'profit' : (data.pl < 0 ? 'loss' : 'neutral');
            }
            return `<div class="heatmap-day ${cls}" title="${date}: ${data.count} сделок, ${data.pl >= 0 ? '+' : ''}$${data.pl.toFixed(2)}"></div>`;
        }).join('');
    };

    const updateProfileDisplay = () => {
        const u = Store.getCurrentUser();
        const s = Store.getUserStatus();
        if (!u) return;

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('headerUsername', u.username);
        setText('profileUsername', u.username);
        setText('tariffName', s.wallet_connected ? 'Pro' : 'Базовый');
        setText('tariffPrice', s.wallet_connected ? '500₽/мес' : 'Бесплатно');

        if (u.wallet_address) {
            setText('profileWalletAddress',
                u.wallet_address.slice(0, 6) + '...' + u.wallet_address.slice(-4)
            );
        } else {
            setText('profileWalletAddress', '—');
        }
        setText('profileWalletType', u.wallet_type || '—');

        const toggle = document.getElementById('publicProfileToggle');
        if (toggle) {
            toggle.checked = s.is_public;
            toggle.disabled = !s.wallet_connected;
        }

        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', !s.is_admin);
        });

        const addBtn = document.getElementById('addTradeBtn');
        const quickAddInputs = document.querySelectorAll('#pairInput, #volumeInput, .type-btn');
        if (addBtn) {
            if (s.wallet_connected) {
                addBtn.disabled = true;
                quickAddInputs.forEach(el => el.disabled = true);
            } else {
                addBtn.disabled = false;
                quickAddInputs.forEach(el => el.disabled = false);
            }
        }

        const disconnectBtn = document.getElementById('disconnectWalletBtn');
        if (disconnectBtn) {
            disconnectBtn.style.display = s.wallet_connected ? 'block' : 'none';
        }

        const upgradeBtn = document.getElementById('upgradeToProBtn');
        if (upgradeBtn) {
            upgradeBtn.style.display = s.wallet_connected ? 'none' : 'block';
        }
    };

    Store.subscribe(() => {
        renderJournal();
        updateStats();
        updateProfileDisplay();
        scheduleChartUpdate();
        renderExtendedAnalytics();
    });

    // ========== API ЗАПРОСЫ ==========
    const loadTrades = async () => {
        try {
            const r = await apiFetch('/api/trades');
            if (r.ok) {
                const data = await r.json();
                Store.setTrades(data);
            }
        } catch (e) {
            console.error('loadTrades failed', e);
        }
    };

    const addTrade = async () => {
        if (isSubmitting) return;
        if (Store.getUserStatus().wallet_connected) {
            toast('Pro: ручное добавление отключено', 'error');
            return;
        }

        const pairInput = document.getElementById('pairInput');
        const volumeInput = document.getElementById('volumeInput');
        const pair = pairInput?.value.trim();
        const volume = parseFloat(volumeInput?.value.replace(',', '.'));
        const activeTypeBtn = document.querySelector('.type-btn.active');
        const isProfit = activeTypeBtn?.classList.contains('profit');

        if (!pair || isNaN(volume) || volume <= 0) {
            toast('Заполните все поля корректно', 'error');
            return;
        }

        isSubmitting = true;
        const addBtn = document.getElementById('addTradeBtn');
        if (addBtn) addBtn.disabled = true;

        const trade = {
            id: crypto.randomUUID(),
            pair: pair.toUpperCase(),
            volume: volume,
            type: isProfit ? 'profit' : 'loss',
            timestamp: Date.now()
        };

        Store.addTrade(trade);
        if (volumeInput) volumeInput.value = '';
        toast('Сделка добавлена', 'success');

        try {
            const r = await apiFetch('/api/trades', {
                method: 'POST',
                body: JSON.stringify(trade)
            });
            if (!r.ok) {
                Store.removeTrade(trade.id);
                const errorData = await r.json().catch(() => ({}));
                toast(errorData.error || 'Ошибка сохранения на сервере', 'error');
            }
        } catch {
            Store.removeTrade(trade.id);
            toast('Нет соединения с сервером', 'error');
        } finally {
            isSubmitting = false;
            if (addBtn) addBtn.disabled = false;
        }
    };

    const deleteTrade = async (id) => {
        if (Store.getUserStatus().wallet_connected) {
            toast('Pro: удаление отключено', 'error');
            return;
        }

        Store.removeTrade(id);
        toast('Сделка удалена', 'info');

        try {
            await apiFetch('/api/trades/' + id, { method: 'DELETE' });
        } catch {
            toast('Ошибка синхронизации', 'error');
            await loadTrades();
        }
    };

    // ========== НАВИГАЦИЯ ==========
    const hideAllPages = () => {
        ['authPage', 'tariffPage', 'appPage'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    };

    const showAuthPage = () => {
        hideAllPages();
        document.getElementById('authPage')?.classList.remove('hidden');

        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');

        document.getElementById('loginForm')?.classList.remove('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        document.getElementById('forgotPasswordForm')?.classList.add('hidden');
        document.getElementById('resetPasswordForm')?.classList.add('hidden');

        const err = document.getElementById('authError');
        if (err) err.textContent = '';
    };

    const showTariffPage = () => {
        hideAllPages();
        document.getElementById('tariffPage')?.classList.remove('hidden');
        selectedMode = null;
        selectedWalletType = null;
        document.querySelectorAll('.tariff-card').forEach(c => c.classList.remove('selected'));
        document.querySelector('.tariff-cards')?.classList.remove('hidden');
        document.querySelector('.tariff-header')?.classList.remove('hidden');
        document.querySelector('.tariff-note')?.classList.remove('hidden');
        document.getElementById('walletStepContainer')?.classList.add('hidden');
        const walletError = document.getElementById('walletError');
        if (walletError) walletError.textContent = '';
    };

    const showAppPage = () => {
        hideAllPages();
        document.getElementById('appPage')?.classList.remove('hidden');
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        }
        switchView('journal');
    };

    const switchView = (view) => {
        const s = Store.getUserStatus();

        if ((view === 'premium' || view === 'leaderboard') && !s.wallet_connected && !s.is_admin) {
            toast('Требуется Pro тариф', 'error');
            return;
        }
        if (view === 'admin' && !s.is_admin) {
            toast('Доступ запрещён', 'error');
            return;
        }

        document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));
        document.getElementById(view + 'View')?.classList.remove('hidden');

        document.querySelectorAll('.menu-link').forEach(l => {
            l.classList.remove('active');
            if (l.dataset.view === view) l.classList.add('active');
        });

        if (view === 'leaderboard') loadLeaderboard();
        if (view === 'analytics') {
            destroyCharts();
            requestAnimationFrame(scheduleChartUpdate);
        }
        if (view === 'premium') loadPremium();
        if (view === 'admin') loadAdmin();
    };

    // ========== ЗАГРУЗКА ДАННЫХ ==========
    const loadPremium = async () => {
        try {
            const r = await apiFetch('/api/premium/analytics');
            if (r.ok) {
                const d = await r.json();
                const setText = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                };

                setText('profitFactor', typeof d.profitFactor === 'number'
                    ? d.profitFactor.toFixed(2) : d.profitFactor);
                setText('sharpeRatio', d.sharpeRatio?.toFixed(2) || '—');
                setText('maxDrawdown', '$' + (d.maxDrawdown?.toFixed(2) || '0.00'));
                setText('monthlyProjection', '$' + (d.monthlyProjection?.toFixed(2) || '0.00'));
                setText('bestPair', d.bestPair || '—');
                setText('worstPair', d.worstPair || '—');

                const bestDay = document.getElementById('bestDay');
                if (bestDay) {
                    bestDay.textContent = d.bestDay
                        ? `${d.bestDay.date} (+$${d.bestDay.pl})`
                        : '—';
                }
                const worstDay = document.getElementById('worstDay');
                if (worstDay) {
                    worstDay.textContent = d.worstDay
                        ? `${d.worstDay.date} (-$${Math.abs(d.worstDay.pl)})`
                        : '—';
                }

                const recs = [];
                if (d.winRate > 60) recs.push('Отличный винрейт! Продолжайте в том же духе.');
                if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отличный результат!');
                if (d.sharpeRatio > 1) recs.push('Sharpe Ratio > 1 — хорошая доходность относительно риска.');
                if (d.maxDrawdown > 500) recs.push('Высокая просадка. Рассмотрите уменьшение размера позиций.');

                const recEl = document.getElementById('premiumRecommendations');
                if (recEl) {
                    recEl.innerHTML = recs.length
                        ? recs.map(r => `<p>• ${r}</p>`).join('')
                        : '<p>Недостаточно данных для рекомендаций</p>';
                }
            }
        } catch (e) {
            console.error('loadPremium failed', e);
        }
    };

    const loadAdmin = async () => {
        try {
            const r = await apiFetch('/api/admin/users');
            if (r.ok) {
                const users = await r.json();
                const tb = document.getElementById('adminUsersList');
                if (tb) {
                    tb.innerHTML = users.map(u => `<tr>
                        <td>${u.id}</td>
                        <td>${escapeHtml(u.username)}</td>
                        <td>${u.wallet_connected ? '✅' : '❌'}</td>
                        <td>${u.trades_count || 0}</td>
                        <td class="${u.total_pl >= 0 ? 'profit-text' : 'loss-text'}">
                            $${(u.total_pl || 0).toFixed(2)}
                        </td>
                        <td>
                            <button class="icon-btn" data-delete-admin="${u.id}"
                                style="color:#ef4444;" aria-label="Удалить">🗑️</button>
                        </td>
                    </tr>`).join('');

                    tb.querySelectorAll('[data-delete-admin]').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            if (!confirm('Удалить пользователя? Все его данные будут потеряны.')) return;
                            try {
                                await apiFetch('/api/admin/users/' + btn.dataset.deleteAdmin, {
                                    method: 'DELETE'
                                });
                                loadAdmin();
                                toast('Пользователь удалён', 'info');
                            } catch {
                                toast('Ошибка удаления', 'error');
                            }
                        });
                    });
                }
            }
        } catch (e) {
            console.error('loadAdmin failed', e);
        }
    };

    const loadLeaderboard = async () => {
        const limit = document.getElementById('leaderboardLimit')?.value || 25;
        const tb = document.getElementById('leaderboardBody');
        if (!tb) return;

        try {
            const r = await apiFetch('/api/leaderboard?limit=' + limit);
            const data = await r.json();
            tb.innerHTML = data.length
                ? data.map(r => `<tr>
                    <td>${r.rank}</td>
                    <td>${escapeHtml(r.username)}</td>
                    <td class="${r.totalPL >= 0 ? 'profit-text' : 'loss-text'}">
                        ${r.totalPL >= 0 ? '+' : ''}$${r.totalPL.toFixed(2)}
                    </td>
                    <td>${r.winRate}%</td>
                    <td>${r.totalTrades}</td>
                </tr>`).join('')
                : '<tr><td colspan="5" class="empty-state">Нет данных</td></tr>';
        } catch (e) {
            console.error('loadLeaderboard failed', e);
        }
    };

    // ========== ЭКСПОРТ/ИМПОРТ ==========
    const exportData = () => {
        const data = {
            trades: Store.getTrades(),
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trades-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Данные экспортированы', 'success');
    };

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.trades || !Array.isArray(data.trades)) {
                    throw new Error('Invalid format');
                }

                if (!confirm(`Импортировать ${data.trades.length} сделок? Текущие данные будут заменены.`)) return;

                const r = await apiFetch('/api/trades/sync', {
                    method: 'POST',
                    body: JSON.stringify({ trades: data.trades })
                });

                if (r.ok) {
                    await loadTrades();
                    const result = await r.json();
                    toast(`Импорт завершён (${result.count} сделок)`, 'success');
                } else {
                    toast('Ошибка импорта', 'error');
                }
            } catch {
                toast('Ошибка чтения файла', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const clearAllData = async () => {
        if (!confirm('Удалить ВСЕ сделки? Это действие нельзя отменить.')) return;

        try {
            await apiFetch('/api/trades/sync', {
                method: 'POST',
                body: JSON.stringify({ trades: [] })
            });
            Store.setTrades([]);
            toast('Данные очищены', 'info');
        } catch {
            toast('Ошибка очистки', 'error');
        }
    };

    // ========== АВТОРИЗАЦИЯ ==========
    const checkAuth = async () => {
        const token = safeLocalStorage.get('authToken');

        if (!token) {
            try {
                const r = await fetch(API + '/api/auth/check', { credentials: 'same-origin' });
                if (r.ok) {
                    const data = await r.json();
                    Store.setCurrentUser(data.user);
                    document.getElementById('preloader').style.display = 'none';
                    if (data.user.first_login) {
                        showTariffPage();
                    } else {
                        await loadTrades();
                        showAppPage();
                    }
                    return;
                }
            } catch { /* нет куки, продолжаем */ }
            document.getElementById('preloader').style.display = 'none';
            showAuthPage();
            return;
        }

        fetchProfile();
    };

    const fetchProfile = async () => {
        try {
            const r = await apiFetch('/api/user/profile');
            if (r.ok) {
                const user = await r.json();
                Store.setCurrentUser(user);
                document.getElementById('preloader').style.display = 'none';

                if (user.first_login) {
                    showTariffPage();
                } else {
                    await loadTrades();
                    showAppPage();
                }
            } else {
                Store.setAuthToken(null);
                document.getElementById('preloader').style.display = 'none';
                showAuthPage();
            }
        } catch {
            document.getElementById('preloader').style.display = 'none';
            showAuthPage();
        }
    };

    const finishOnboarding = async (isPro) => {
        if (isSubmitting) return;
        isSubmitting = true;

        const btn = document.getElementById('finishOnboarding');
        if (btn) btn.disabled = true;

        try {
            if (isPro) {
                const addr = document.getElementById('walletAddressInput')?.value.trim();
                const walletError = document.getElementById('walletError');

                if (!addr || !WALLET_VALIDATION_REGEX.test(addr)) {
                    if (walletError) walletError.textContent = 'Адрес кошелька должен содержать минимум 5 букв/цифр';
                    isSubmitting = false;
                    if (btn) btn.disabled = false;
                    return;
                }

                if (!selectedWalletType) {
                    if (walletError) walletError.textContent = 'Выберите тип кошелька';
                    isSubmitting = false;
                    if (btn) btn.disabled = false;
                    return;
                }

                const r = await apiFetch('/api/user/wallet', {
                    method: 'POST',
                    body: JSON.stringify({
                        wallet_address: addr,
                        wallet_type: selectedWalletType
                    })
                });

                if (r.ok) {
                    const user = Store.getCurrentUser();
                    Store.setCurrentUser({
                        ...user,
                        wallet_connected: true,
                        first_login: false,
                        wallet_address: addr,
                        wallet_type: selectedWalletType
                    });
                    toast('Pro активирован! Добро пожаловать.', 'success');
                    await loadTrades();
                    showAppPage();
                } else {
                    const error = await r.json().catch(() => ({}));
                    toast(error.error || 'Ошибка активации Pro', 'error');
                }
            } else {
                await apiFetch('/api/user/skip-wallet', { method: 'POST' });
                Store.setUserStatus({ wallet_connected: false, first_login: false });
                toast('Базовый тариф активирован', 'success');
                await loadTrades();
                showAppPage();
            }
        } catch (e) {
            toast('Ошибка соединения', 'error');
        } finally {
            isSubmitting = false;
            if (btn) btn.disabled = false;
        }
    };

    const disconnectWallet = async () => {
        if (!confirm('Отключить Pro? Ваши сделки и Pro-возможности будут недоступны.')) return;

        try {
            await apiFetch('/api/user/wallet/disconnect', { method: 'POST' });
            Store.setUserStatus({ wallet_connected: false, is_public: false });
            Store.setCurrentUser({
                ...Store.getCurrentUser(),
                wallet_connected: false,
                wallet_address: null,
                wallet_type: null
            });
            toast('Pro отключён', 'info');
        } catch {
            toast('Ошибка отключения', 'error');
        }
    };

    // ========== ТЕМА И D&D ==========
    const initTheme = () => {
        const saved = safeLocalStorage.get('theme') || 'dark';
        document.body.setAttribute('data-theme', saved);
        const sel = document.getElementById('themeSelect');
        if (sel) sel.value = saved;
    };

    const setTheme = (theme) => {
        document.body.setAttribute('data-theme', theme);
        safeLocalStorage.set('theme', theme);
        if (plChart) {
            destroyCharts();
            scheduleChartUpdate();
        }
    };

    const initDragDrop = () => {
        const grid = document.getElementById('dashboardGrid');
        if (!grid || typeof Sortable === 'undefined') return;
        if (sortableInstance) sortableInstance.destroy();

        sortableInstance = new Sortable(grid, {
            animation: 200,
            handle: '.drag-item',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            easing: "cubic-bezier(1, 0, 0, 1)",
            onEnd: function () {
                const order = [...grid.querySelectorAll('.drag-item')].map(el => el.dataset.id);
                safeLocalStorage.setJSON('dashboardOrder', order);
            }
        });

        const savedOrder = safeLocalStorage.getJSON('dashboardOrder', []);
        if (savedOrder.length) {
            savedOrder.forEach(id => {
                const el = grid.querySelector(`.drag-item[data-id="${id}"]`);
                if (el) grid.appendChild(el);
            });
        }
    };

    // ========== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ==========
    const setupEventDelegation = () => {
        document.addEventListener('click', async (e) => {
            const menuLink = e.target.closest('[data-view]');
            if (menuLink) {
                e.preventDefault();
                switchView(menuLink.dataset.view);
                return;
            }

            if (e.target.closest('#headerLogout') || e.target.closest('#logoutBtn')) {
                try {
                    await apiFetch('/api/auth/logout', { method: 'POST' });
                } catch { /* ignore */ }
                Store.reset();
                showAuthPage();
                return;
            }

            if (e.target.closest('#addTradeBtn')) {
                await addTrade();
                return;
            }

            if (e.target.closest('.type-btn')) {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.type-btn').classList.add('active');
                return;
            }

            if (e.target.closest('.filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                const btn = e.target.closest('.filter-btn');
                btn.classList.add('active');
                Store.setFilter(btn.dataset.filter);
                return;
            }

            if (e.target.closest('.auth-tab')) {
                const tab = e.target.closest('.auth-tab');
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const isLogin = tab.dataset.tab === 'login';
                document.getElementById('loginForm')?.classList.toggle('hidden', !isLogin);
                document.getElementById('registerForm')?.classList.toggle('hidden', isLogin);
                document.getElementById('forgotPasswordForm')?.classList.add('hidden');
                document.getElementById('resetPasswordForm')?.classList.add('hidden');
                const authError = document.getElementById('authError');
                if (authError) authError.textContent = '';
                return;
            }

            if (e.target.id === 'forgotPasswordLink') {
                e.preventDefault();
                document.getElementById('loginForm')?.classList.add('hidden');
                document.getElementById('forgotPasswordForm')?.classList.remove('hidden');
                return;
            }
            if (e.target.id === 'backToLoginLink' || e.target.id === 'backToLoginFromReset') {
                e.preventDefault();
                document.getElementById('loginForm')?.classList.remove('hidden');
                document.getElementById('forgotPasswordForm')?.classList.add('hidden');
                document.getElementById('resetPasswordForm')?.classList.add('hidden');
                return;
            }

            if (e.target.closest('#changePasswordBtn')) {
                document.getElementById('changePasswordModal')?.classList.remove('hidden');
                return;
            }
            if (e.target.closest('#closeChangePasswordModal')) {
                document.getElementById('changePasswordModal')?.classList.add('hidden');
                return;
            }
            if (e.target.closest('#helpBtn')) {
                document.getElementById('helpModal')?.classList.remove('hidden');
                return;
            }
            if (e.target.closest('#closeHelpModal')) {
                document.getElementById('helpModal')?.classList.add('hidden');
                return;
            }

            if (e.target.closest('#exportDataBtn')) {
                exportData();
                return;
            }
            if (e.target.closest('#importDataBtn')) {
                document.getElementById('importFileInput')?.click();
                return;
            }
            if (e.target.closest('#clearDataBtn')) {
                await clearAllData();
                return;
            }
            if (e.target.closest('#upgradeToProBtn')) {
                showTariffPage();
                return;
            }
            if (e.target.closest('#disconnectWalletBtn')) {
                await disconnectWallet();
                return;
            }

            // Выбор тарифа (карточка)
            if (e.target.closest('.tariff-card')) {
                const card = e.target.closest('.tariff-card');
                document.querySelectorAll('.tariff-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedMode = card.dataset.mode;
                return;
            }

            // Кнопка выбора тарифа - ИСПРАВЛЕНО
            if (e.target.closest('.tariff-select-btn')) {
                const btn = e.target.closest('.tariff-select-btn');
                disableButton(btn);
                const mode = btn.dataset.mode;

                if (!mode) {
                    toast('Выберите тариф', 'error');
                    return;
                }

                if (mode === 'pro') {
                    document.querySelector('.tariff-cards')?.classList.add('hidden');
                    document.querySelector('.tariff-header')?.classList.add('hidden');
                    document.querySelector('.tariff-note')?.classList.add('hidden');
                    document.getElementById('walletStepContainer')?.classList.remove('hidden');
                } else {
                    await finishOnboarding(false);
                }
                return;
            }

            if (e.target.closest('.wallet-option')) {
                const opt = e.target.closest('.wallet-option');
                document.querySelectorAll('.wallet-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedWalletType = opt.dataset.wallet;
                const addr = document.getElementById('walletAddressInput');
                const finishBtn = document.getElementById('finishOnboarding');
                if (finishBtn && addr) {
                    finishBtn.disabled = !addr.value.trim() || !WALLET_VALIDATION_REGEX.test(addr.value.trim());
                }
                return;
            }

            if (e.target.closest('#backToTariff')) {
                document.querySelector('.tariff-cards')?.classList.remove('hidden');
                document.querySelector('.tariff-header')?.classList.remove('hidden');
                document.querySelector('.tariff-note')?.classList.remove('hidden');
                document.getElementById('walletStepContainer')?.classList.add('hidden');
                const walletError = document.getElementById('walletError');
                if (walletError) walletError.textContent = '';
                return;
            }

            if (e.target.closest('#finishOnboarding')) {
                await finishOnboarding(true);
                return;
            }
        });

        document.getElementById('walletAddressInput')?.addEventListener('input', function () {
            const addr = this.value.trim();
            const finishBtn = document.getElementById('finishOnboarding');
            const walletError = document.getElementById('walletError');
            if (finishBtn) {
                finishBtn.disabled = !selectedWalletType || !addr || !WALLET_VALIDATION_REGEX.test(addr);
            }
            if (walletError) {
                walletError.textContent = addr && !WALLET_VALIDATION_REGEX.test(addr)
                    ? 'Минимум 5 символов, только буквы и цифры'
                    : '';
            }
        });

        document.addEventListener('change', async (e) => {
            if (e.target.id === 'publicProfileToggle') {
                if (!Store.getUserStatus().wallet_connected) {
                    e.target.checked = false;
                    toast('Требуется Pro тариф', 'error');
                    return;
                }
                try {
                    await apiFetch('/api/user/public', {
                        method: 'POST',
                        body: JSON.stringify({ is_public: e.target.checked })
                    });
                    Store.setUserStatus({ is_public: e.target.checked });
                } catch {
                    e.target.checked = !e.target.checked;
                    toast('Ошибка обновления', 'error');
                }
            }
            if (e.target.id === 'leaderboardLimit') loadLeaderboard();
            if (e.target.id === 'themeSelect') setTheme(e.target.value);
        });

        document.getElementById('importFileInput')?.addEventListener('change', importData);

        document.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) disableButton(submitBtn);

            try {
                if (form.id === 'loginForm') {
                    const fd = new FormData(form);
                    const r = await apiFetch('/api/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({
                            username: fd.get('username'),
                            password: fd.get('password')
                        })
                    });
                    const d = await r.json();
                    if (r.ok) {
                        Store.setAuthToken(d.token);
                        Store.setCurrentUser(d.user);
                        toast('Вход выполнен', 'success');
                        if (d.user.first_login) {
                            showTariffPage();
                        } else {
                            await loadTrades();
                            showAppPage();
                        }
                    } else {
                        document.getElementById('authError').textContent = d.error || 'Ошибка входа';
                    }
                }

                if (form.id === 'registerForm') {
                    const fd = new FormData(form);
                    if (fd.get('password') !== fd.get('confirmPassword')) {
                        document.getElementById('authError').textContent = 'Пароли не совпадают';
                        return;
                    }
                    const r = await apiFetch('/api/auth/register', {
                        method: 'POST',
                        body: JSON.stringify({
                            username: fd.get('username'),
                            password: fd.get('password'),
                            secretQuestion: fd.get('secretQuestion'),
                            secretAnswer: fd.get('secretAnswer')
                        })
                    });
                    const d = await r.json();
                    if (r.ok) {
                        Store.setAuthToken(d.token);
                        Store.setCurrentUser(d.user);
                        toast('Регистрация успешна', 'success');
                        showTariffPage();
                    } else {
                        document.getElementById('authError').textContent = d.error || 'Ошибка регистрации';
                    }
                }

                if (form.id === 'forgotPasswordForm') {
                    const username = form.querySelector('[name="forgotUsername"]').value;
                    const r = await apiFetch('/api/auth/forgot-password', {
                        method: 'POST',
                        body: JSON.stringify({ username })
                    });
                    const d = await r.json();
                    if (r.ok) {
                        document.getElementById('resetUsername').value = username;
                        document.getElementById('secretQuestionLabel').textContent = d.secretQuestion || 'Вопрос не задан';
                        form.classList.add('hidden');
                        document.getElementById('resetPasswordForm').classList.remove('hidden');
                    } else {
                        document.getElementById('authError').textContent = d.error || 'Пользователь не найден';
                    }
                }

                if (form.id === 'resetPasswordForm') {
                    const fd = new FormData(form);
                    if (fd.get('newPassword') !== fd.get('confirmNewPassword')) {
                        document.getElementById('authError').textContent = 'Пароли не совпадают';
                        return;
                    }
                    const r = await apiFetch('/api/auth/reset-password', {
                        method: 'POST',
                        body: JSON.stringify({
                            username: document.getElementById('resetUsername').value,
                            secretAnswer: fd.get('secretAnswer'),
                            newPassword: fd.get('newPassword')
                        })
                    });
                    if (r.ok) {
                        toast('Пароль изменён', 'success');
                        form.classList.add('hidden');
                        document.getElementById('loginForm').classList.remove('hidden');
                    } else {
                        const d = await r.json();
                        document.getElementById('authError').textContent = d.error || 'Ошибка смены пароля';
                    }
                }

                if (form.id === 'changePasswordForm') {
                    const fd = new FormData(form);
                    if (fd.get('newPassword') !== fd.get('confirmNewPassword')) {
                        document.getElementById('changePasswordError').textContent = 'Пароли не совпадают';
                        return;
                    }
                    const r = await apiFetch('/api/user/change-password', {
                        method: 'POST',
                        body: JSON.stringify({
                            currentPassword: fd.get('currentPassword'),
                            newPassword: fd.get('newPassword')
                        })
                    });
                    if (r.ok) {
                        toast('Пароль изменён', 'success');
                        document.getElementById('changePasswordModal')?.classList.add('hidden');
                        form.reset();
                    } else {
                        const d = await r.json();
                        document.getElementById('changePasswordError').textContent = d.error || 'Ошибка';
                    }
                }
            } catch (err) {
                console.error('Form submit error:', err);
                toast('Ошибка соединения', 'error');
            }
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });
    };

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initDragDrop();
        setupEventDelegation();
        checkAuth();
    });

    setTimeout(() => {
        const p = document.getElementById('preloader');
        if (p && p.style.display !== 'none') {
            p.style.display = 'none';
            const authPage = document.getElementById('authPage');
            if (authPage && authPage.classList.contains('hidden')) {
                authPage.classList.remove('hidden');
            }
        }
    }, 5000);
})();