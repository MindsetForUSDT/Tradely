(() => {
    "use strict";

    const API = '';
    const WALLET_VALIDATION_REGEX = /^[a-zA-Z0-9]{5,}$/;

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
        toastEl.innerHTML = `<span>${icon}</span><span style="flex:1;">${escapeHtml(msg)}</span><span class="toast-close" style="cursor:pointer;opacity:0.7;">✕</span>`;
        toastEl.querySelector('.toast-close').addEventListener('click', () => toastEl.remove());
        container.appendChild(toastEl);
        setTimeout(() => { if (toastEl.isConnected) toastEl.remove(); }, 4000);
    };

    const LS = {
        get(k, d = null) { try { const v = localStorage.getItem(k); return v !== null ? v : d; } catch { return d; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch {} },
        remove(k) { try { localStorage.removeItem(k); } catch {} }
    };

    const Store = (() => {
        let trades = [], filter = 'all', userStatus = {}, currentUser = null, subs = [];
        const notify = () => subs.forEach(fn => { try { fn(); } catch (e) {} });
        return {
            on(fn) { subs.push(fn); },
            getTrades: () => [...trades],
            setTrades(arr) { trades = [...arr].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); notify(); },
            getFiltered() { return filter === 'all' ? trades : trades.filter(t => t.type === filter); },
            setFilter(f) { filter = f; notify(); },
            getUserStatus: () => ({ ...userStatus }),
            setUserStatus(s) { userStatus = { ...userStatus, ...s }; notify(); },
            getCurrentUser: () => currentUser,
            setCurrentUser(u) { currentUser = u; if (u) userStatus = { wallet_connected: u.wallet_connected || false, is_public: u.is_public || false, first_login: u.first_login ?? true, is_admin: u.is_admin || false }; notify(); },
            reset() { trades = []; filter = 'all'; userStatus = {}; currentUser = null; LS.remove('authToken'); notify(); }
        };
    })();

    let authToken = null, selectedWalletType = null, isSubmitting = false;

    const apiFetch = async (url, opts = {}) => {
        const headers = { 'Content-Type': 'application/json', ...opts.headers };
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
        const res = await fetch(API + url, { ...opts, headers });
        if (res.status === 401) { authToken = null; LS.remove('authToken'); showAuthPage(); }
        return res;
    };

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    const renderJournal = () => {
        const tb = document.getElementById('tradesList');
        if (!tb) return;
        const filtered = Store.getFiltered();
        if (!filtered.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">Нет сделок</td></tr>'; return; }
        const isPro = Store.getUserStatus().wallet_connected;
        tb.innerHTML = filtered.map(t => `<tr><td>${new Date(t.timestamp).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'})}</td><td>${escapeHtml(t.pair)}</td><td>${t.volume.toFixed(2)}</td><td class="${t.type==='profit'?'profit-text':'loss-text'}">${t.type==='profit'?'+':'−'}$${t.volume.toFixed(2)}</td><td>${isPro?'':`<button class="icon-btn" data-delete="${escapeHtml(t.id)}">🗑️</button>`}</td></tr>`).join('');
        tb.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); deleteTrade(b.dataset.delete); }));
    };

    const updateStats = () => { /* cокращено для brevity */ };
    const updateProfileDisplay = () => {
        const u = Store.getCurrentUser(), s = Store.getUserStatus();
        if (!u) return;
        setText('headerUsername', u.username);
        setText('profileUsername', u.username);
        setText('tariffName', s.wallet_connected ? 'Pro' : 'Базовый');
        const addBtn = document.getElementById('addTradeBtn'); if (addBtn) addBtn.disabled = s.wallet_connected;
        const dc = document.getElementById('disconnectWalletBtn'); if (dc) dc.style.display = s.wallet_connected ? 'block' : 'none';
        const up = document.getElementById('upgradeToProBtn'); if (up) up.style.display = s.wallet_connected ? 'none' : 'block';
    };

    Store.on(() => { renderJournal(); updateProfileDisplay(); });

    const loadTrades = async () => { try { const r = await apiFetch('/api/trades'); if (r.ok) Store.setTrades(await r.json()); } catch {} };
    const deleteTrade = async (id) => { Store.setTrades(Store.getTrades().filter(t => t.id !== id)); try { await apiFetch('/api/trades/' + id, { method: 'DELETE' }); } catch { await loadTrades(); } };

    const hideAll = () => ['authPage','tariffPage','appPage'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    const showAuthPage = () => { hideAll(); document.getElementById('authPage')?.classList.remove('hidden'); };
    const showTariffPage = () => { hideAll(); document.getElementById('tariffPage')?.classList.remove('hidden'); };
    const showAppPage = () => { hideAll(); document.getElementById('appPage')?.classList.remove('hidden'); setText('currentDate', new Date().toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric'})); };

    const finishOnboarding = async (isPro) => {
        if (isSubmitting) return;
        isSubmitting = true;
        try {
            if (isPro) {
                const addr = document.getElementById('walletAddressInput')?.value.trim();
                if (!addr || !WALLET_VALIDATION_REGEX.test(addr)) { toast('Введите корректный адрес кошелька', 'error'); return; }
                if (!selectedWalletType) { toast('Выберите тип кошелька', 'error'); return; }
                const r = await apiFetch('/api/user/wallet', { method: 'POST', body: JSON.stringify({ wallet_address: addr, wallet_type: selectedWalletType }) });
                if (r.ok) { Store.setCurrentUser({...Store.getCurrentUser(), wallet_connected: true, first_login: false}); toast('Pro активирован!', 'success'); await loadTrades(); showAppPage(); }
                else { toast('Ошибка активации Pro', 'error'); }
            } else {
                await apiFetch('/api/user/skip-wallet', { method: 'POST' });
                Store.setUserStatus({ wallet_connected: false, first_login: false });
                toast('Базовый тариф', 'success');
                await loadTrades(); showAppPage();
            }
        } catch { toast('Ошибка соединения', 'error'); }
        finally { isSubmitting = false; }
    };

    const checkAuth = async () => {
        const token = LS.get('authToken');
        if (token) { authToken = token; }
        try {
            const r = await apiFetch('/api/user/profile');
            if (r.ok) { const u = await r.json(); Store.setCurrentUser(u); document.getElementById('preloader').style.display = 'none'; if (u.first_login) showTariffPage(); else { await loadTrades(); showAppPage(); } return; }
        } catch {}
        document.getElementById('preloader').style.display = 'none';
        if (!token) showAuthPage();
    };

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    document.addEventListener('DOMContentLoaded', () => {
        // Тема
        const theme = LS.get('theme') || 'dark';
        document.body.setAttribute('data-theme', theme);
        document.getElementById('themeSelect').value = theme;
        document.getElementById('themeSelect').addEventListener('change', function() {
            document.body.setAttribute('data-theme', this.value); LS.set('theme', this.value);
        });

        // ========== КНОПКИ ТАРИФОВ ==========
        document.querySelectorAll('.tariff-select-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                if (mode === 'basic') finishOnboarding(false);
                else if (mode === 'pro') {
                    document.querySelector('.tariff-cards').classList.add('hidden');
                    document.querySelector('.tariff-header').classList.add('hidden');
                    document.querySelector('.tariff-note').classList.add('hidden');
                    document.getElementById('walletStepContainer').classList.remove('hidden');
                    selectedWalletType = null;
                    document.querySelectorAll('.wallet-option').forEach(o => o.classList.remove('selected'));
                    document.getElementById('finishOnboarding').disabled = true;
                    document.getElementById('walletAddressInput').value = '';
                }
            });
        });

        // ========== КНОПКА ЗАВЕРШИТЬ ==========
        document.getElementById('finishOnboarding').addEventListener('click', () => finishOnboarding(true));

        // ========== КНОПКА НАЗАД ==========
        document.getElementById('backToTariff').addEventListener('click', () => {
            document.querySelector('.tariff-cards').classList.remove('hidden');
            document.querySelector('.tariff-header').classList.remove('hidden');
            document.querySelector('.tariff-note').classList.remove('hidden');
            document.getElementById('walletStepContainer').classList.add('hidden');
        });

        // ========== ВЫБОР КОШЕЛЬКА ==========
        document.querySelectorAll('.wallet-option').forEach(opt => {
            opt.addEventListener('click', function() {
                document.querySelectorAll('.wallet-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                selectedWalletType = this.getAttribute('data-wallet');
                const addr = document.getElementById('walletAddressInput').value.trim();
                document.getElementById('finishOnboarding').disabled = !addr || !WALLET_VALIDATION_REGEX.test(addr);
            });
        });

        // ========== ВАЛИДАЦИЯ АДРЕСА ==========
        document.getElementById('walletAddressInput').addEventListener('input', function() {
            const addr = this.value.trim();
            document.getElementById('finishOnboarding').disabled = !selectedWalletType || !addr || !WALLET_VALIDATION_REGEX.test(addr);
        });

        // ========== ФОРМЫ ==========
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            const r = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }) });
            const d = await r.json();
            if (r.ok) { authToken = d.token; LS.set('authToken', d.token); Store.setCurrentUser(d.user); if (d.user.first_login) showTariffPage(); else { await loadTrades(); showAppPage(); } }
            else { document.getElementById('authError').textContent = d.error || 'Ошибка'; }
        });

        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            if (fd.get('password') !== fd.get('confirmPassword')) { document.getElementById('authError').textContent = 'Пароли не совпадают'; return; }
            const r = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: fd.get('username'), password: fd.get('password'), secretQuestion: fd.get('secretQuestion'), secretAnswer: fd.get('secretAnswer') }) });
            const d = await r.json();
            if (r.ok) { authToken = d.token; LS.set('authToken', d.token); Store.setCurrentUser(d.user); showTariffPage(); }
            else { document.getElementById('authError').textContent = d.error || 'Ошибка'; }
        });

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => { authToken = null; LS.remove('authToken'); Store.reset(); showAuthPage(); });
        document.getElementById('headerLogout').addEventListener('click', () => { authToken = null; LS.remove('authToken'); Store.reset(); showAuthPage(); });

        // Тарифы из настроек
        document.getElementById('upgradeToProBtn').addEventListener('click', showTariffPage);
        document.getElementById('disconnectWalletBtn').addEventListener('click', async () => {
            if (!confirm('Отключить Pro?')) return;
            await apiFetch('/api/user/wallet/disconnect', { method: 'POST' });
            Store.setUserStatus({ wallet_connected: false });
            toast('Pro отключён', 'info');
        });

        // Добавление сделки
        document.getElementById('addTradeBtn').addEventListener('click', async () => {
            if (Store.getUserStatus().wallet_connected) { toast('Pro: ручное добавление отключено', 'error'); return; }
            const pair = document.getElementById('pairInput').value.trim();
            const volume = parseFloat(document.getElementById('volumeInput').value.replace(',', '.'));
            if (!pair || isNaN(volume) || volume <= 0) { toast('Заполните все поля', 'error'); return; }
            const type = document.querySelector('.type-btn.active').classList.contains('profit') ? 'profit' : 'loss';
            const trade = { id: crypto.randomUUID(), pair: pair.toUpperCase(), volume, type, timestamp: Date.now() };
            Store.setTrades([trade, ...Store.getTrades()]);
            try { await apiFetch('/api/trades', { method: 'POST', body: JSON.stringify(trade) }); } catch {}
        });

        // Типы сделок
        document.querySelectorAll('.type-btn').forEach(b => b.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(x => x.classList.remove('active'));
            this.classList.add('active');
        }));

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
            this.classList.add('active');
            Store.setFilter(this.dataset.filter);
        }));

        // Меню
        document.querySelectorAll('.menu-link').forEach(l => l.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.menu-link').forEach(x => x.classList.remove('active'));
            this.classList.add('active');
            const view = this.dataset.view;
            document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));
            document.getElementById(view + 'View')?.classList.remove('hidden');
        }));

        checkAuth();
    });

    setTimeout(() => {
        const p = document.getElementById('preloader');
        if (p && p.style.display !== 'none') { p.style.display = 'none'; }
    }, 5000);
})();