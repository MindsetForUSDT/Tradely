// Глобальные переменные
let currentUser = null, authToken = null, trades = [], currentView = 'journal', currentFilter = 'all';
let plChart = null, ratioChart = null, isAdmin = false, selectedMode = null, selectedWalletType = null;
let userStatus = { wallet_connected: false, wallet_address: null, is_public: false, first_login: true, is_admin: false };
const API_BASE = '';

// Toast
function showToast(msg, type='info') {
    var c = document.getElementById('toastContainer'); if (!c) return;
    var t = document.createElement('div'); t.className = 'toast '+type;
    t.innerHTML = '<span class="toast-icon">'+(type==='success'?'✓':type==='error'?'✕':'ℹ')+'</span><span class="toast-message">'+msg+'</span><span class="toast-close">✕</span>';
    c.appendChild(t);
    t.querySelector('.toast-close').onclick = function(){ t.remove(); };
    setTimeout(function(){ if(t.parentNode) t.remove(); }, 4000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function(){ checkAuth(); setupEventListeners(); });
window.addEventListener('load', function(){ setTimeout(function(){ var p = document.getElementById('preloader'); if(p) p.classList.add('fade-out'); }, 500); });

function checkAuth() { var t = localStorage.getItem('authToken'); if(t) { authToken = t; fetchUserProfile(); } else showWelcomeScreen(); }
async function fetchUserProfile() {
    try { var r = await fetch(API_BASE+'/api/user/profile', { headers: {'Authorization':'Bearer '+authToken} });
        if(r.ok) { currentUser = await r.json(); userStatus = { wallet_connected: currentUser.wallet_connected, wallet_address: currentUser.wallet_address, is_public: currentUser.is_public, first_login: currentUser.first_login, is_admin: currentUser.is_admin }; isAdmin = currentUser.is_admin;
            if(userStatus.first_login) showOnboarding(); else { await loadTrades(); showAppScreen(); }
        } else { localStorage.removeItem('authToken'); showWelcomeScreen(); }
    } catch(e) { showWelcomeScreen(); }
}

function showWelcomeScreen() {
    document.getElementById('preloader')?.classList.add('hidden');
    document.getElementById('welcomeScreen')?.classList.remove('hidden');
    document.getElementById('authContainer')?.classList.remove('hidden');
    document.getElementById('onboardingContainer')?.classList.add('hidden');
    document.getElementById('appScreen')?.classList.add('hidden');
}
function showOnboarding() {
    document.getElementById('preloader')?.classList.add('hidden');
    document.getElementById('welcomeScreen')?.classList.remove('hidden');
    document.getElementById('authContainer')?.classList.add('hidden');
    document.getElementById('onboardingContainer')?.classList.remove('hidden');
    document.getElementById('appScreen')?.classList.add('hidden');
    selectedMode = null; selectedWalletType = null;
    document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('selected'));
    document.querySelectorAll('.wallet-option-new').forEach(w=>w.classList.remove('selected'));
    document.getElementById('continueOnboarding') && (document.getElementById('continueOnboarding').disabled = true);
    document.getElementById('finishOnboarding') && (document.getElementById('finishOnboarding').disabled = true);
}
function showAppScreen() {
    document.getElementById('preloader')?.classList.add('hidden');
    document.getElementById('welcomeScreen')?.classList.add('hidden');
    document.getElementById('appScreen')?.classList.remove('hidden');
    updateDate(); updateProfileDisplay(); renderJournal(); switchView('journal');
}

