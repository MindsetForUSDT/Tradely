(() => {
    "use strict";

    // ========== КОНСТАНТЫ И УТИЛИТЫ ==========
    const API = '';
    const WALLET_VALIDATION_REGEX = /^[a-zA-Z0-9]{5,}$/;
    const DEBOUNCE_DELAY = 300;

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
        toastEl.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span style="flex:1;">${escapeHtml(msg)}</span>
            <span style="cursor:pointer;opacity:0.7;" class="toast-close">✕</span>
        `;
        toastEl.querySelector('.toast-close').addEventListener('click', () => toastEl.remove());
        container.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 4000);
    };

    const safeLocalStorage = {
        get(key, defaultValue = null) {
            try { const value = localStorage.getItem(key); return value !== null ? value : defaultValue; }
            catch { return defaultValue; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); return true; }
            catch { return false; }
        },
        remove(key) {
            try { localStorage.removeItem(key); }
            catch { }
        }
    };

    // ========== STORE ==========
    const Store = (() => {
        let trades = [];
        let filter = 'all';
        let userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
        let currentUser = null;
        const subscribers = [];

        const notify = () => subscribers.forEach(fn => { try { fn(); } catch (e) {} });

        return {
            subscribe(fn) { subscribers.push(fn); },
            getTrades: () => [...trades],
            setTrades(newTrades) {
                trades = Array.isArray(newTrades) ? [...newTrades].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : [];
                notify();
            },
            addTrade(trade) { if (!trade || !trade.id) return; trades = [trade, ...trades]; notify(); },
            removeTrade(id) { trades = trades.filter(t => t.id !== id); notify(); },
            getFilter: () => filter,
            setFilter(f) { filter = f; notify(); },
            getUserStatus: () => ({ ...userStatus }),
            setUserStatus(s) { userStatus = { ...userStatus, ...s }; notify(); },
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
            getFilteredTrades() { return filter === 'all' ? trades : trades.filter(t => t.type === filter); },
            getStats() {
                let pl = 0, w = 0, maxP = 0, maxL = 0, pS = 0, lS = 0;
                trades.forEach(t => {
                    if (t.type === 'profit') { pl += t.volume; w++; pS += t.volume; maxP = Math.max(maxP, t.volume); }
                    else { pl -= t.volume; lS += t.volume; maxL = Math.max(maxL, t.volume); }
                });
                const wr = trades.length ? (w / trades.length) * 100 : 0;
                return { totalPL: pl, winRate: wr, totalTrades: trades.length, wins: w, losses: trades.length - w, avgProfit: w ? pS / w : 0, avgLoss: (trades.length - w) ? lS / (trades.length - w) : 0, maxProfit: maxP, maxLoss: maxL };
            },
            reset() {
                trades = []; filter = 'all';
                userStatus = { wallet_connected: false, is_public: false, first_login: true, is_admin: false };
                currentUser = null;
                safeLocalStorage.remove('authToken');
                notify();
            }
        };
    })();

    let plChart = null, ratioChart = null, selectedMode = null, selectedWalletType = null, isSubmitting = false;
    let authToken = null;
    let sortableInstance = null;

    // ========== ГРАФИКИ ==========
    const destroyCharts = () => { if (plChart) { plChart.destroy(); plChart = null; } if (ratioChart) { ratioChart.destroy(); ratioChart = null; } };

    const isElementVisible = (el) => el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

    const updateCharts = () => {
        const plCanvas = document.getElementById('plChart');
        const ratioCanvas = document.getElementById('ratioChart');
        if (!plCanvas || !ratioCanvas) return;
        if (!isElementVisible(plCanvas) || !isElementVisible(ratioCanvas)) return;
        const trades = Store.getTrades();
        if (!trades.length) { destroyCharts(); return; }
        destroyCharts();
        const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
        let cum = 0;
        const data = [], labels = [];
        sorted.forEach(t => { cum += t.type === 'profit' ? t.volume : -t.volume; data.push(cum); labels.push(new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })); });
        plChart = new Chart(plCanvas, { type: 'line', data: { labels: labels.slice(-50), datasets: [{ data: data.slice(-50), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true, pointRadius: 2, pointHoverRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } } } });
        const wins = trades.filter(t => t.type === 'profit').length;
        const losses = trades.length - wins;
        ratioChart = new Chart(ratioCanvas, { type: 'doughnut', data: { labels: ['LONG', 'SHORT'], datasets: [{ data: [wins, losses], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' } });
        const pp = document.getElementById('profitPercent'); if (pp) pp.textContent = trades.length ? ((wins / trades.length) * 100).toFixed(1) + '%' : '0%';
        const lp = document.getElementById('lossPercent'); if (lp) lp.textContent = trades.length ? ((losses / trades.length) * 100).toFixed(1) + '%' : '0%';
    };

    let chartFrame = null;
    const scheduleChartUpdate = () => { if (chartFrame) cancelAnimationFrame(chartFrame); chartFrame = requestAnimationFrame(() => { updateCharts(); chartFrame = null; }); };

    // ========== РЕНДЕРИНГ ==========
    const renderJournal = () => {
        const tb = document.getElementById('tradesList');
        if (!tb) return;
        const filtered = Store.getFilteredTrades();
        if (!filtered.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">Нет сделок</td></tr>'; return; }
        const isPro = Store.getUserStatus().wallet_connected;
        tb.innerHTML = filtered.map(t => {
            const tm = new Date(t.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return `<tr><td>${tm}</td><td>${escapeHtml(t.pair)}</td><td>${t.volume.toFixed(2)}</td><td class="${t.type === 'profit' ? 'profit-text' : 'loss-text'}">${t.type === 'profit' ? '+' : '−'} $${t.volume.toFixed(2)}</td><td>${isPro ? '' : `<button class="icon-btn" data-delete="${escapeHtml(t.id)}" style="width:28px;height:28px;">🗑️</button>`}</td></tr>`;
        }).join('');
        tb.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTrade(btn.dataset.delete); }));
    };

    const updateStats = () => {
        const s = Store.getStats();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('totalPL', `${s.totalPL >= 0 ? '+' : '−'} $${Math.abs(s.totalPL).toFixed(2)}`);
        set('winRate', `${s.winRate.toFixed(1)}%`);
        const pr = document.getElementById('winRateProgress'); if (pr) pr.style.width = `${s.winRate}%`;
        set('totalTradesCount', String(s.totalTrades));
        set('winCount', `${s.wins} LONG`);
        set('lossCount', `${s.losses} SHORT`);
        set('avgProfit', `$${s.avgProfit.toFixed(2)}`);
        set('avgLoss', `$${s.avgLoss.toFixed(2)}`);
        set('bestTrade', `$${s.maxProfit.toFixed(2)}`);
        set('worstTrade', `$${s.maxLoss.toFixed(2)}`);
    };

    const renderExtendedAnalytics = () => {
        const pairsEl = document.getElementById('pairsDistribution');
        const heatmapEl = document.getElementById('heatmapContainer');
        if (!pairsEl || !heatmapEl) return;
        const trades = Store.getTrades();
        if (!trades.length) {
            pairsEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Нет данных</p>';
            heatmapEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:span 7;">Нет данных</p>';
            return;
        }
        const pairs = {};
        trades.forEach(t => { pairs[t.pair] = (pairs[t.pair] || 0) + 1; });
        const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const max = sorted[0]?.[1] || 1;
        pairsEl.innerHTML = sorted.map(([p, c]) => `<div class="pair-item"><span class="pair-name">${escapeHtml(p)}</span><div class="pair-bar"><div class="pair-bar-fill" style="width: ${(c / max) * 100}%"></div></div><span class="pair-count">${c}</span></div>`).join('');
        const days = {};
        const now = Date.now();
        for (let i = 0; i < 28; i++) { const d = new Date(now - i * 86400000).toLocaleDateString('ru-RU'); days[d] = { pl: 0, count: 0 }; }
        trades.forEach(t => { const d = new Date(t.timestamp).toLocaleDateString('ru-RU'); if (days[d]) { days[d].pl += t.type === 'profit' ? t.volume : -t.volume; days[d].count++; } });
        heatmapEl.innerHTML = Object.entries(days).reverse().map(([date, data]) => { let cls = 'empty'; if (data.count) cls = data.pl > 0 ? 'profit' : (data.pl < 0 ? 'loss' : 'neutral'); return `<div class="heatmap-day ${cls}" title="${date}: ${data.count} сделок, ${data.pl >= 0 ? '+' : ''}$${data.pl.toFixed(2)}"></div>`; }).join('');
    };

    const updateProfileDisplay = () => {
        const u = Store.getCurrentUser();
        const s = Store.getUserStatus();
        if (!u) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('headerUsername', u.username);
        set('profileUsername', u.username);
        set('tariffName', s.wallet_connected ? 'Pro' : 'Базовый');
        set('tariffPrice', s.wallet_connected ? '500₽/мес' : 'Бесплатно');
        set('profileWalletAddress', u.wallet_address ? u.wallet_address.slice(0, 6) + '...' + u.wallet_address.slice(-4) : '—');
        set('profileWalletType', u.wallet_type || '—');
        const toggle = document.getElementById('publicProfileToggle'); if (toggle) { toggle.checked = s.is_public; toggle.disabled = !s.wallet_connected; }
        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !s.is_admin));
        const addBtn = document.getElementById('addTradeBtn');
        if (addBtn) addBtn.disabled = s.wallet_connected;
        document.querySelectorAll('#pairInput, #volumeInput, .type-btn').forEach(el => el.disabled = s.wallet_connected);
        const dc = document.getElementById('disconnectWalletBtn'); if (dc) dc.style.display = s.wallet_connected ? 'block' : 'none';
        const up = document.getElementById('upgradeToProBtn'); if (up) up.style.display = s.wallet_connected ? 'none' : 'block';
    };

    Store.subscribe(() => { renderJournal(); updateStats(); updateProfileDisplay(); scheduleChartUpdate(); renderExtendedAnalytics(); });

    // ========== API ==========
    const apiFetch = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
        const response = await fetch(API + url, { ...options, headers });
        if (response.status === 401) { authToken = null; safeLocalStorage.remove('authToken'); showAuthPage(); }
        return response;
    };

    const loadTrades = async () => { try { const r = await apiFetch('/api/trades'); if (r.ok) Store.setTrades(await r.json()); } catch (e) {} };

    const addTrade = async () => {
        if (isSubmitting || Store.getUserStatus().wallet_connected) return;
        const pair = document.getElementById('pairInput')?.value.trim();
        const volume = parseFloat(document.getElementById('volumeInput')?.value.replace(',', '.'));
        const isProfit = document.querySelector('.type-btn.active')?.classList.contains('profit');
        if (!pair || isNaN(volume) || volume <= 0) { toast('Заполните все поля', 'error'); return; }
        isSubmitting = true;
        const trade = { id: crypto.randomUUID(), pair: pair.toUpperCase(), volume, type: isProfit ? 'profit' : 'loss', timestamp: Date.now() };
        Store.addTrade(trade);
        document.getElementById('volumeInput').value = '';
        toast('Сделка добавлена', 'success');
        try { await apiFetch('/api/trades', { method: 'POST', body: JSON.stringify(trade) }); } catch { Store.removeTrade(trade.id); }
        isSubmitting = false;
    };

    const deleteTrade = async (id) => {
        if (Store.getUserStatus().wallet_connected) return;
        Store.removeTrade(id);
        try { await apiFetch('/api/trades/' + id, { method: 'DELETE' }); } catch { await loadTrades(); }
    };

    // ========== НАВИГАЦИЯ ==========
    const hideAllPages = () => { ['authPage', 'tariffPage', 'appPage'].forEach(id => document.getElementById(id)?.classList.add('hidden')); };

    const showAuthPage = () => {
        hideAllPages();
        document.getElementById('authPage')?.classList.remove('hidden');
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
        document.getElementById('loginForm')?.classList.remove('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        document.getElementById('forgotPasswordForm')?.classList.add('hidden');
        document.getElementById('resetPasswordForm')?.classList.add('hidden');
        const err = document.getElementById('authError'); if (err) err.textContent = '';
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
        const we = document.getElementById('walletError'); if (we) we.textContent = '';
    };

    const showAppPage = () => {
        hideAllPages();
        document.getElementById('appPage')?.classList.remove('hidden');
        const de = document.getElementById('currentDate'); if (de) de.textContent = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        switchView('journal');
    };

    const switchView = (view) => {
        const s = Store.getUserStatus();
        if ((view === 'premium' || view === 'leaderboard') && !s.wallet_connected && !s.is_admin) { toast('Требуется Pro тариф', 'error'); return; }
        if (view === 'admin' && !s.is_admin) { toast('Доступ запрещён', 'error'); return; }
        document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));
        document.getElementById(view + 'View')?.classList.remove('hidden');
        document.querySelectorAll('.menu-link').forEach(l => { l.classList.remove('active'); if (l.dataset.view === view) l.classList.add('active'); });
        if (view === 'leaderboard') loadLeaderboard();
        if (view === 'analytics') { destroyCharts(); requestAnimationFrame(scheduleChartUpdate); }
        if (view === 'premium') loadPremium();
        if (view === 'admin') loadAdmin();
    };

    const loadPremium = async () => {
        try {
            const r = await apiFetch('/api/premium/analytics');
            if (r.ok) {
                const d = await r.json();
                const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
                set('profitFactor', d.profitFactor?.toFixed(2) || '—');
                set('sharpeRatio', d.sharpeRatio?.toFixed(2) || '—');
                set('maxDrawdown', '$' + (d.maxDrawdown?.toFixed(2) || '0.00'));
                set('monthlyProjection', '$' + (d.monthlyProjection?.toFixed(2) || '0.00'));
                set('bestPair', d.bestPair || '—');
                set('worstPair', d.worstPair || '—');
                const bd = document.getElementById('bestDay'); if (bd) bd.textContent = d.bestDay ? `${d.bestDay.date} (+$${d.bestDay.pl})` : '—';
                const wd = document.getElementById('worstDay'); if (wd) wd.textContent = d.worstDay ? `${d.worstDay.date} (-$${Math.abs(d.worstDay.pl)})` : '—';
                const recs = [];
                if (d.winRate > 60) recs.push('Отличный винрейт!');
                if (d.profitFactor > 2) recs.push('Profit Factor > 2 — отличный результат!');
                const recEl = document.getElementById('premiumRecommendations'); if (recEl) recEl.innerHTML = recs.length ? recs.map(r => `<p>• ${r}</p>`).join('') : '<p>Недостаточно данных</p>';
            }
        } catch (e) {}
    };

    const loadAdmin = async () => {
        try {
            const r = await apiFetch('/api/admin/users');
            if (r.ok) {
                const users = await r.json();
                const tb = document.getElementById('adminUsersList');
                if (tb) tb.innerHTML = users.map(u => `<tr><td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${u.wallet_connected ? '✅' : '❌'}</td><td>${u.trades_count || 0}</td><td class="${u.total_pl >= 0 ? 'profit-text' : 'loss-text'}">$${u.total_pl?.toFixed(2) || '0.00'}</td><td><button class="icon-btn" data-delete-admin="${u.id}" style="color:#ef4444;">🗑️</button></td></tr>`).join('');
                tb.querySelectorAll('[data-delete-admin]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Удалить?')) return; await apiFetch('/api/admin/users/' + btn.dataset.deleteAdmin, { method: 'DELETE' }); loadAdmin(); }));
            }
        } catch (e) {}
    };

    const loadLeaderboard = async () => {
        const limit = document.getElementById('leaderboardLimit')?.value || 25;
        const tb = document.getElementById('leaderboardBody');
        if (!tb) return;
        try {
            const r = await apiFetch('/api/leaderboard?limit=' + limit);
            const data = await r.json();
            tb.innerHTML = data.length ? data.map(r => `<tr><td>${r.rank}</td><td>${escapeHtml(r.username)}</td><td class="${r.totalPL >= 0 ? 'profit-text' : 'loss-text'}">${r.totalPL >= 0 ? '+' : ''}$${r.totalPL.toFixed(2)}</td><td>${r.winRate}%</td><td>${r.totalTrades}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет данных</td></tr>';
        } catch (e) {}
    };

    const exportData = () => {
        const data = { trades: Store.getTrades(), exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `trades-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
        toast('Экспортировано', 'success');
    };

    const importData = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.trades || !Array.isArray(data.trades)) throw new Error('Invalid');
                if (!confirm(`Импортировать ${data.trades.length} сделок?`)) return;
                await apiFetch('/api/trades/sync', { method: 'POST', body: JSON.stringify({ trades: data.trades }) });
                await loadTrades();
                toast('Импорт завершён', 'success');
            } catch { toast('Ошибка файла', 'error'); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    const clearAllData = async () => {
        if (!confirm('Удалить ВСЕ сделки?')) return;
        try { await apiFetch('/api/trades/sync', { method: 'POST', body: JSON.stringify({ trades: [] }) }); Store.setTrades([]); toast('Очищено', 'info'); }
        catch { toast('Ошибка', 'error'); }
    };

    // ========== АВТОРИЗАЦИЯ ==========
    const checkAuth = () => {
        const token = safeLocalStorage.get('authToken');
        if (token) { authToken = token; fetchProfile(); }
        else { document.getElementById('preloader').style.display = 'none'; showAuthPage(); }
    };

    const fetchProfile = async () => {
        try {
            const r = await apiFetch('/api/user/profile');
            if (r.ok) {
                const user = await r.json();
                Store.setCurrentUser(user);
                document.getElementById('preloader').style.display = 'none';
                if (user.first_login) showTariffPage();
                else { await loadTrades(); showAppPage(); }
            } else { safeLocalStorage.remove('authToken'); document.getElementById('preloader').style.display = 'none'; showAuthPage(); }
        } catch { document.getElementById('preloader').style.display = 'none'; showAuthPage(); }
    };

    // ========== ОБРАБОТЧИКИ ТАРИФОВ ==========
    const handleTariffSelect = (mode) => {
        if (mode === 'basic') {
            finishOnboarding(false);
        } else if (mode === 'pro') {
            document.querySelector('.tariff-cards')?.classList.add('hidden');
            document.querySelector('.tariff-header')?.classList.add('hidden');
            document.querySelector('.tariff-note')?.classList.add('hidden');
            document.getElementById('walletStepContainer')?.classList.remove('hidden');
            selectedWalletType = null;
            document.querySelectorAll('.wallet-option').forEach(o => o.classList.remove('selected'));
            const fi = document.getElementById('finishOnboarding'); if (fi) fi.disabled = true;
            const wi = document.getElementById('walletAddressInput'); if (wi) wi.value = '';
            const we = document.getElementById('walletError'); if (we) we.textContent = '';
        }
    };

    const finishOnboarding = async (isPro) => {
        if (isSubmitting) return;
        isSubmitting = true;
        const btn = document.getElementById('finishOnboarding'); if (btn) btn.disabled = true;
        try {
            if (isPro) {
                const addr = document.getElementById('walletAddressInput')?.value.trim();
                const we = document.getElementById('walletError');
                if (!addr || !WALLET_VALIDATION_REGEX.test(addr)) { if (we) we.textContent = 'Минимум 5 символов'; isSubmitting = false; if (btn) btn.disabled = false; return; }
                if (!selectedWalletType) { if (we) we.textContent = 'Выберите тип кошелька'; isSubmitting = false; if (btn) btn.disabled = false; return; }
                const r = await apiFetch('/api/user/wallet', { method: 'POST', body: JSON.stringify({ wallet_address: addr, wallet_type: selectedWalletType }) });
                if (r.ok) {
                    Store.setCurrentUser({ ...Store.getCurrentUser(), wallet_connected: true, first_login: false, wallet_address: addr, wallet_type: selectedWalletType });
                    toast('Pro активирован!', 'success');
                    await loadTrades(); showAppPage();
                } else { toast('Ошибка активации Pro', 'error'); }
            } else {
                await apiFetch('/api/user/skip-wallet', { method: 'POST' });
                Store.setUserStatus({ wallet_connected: false, first_login: false });
                toast('Базовый тариф', 'success');
                await loadTrades(); showAppPage();
            }
        } catch { toast('Ошибка соединения', 'error'); }
        finally { isSubmitting = false; if (btn) btn.disabled = false; }
    };

    const disconnectWallet = async () => {
        if (!confirm('Отключить Pro?')) return;
        try { await apiFetch('/api/user/wallet/disconnect', { method: 'POST' }); Store.setUserStatus({ wallet_connected: false }); toast('Pro отключён', 'info'); }
        catch { toast('Ошибка', 'error'); }
    };

    // ========== ТЕМА ==========
    const initTheme = () => {
        const saved = safeLocalStorage.get('theme') || 'dark';
        document.body.setAttribute('data-theme', saved);
        const ts = document.getElementById('themeSelect'); if (ts) ts.value = saved;
    };

    // ========== DRAG & DROP ==========
    const initDragDrop = () => {
        const grid = document.getElementById('dashboardGrid');
        if (!grid || typeof Sortable === 'undefined') return;
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(grid, { animation: 200, handle: '.drag-item', ghostClass: 'sortable-ghost', dragClass: 'sortable-drag', onEnd: function() { const order = [...grid.querySelectorAll('.drag-item')].map(el => el.dataset.id); safeLocalStorage.set('dashboardOrder', JSON.stringify(order)); } });
        try { const saved = JSON.parse(safeLocalStorage.get('dashboardOrder', '[]')); saved.forEach(id => { const el = grid.querySelector(`.drag-item[data-id="${id}"]`); if (el) grid.appendChild(el); }); } catch {}
    };

    // ========== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ (ГЛАВНОЕ) ==========
    const setupEventDelegation = () => {
        document.addEventListener('click', async function(e) {
            // Меню
            const menuLink = e.target.closest('[data-view]');
            if (menuLink) { e.preventDefault(); switchView(menuLink.dataset.view); return; }

            // Выход
            if (e.target.closest('#headerLogout') || e.target.closest('#logoutBtn')) {
                authToken = null; safeLocalStorage.remove('authToken'); Store.reset(); showAuthPage(); return;
            }

            // Добавить сделку
            if (e.target.closest('#addTradeBtn')) { addTrade(); return; }

            // Тип сделки
            if (e.target.closest('.type-btn')) { document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active')); e.target.closest('.type-btn').classList.add('active'); return; }

            // Фильтры
            if (e.target.closest('.filter-btn')) { document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); e.target.closest('.filter-btn').classList.add('active'); Store.setFilter(e.target.closest('.filter-btn').dataset.filter); return; }

            // Вкладки авторизации
            if (e.target.closest('.auth-tab')) {
                const tab = e.target.closest('.auth-tab');
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isLogin = tab.dataset.tab === 'login';
                document.getElementById('loginForm')?.classList.toggle('hidden', !isLogin);
                document.getElementById('registerForm')?.classList.toggle('hidden', isLogin);
                document.getElementById('forgotPasswordForm')?.classList.add('hidden');
                document.getElementById('resetPasswordForm')?.classList.add('hidden');
                const ae = document.getElementById('authError'); if (ae) ae.textContent = '';
                return;
            }

            // Забыли пароль
            if (e.target.id === 'forgotPasswordLink') { e.preventDefault(); document.getElementById('loginForm')?.classList.add('hidden'); document.getElementById('forgotPasswordForm')?.classList.remove('hidden'); return; }
            if (e.target.id === 'backToLoginLink' || e.target.id === 'backToLoginFromReset') { e.preventDefault(); document.getElementById('loginForm')?.classList.remove('hidden'); document.getElementById('forgotPasswordForm')?.classList.add('hidden'); document.getElementById('resetPasswordForm')?.classList.add('hidden'); return; }

            // Модалки
            if (e.target.closest('#changePasswordBtn')) { document.getElementById('changePasswordModal')?.classList.remove('hidden'); return; }
            if (e.target.closest('#closeChangePasswordModal')) { document.getElementById('changePasswordModal')?.classList.add('hidden'); return; }
            if (e.target.closest('#helpBtn')) { document.getElementById('helpModal')?.classList.remove('hidden'); return; }
            if (e.target.closest('#closeHelpModal')) { document.getElementById('helpModal')?.classList.add('hidden'); return; }

            // Экспорт/Импорт/Очистка
            if (e.target.closest('#exportDataBtn')) { exportData(); return; }
            if (e.target.closest('#importDataBtn')) { document.getElementById('importFileInput')?.click(); return; }
            if (e.target.closest('#clearDataBtn')) { clearAllData(); return; }
            if (e.target.closest('#upgradeToProBtn')) { showTariffPage(); return; }
            if (e.target.closest('#disconnectWalletBtn')) { disconnectWallet(); return; }

            // ===== ТАРИФ: КАРТОЧКА =====
            if (e.target.closest('.tariff-card')) {
                const card = e.target.closest('.tariff-card');
                document.querySelectorAll('.tariff-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedMode = card.getAttribute('data-mode');
                return;
            }

            // ===== ТАРИФ: КНОПКА ВЫБОРА =====
            if (e.target.closest('.tariff-select-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.tariff-select-btn');
                const mode = btn.getAttribute('data-mode');
                handleTariffSelect(mode);
                return;
            }

            // ===== ТАРИФ: ЗАВЕРШИТЬ =====
            if (e.target.closest('#finishOnboarding')) {
                e.preventDefault();
                finishOnboarding(true);
                return;
            }

            // ===== ТАРИФ: НАЗАД =====
            if (e.target.closest('#backToTariff')) {
                document.querySelector('.tariff-cards')?.classList.remove('hidden');
                document.querySelector('.tariff-header')?.classList.remove('hidden');
                document.querySelector('.tariff-note')?.classList.remove('hidden');
                document.getElementById('walletStepContainer')?.classList.add('hidden');
                const we = document.getElementById('walletError'); if (we) we.textContent = '';
                return;
            }

            // ===== ТАРИФ: ВЫБОР КОШЕЛЬКА =====
            if (e.target.closest('.wallet-option')) {
                const opt = e.target.closest('.wallet-option');
                document.querySelectorAll('.wallet-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedWalletType = opt.getAttribute('data-wallet');
                const fi = document.getElementById('finishOnboarding');
                const addr = document.getElementById('walletAddressInput')?.value.trim();
                if (fi) fi.disabled = !addr || !WALLET_VALIDATION_REGEX.test(addr);
                return;
            }
        });

        // Валидация адреса кошелька
        document.getElementById('walletAddressInput')?.addEventListener('input', function() {
            const addr = this.value.trim();
            const fi = document.getElementById('finishOnboarding');
            if (fi) fi.disabled = !selectedWalletType || !addr || !WALLET_VALIDATION_REGEX.test(addr);
        });

        // Публичный профиль
        document.addEventListener('change', async function(e) {
            if (e.target.id === 'publicProfileToggle') {
                if (!Store.getUserStatus().wallet_connected) { e.target.checked = false; toast('Требуется Pro тариф', 'error'); return; }
                try { await apiFetch('/api/user/public', { method: 'POST', body: JSON.stringify({ is_public: e.target.checked }) }); Store.setUserStatus({ is_public: e.target.checked }); }
                catch { e.target.checked = !e.target.checked; }
            }
            if (e.target.id === 'leaderboardLimit') loadLeaderboard();
            if (e.target.id === 'themeSelect') { document.body.setAttribute('data-theme', e.target.value); safeLocalStorage.set('theme', e.target.value); }
        });

        // Импорт файла
        document.getElementById('importFileInput')?.addEventListener('change', importData);

        // Формы
        document.addEventListener('submit', async function(e) {
            e.preventDefault();
            const form = e.target;

            // ЛОГИН
            if (form.id === 'loginForm') {
                const fd = new FormData(form);
                const r = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }) });
                const d = await r.json();
                if (r.ok) { authToken = d.token; safeLocalStorage.set('authToken', authToken); Store.setCurrentUser(d.user); if (d.user.first_login) showTariffPage(); else { await loadTrades(); showAppPage(); } }
                else { document.getElementById('authError').textContent = d.error || 'Ошибка входа'; }
            }

            // РЕГИСТРАЦИЯ
            if (form.id === 'registerForm') {
                const fd = new FormData(form);
                if (fd.get('password') !== fd.get('confirmPassword')) { document.getElementById('authError').textContent = 'Пароли не совпадают'; return; }
                const r = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: fd.get('username'), password: fd.get('password'), secretQuestion: fd.get('secretQuestion'), secretAnswer: fd.get('secretAnswer') }) });
                const d = await r.json();
                if (r.ok) { authToken = d.token; safeLocalStorage.set('authToken', authToken); Store.setCurrentUser(d.user); showTariffPage(); }
                else { document.getElementById('authError').textContent = d.error || 'Ошибка регистрации'; }
            }

            // ЗАБЫЛИ ПАРОЛЬ
            if (form.id === 'forgotPasswordForm') {
                const username = form.querySelector('[name="forgotUsername"]').value;
                const r = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ username }) });
                const d = await r.json();
                if (r.ok) { document.getElementById('resetUsername').value = username; document.getElementById('secretQuestionLabel').textContent = d.secretQuestion || 'Вопрос не задан'; form.classList.add('hidden'); document.getElementById('resetPasswordForm').classList.remove('hidden'); }
                else { document.getElementById('authError').textContent = d.error || 'Пользователь не найден'; }
            }

            // СБРОС ПАРОЛЯ
            if (form.id === 'resetPasswordForm') {
                const fd = new FormData(form);
                const r = await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ username: document.getElementById('resetUsername').value, secretAnswer: fd.get('secretAnswer'), newPassword: fd.get('newPassword') }) });
                if (r.ok) { toast('Пароль изменён', 'success'); form.classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); }
                else { const d = await r.json(); document.getElementById('authError').textContent = d.error || 'Ошибка'; }
            }

            // СМЕНА ПАРОЛЯ
            if (form.id === 'changePasswordForm') {
                const fd = new FormData(form);
                const r = await apiFetch('/api/user/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') }) });
                if (r.ok) { toast('Пароль изменён', 'success'); document.getElementById('changePasswordModal')?.classList.add('hidden'); form.reset(); }
                else { const d = await r.json(); document.getElementById('changePasswordError').textContent = d.error || 'Ошибка'; }
            }
        });

        // Закрытие модалок
        document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', function(e) { if (e.target === this) this.classList.add('hidden'); }));
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
        if (p && p.style.display !== 'none') { p.style.display = 'none'; }
    }, 5000);
})();