function switchView(v) {
    if(v==='premium' && !userStatus.wallet_connected && !isAdmin) { showToast('Требуется Pro','error'); return; }
    if(v==='admin' && !isAdmin) { showToast('Доступ запрещён','error'); return; }
    currentView = v;
    document.querySelectorAll('.view-container').forEach(c=>c.classList.add('hidden'));
    document.getElementById(v+'View')?.classList.remove('hidden');
    document.querySelectorAll('.nav-link-header').forEach(l=>{ l.classList.remove('active'); if(l.dataset.view===v) l.classList.add('active'); });
    if(v==='leaderboard') { if(!userStatus.wallet_connected && !isAdmin) { switchView('settings'); return; } loadLeaderboard(); }
    if(v==='analytics') setTimeout(updateCharts,100);
    if(v==='premium') loadPremiumAnalytics();
    if(v==='admin') loadAdminUsers();
}

// Слушатели
function setupEventListeners() {
    document.querySelectorAll('.auth-switch').forEach(t=>{ t.onclick = function(){ document.querySelectorAll('.auth-switch').forEach(s=>s.classList.remove('active')); this.classList.add('active'); var isL = this.dataset.auth==='login'; document.getElementById('loginForm').classList.toggle('hidden',!isL); document.getElementById('registerForm').classList.toggle('hidden',isL); document.getElementById('forgotPasswordForm').classList.add('hidden'); document.getElementById('resetPasswordForm').classList.add('hidden'); document.getElementById('authError').textContent=''; }; });
    document.getElementById('loginForm')?.addEventListener('submit', async e=>{ e.preventDefault(); var f = new FormData(e.target); try { var r = await fetch(API_BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password')})}); var d = await r.json(); if(r.ok) { authToken=d.token; currentUser=d.user; userStatus={wallet_connected:d.user.wallet_connected,wallet_address:d.user.wallet_address,is_public:d.user.is_public,first_login:d.user.first_login,is_admin:d.user.is_admin}; isAdmin=d.user.is_admin; localStorage.setItem('authToken',authToken); showToast('Вход выполнен','success'); if(userStatus.first_login) showOnboarding(); else { await loadTrades(); showAppScreen(); } } else { document.getElementById('authError').textContent = d.error; showToast(d.error,'error'); } } catch(err) { document.getElementById('authError').textContent = 'Ошибка соединения'; } });
    document.getElementById('registerForm')?.addEventListener('submit', async e=>{ e.preventDefault(); var f = new FormData(e.target); if(f.get('password')!==f.get('confirmPassword')) { document.getElementById('authError').textContent='Пароли не совпадают'; return; } try { var r = await fetch(API_BASE+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password'),secretQuestion:f.get('secretQuestion'),secretAnswer:f.get('secretAnswer')})}); var d = await r.json(); if(r.ok) { authToken=d.token; currentUser=d.user; userStatus={wallet_connected:false,is_public:false,first_login:true,is_admin:false}; localStorage.setItem('authToken',authToken); showToast('Регистрация успешна','success'); showOnboarding(); } else { document.getElementById('authError').textContent = d.error; } } catch(err) { document.getElementById('authError').textContent = 'Ошибка соединения'; } });
    document.getElementById('forgotPasswordLink')?.addEventListener('click', e=>{ e.preventDefault(); document.getElementById('loginForm').classList.add('hidden'); document.getElementById('forgotPasswordForm').classList.remove('hidden'); });
    document.getElementById('backToLoginLink')?.addEventListener('click', e=>{ e.preventDefault(); document.getElementById('loginForm').classList.remove('hidden'); document.getElementById('forgotPasswordForm').classList.add('hidden'); });
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', async e=>{ e.preventDefault(); var u = e.target.querySelector('[name="forgotUsername"]').value; try { var r = await fetch(API_BASE+'/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})}); var d = await r.json(); if(r.ok) { document.getElementById('resetUsername').value = u; document.getElementById('secretQuestionLabel').textContent = d.secretQuestion; document.getElementById('forgotPasswordForm').classList.add('hidden'); document.getElementById('resetPasswordForm').classList.remove('hidden'); } else { document.getElementById('authError').textContent = d.error; } } catch(err) {} });
    document.getElementById('resetPasswordForm')?.addEventListener('submit', async e=>{ e.preventDefault(); var f = new FormData(e.target); if(f.get('newPassword')!==f.get('confirmNewPassword')) { document.getElementById('authError').textContent='Пароли не совпадают'; return; } try { var r = await fetch(API_BASE+'/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('resetUsername').value,secretAnswer:f.get('secretAnswer'),newPassword:f.get('newPassword')})}); if(r.ok) { showToast('Пароль изменён','success'); document.getElementById('resetPasswordForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); } else { var d = await r.json(); document.getElementById('authError').textContent = d.error; } } catch(err) {} });
    document.querySelectorAll('.mode-card').forEach(c=>c.onclick=function(){ document.querySelectorAll('.mode-card').forEach(m=>m.classList.remove('selected')); this.classList.add('selected'); selectedMode=this.dataset.mode; document.getElementById('continueOnboarding').disabled=false; });
    document.getElementById('continueOnboarding')?.addEventListener('click', ()=>{ if(selectedMode==='pro') { document.getElementById('modeStep').classList.add('hidden'); document.getElementById('walletStep').classList.remove('hidden'); } else finishOnboarding(false); });
    document.querySelectorAll('.wallet-option-new').forEach(o=>o.onclick=function(){ document.querySelectorAll('.wallet-option-new').forEach(w=>w.classList.remove('selected')); this.classList.add('selected'); selectedWalletType=this.dataset.wallet; checkWalletForm(); });
    document.getElementById('walletAddressInput')?.addEventListener('input', checkWalletForm);
    function checkWalletForm(){ var a = document.getElementById('walletAddressInput')?.value.trim(); document.getElementById('finishOnboarding').disabled = !selectedWalletType || !a; }
    document.getElementById('backToMode')?.addEventListener('click', ()=>{ document.getElementById('walletStep').classList.add('hidden'); document.getElementById('modeStep').classList.remove('hidden'); });
    document.getElementById('finishOnboarding')?.addEventListener('click', ()=>finishOnboarding(true));
    async function finishOnboarding(isPro){ try { if(isPro) { await fetch(API_BASE+'/api/user/wallet',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({wallet_address:document.getElementById('walletAddressInput').value.trim(),wallet_type:selectedWalletType})}); userStatus.wallet_connected=true; } else { await fetch(API_BASE+'/api/user/skip-wallet',{method:'POST',headers:{'Authorization':'Bearer '+authToken}}); } userStatus.first_login=false; await loadTrades(); showAppScreen(); } catch(e) {} }
    document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click', e=>{ e.preventDefault(); switchView(el.dataset.view); }));
    function logout(){ localStorage.removeItem('authToken'); authToken=null; currentUser=null; trades=[]; showWelcomeScreen(); }
    document.getElementById('headerLogout')?.addEventListener('click', logout); document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('addTradeBtn')?.addEventListener('click', addTrade);
    document.getElementById('refreshData')?.addEventListener('click', async ()=>{ await loadTrades(); renderJournal(); });
    document.querySelectorAll('.type-option').forEach(b=>b.onclick=function(){ document.querySelectorAll('.type-option').forEach(o=>o.classList.remove('active')); this.classList.add('active'); });
    document.querySelectorAll('.filter-btn').forEach(b=>b.onclick=function(){ document.querySelectorAll('.filter-btn').forEach(f=>f.classList.remove('active')); this.classList.add('active'); currentFilter=this.dataset.filter; renderJournal(); });
    document.getElementById('leaderboardLimit')?.addEventListener('change', loadLeaderboard);
    document.getElementById('publicProfileToggle')?.addEventListener('change', async e=>{ if(!userStatus.wallet_connected) { e.target.checked=false; showToast('Требуется Pro','error'); return; } await fetch(API_BASE+'/api/user/public',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({is_public:e.target.checked})}); });
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', ()=>document.getElementById('importFileInput').click());
    document.getElementById('importFileInput')?.addEventListener('change', importData);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);
    document.getElementById('changePasswordBtn')?.addEventListener('click', ()=>document.getElementById('changePasswordModal').classList.remove('hidden'));
    document.getElementById('closeChangePasswordModal')?.addEventListener('click', ()=>document.getElementById('changePasswordModal').classList.add('hidden'));
    document.getElementById('changePasswordForm')?.addEventListener('submit', async e=>{ e.preventDefault(); var f = new FormData(e.target); if(f.get('newPassword')!==f.get('confirmNewPassword')) { document.getElementById('changePasswordError').textContent='Пароли не совпадают'; return; } try { var r = await fetch(API_BASE+'/api/user/change-password',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({currentPassword:f.get('currentPassword'),newPassword:f.get('newPassword')})}); if(r.ok) { showToast('Пароль изменён','success'); document.getElementById('changePasswordModal').classList.add('hidden'); } else { var d = await r.json(); document.getElementById('changePasswordError').textContent = d.error; } } catch(err) {} });
}

// Сделки
async function loadTrades() { try { var r = await fetch(API_BASE+'/api/trades',{headers:{'Authorization':'Bearer '+authToken}}); if(r.ok) trades = await r.json(); } catch(e) {} }
async function addTrade() { if(userStatus.wallet_connected) { showToast('Pro: ручное добавление отключено','error'); return; } var p = document.getElementById('pairInput').value.trim(); var v = parseFloat(document.getElementById('volumeInput').value.replace(',','.')); var isP = document.querySelector('.type-option.profit').classList.contains('active'); if(!p||isNaN(v)||v<=0) return; var t = { id: Date.now()+'-'+Math.random().toString(36).substr(2,5), pair: p.toUpperCase(), volume: v, type: isP?'profit':'loss', timestamp: Date.now() }; try { var r = await fetch(API_BASE+'/api/trades',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify(t)}); if(r.ok) { trades.unshift(t); renderJournal(); document.getElementById('volumeInput').value=''; showToast('Сделка добавлена','success'); } } catch(e) {} }
async function deleteTrade(id) { if(userStatus.wallet_connected) return; await fetch(API_BASE+'/api/trades/'+id,{method:'DELETE',headers:{'Authorization':'Bearer '+authToken}}); trades = trades.filter(t=>t.id!==id); renderJournal(); }
window.deleteTrade = deleteTrade;
function renderJournal() { var tb = document.getElementById('tradesList'); var f = currentFilter==='all'?trades:trades.filter(t=>t.type===currentFilter); if(!f.length) tb.innerHTML='<tr><td colspan="5" class="empty-message">Нет сделок</td></tr>'; else { tb.innerHTML = f.map(t=>{ var tm = new Date(t.timestamp).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); var act = userStatus.wallet_connected?'':'<button class="icon-btn" onclick="deleteTrade(\''+t.id+'\')">🗑️</button>'; return '<tr><td>'+tm+'</td><td>'+t.pair+'</td><td>'+t.volume.toFixed(2)+'</td><td class="'+(t.type==='profit'?'profit-text':'loss-text')+'">'+(t.type==='profit'?'+':'−')+' $'+t.volume.toFixed(2)+'</td><td>'+act+'</td></tr>'; }).join(''); } updateStats(); }
function updateStats() { var pl=0, w=0, maxP=0, maxL=0, pS=0, lS=0; trades.forEach(t=>{ if(t.type==='profit'){ pl+=t.volume; w++; pS+=t.volume; maxP=Math.max(maxP,t.volume); } else { pl-=t.volume; lS+=t.volume; maxL=Math.max(maxL,t.volume); } }); var wr = trades.length?(w/trades.length)*100:0; document.getElementById('totalPL').textContent = (pl>=0?'+':'−')+'$'+Math.abs(pl).toFixed(2); document.getElementById('winRate').textContent = wr.toFixed(1)+'%'; document.getElementById('winRateProgress').style.width = wr+'%'; document.getElementById('totalTradesCount').textContent = trades.length; document.getElementById('winCount').textContent = w+' LONG'; document.getElementById('lossCount').textContent = (trades.length-w)+' SHORT'; if(trades.length){ var lst = trades[0]; document.getElementById('plChange').textContent = (lst.type==='profit'?'+':'-')+'$'+lst.volume.toFixed(2); } document.getElementById('avgProfit').textContent = '$'+(w?pS/w:0).toFixed(2); document.getElementById('avgLoss').textContent = '$'+((trades.length-w)?lS/(trades.length-w):0).toFixed(2); document.getElementById('bestTrade').textContent = '$'+maxP.toFixed(2); document.getElementById('worstTrade').textContent = '$'+maxL.toFixed(2); }
function updateCharts() { /* ... аналогично предыдущей версии ... */ }
function updateDate() { document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function updateProfileDisplay() { if(!currentUser) return; document.getElementById('headerUsername').textContent = currentUser.username; document.getElementById('profileUsername').textContent = currentUser.username; document.getElementById('tariffName').textContent = userStatus.wallet_connected?'Pro Аналитика':'Базовый'; document.getElementById('tariffPrice').textContent = userStatus.wallet_connected?'500 ₽/мес':'Бесплатно'; document.getElementById('accountTypeDisplay').textContent = userStatus.wallet_connected?'Pro':'Базовый'; document.getElementById('publicProfileToggle').checked = userStatus.is_public; }
async function loadPremiumAnalytics() { /* ... */ }
async function loadAdminUsers() { /* ... */ }
async function loadLeaderboard() { /* ... */ }
function exportData() { /* ... */ }
function importData(e) { /* ... */ }
async function clearAllData() { /* ... */ }

// Фон (сокращён)
(function(){ var c=document.getElementById('particleCanvas'); if(!c)return; var ctx=c.getContext('2d'),w=window.innerWidth,h=window.innerHeight,mx=w/2,my=h/2,p=[],cnt=100; function P(){ this.x=Math.random()*w; this.y=Math.random()*h; this.vx=(Math.random()-0.5)*0.2; this.vy=(Math.random()-0.5)*0.2; this.s=Math.random()*2.5+1.5; this.bx=this.x; this.by=this.y; } P.prototype.update=function(){ var dx=mx-this.x,dy=my-this.y,dist=Math.sqrt(dx*dx+dy*dy); if(dist<250){ var f=(1-dist/250)*0.15; this.vx+=dx*f; this.vy+=dy*f; } this.vx+=(this.bx-this.x)*0.005; this.vy+=(this.by-this.y)*0.005; this.vx*=0.95; this.vy*=0.95; this.x+=this.vx; this.y+=this.vy; if(this.x<0)this.x=0; if(this.x>w)this.x=w; if(this.y<0)this.y=0; if(this.y>h)this.y=h; }; P.prototype.draw=function(){ var dx=mx-this.x,dy=my-this.y,dist=Math.sqrt(dx*dx+dy*dy),op=0.4,sz=this.s; if(dist<250){ op=0.8; sz=this.s*1.5; } var g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,sz*2); g.addColorStop(0,'rgba(16,185,129,'+op+')'); g.addColorStop(1,'rgba(59,130,246,'+(op*0.5)+')'); ctx.beginPath(); ctx.arc(this.x,this.y,sz,0,2*Math.PI); ctx.fillStyle=g; ctx.fill(); }; function init(){ p=[]; for(var i=0;i<cnt;i++) p.push(new P()); } function animate(){ ctx.clearRect(0,0,w,h); p.forEach(function(o){o.update();}); p.forEach(function(o){o.draw();}); requestAnimationFrame(animate); } window.addEventListener('resize',function(){ w=window.innerWidth; h=window.innerHeight; c.width=w; c.height=h; init(); }); window.addEventListener('mousemove',function(e){ mx=e.clientX; my=e.clientY; }); c.width=w; c.height=h; init(); animate(); })();