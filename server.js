require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required'); })();
const DATABASE_URL = process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL is required'); })();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(compression());

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('PG error', err));

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_public BOOLEAN DEFAULT false,
                wallet_connected BOOLEAN DEFAULT false,
                wallet_address TEXT,
                wallet_type TEXT,
                first_login BOOLEAN DEFAULT true,
                is_admin BOOLEAN DEFAULT false,
                secret_question TEXT,
                secret_answer TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS trades (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                pair TEXT NOT NULL,
                volume REAL NOT NULL,
                type TEXT CHECK(type IN ('profit', 'loss')) NOT NULL,
                timestamp BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
            CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
        `);

        const adminPassword = ADMIN_PASSWORD || 'TradeumAdmin2024!';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        const existingAdmin = await client.query('SELECT id FROM users WHERE username = $1', [ADMIN_USERNAME]);
        if (existingAdmin.rows.length === 0) {
            await client.query(
                `INSERT INTO users (username, password, is_admin, first_login, wallet_connected) VALUES ($1, $2, true, false, true)`,
                [ADMIN_USERNAME, hashedPassword]
            );
        } else {
            await client.query('UPDATE users SET password = $1, is_admin = true WHERE username = $2', [hashedPassword, ADMIN_USERNAME]);
        }
        await client.query('COMMIT');
        console.log('✅ Tables ready');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
    }
};
createTables();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', generalLimiter);
const loginLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        if (!result.rows[0]?.is_admin) return res.status(403).json({ error: 'Forbidden' });
        next();
    } catch { res.status(500).json({ error: 'Server error' }); }
};

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, secretQuestion, secretAnswer } = req.body;
        if (!username?.trim() || !password?.trim()) return res.status(400).json({ error: 'Username and password required' });
        if (username.length < 3 || password.length < 6) return res.status(400).json({ error: 'Invalid length' });
        const hashedPassword = await bcrypt.hash(password, 12);
        const hashedAnswer = secretAnswer ? await bcrypt.hash(secretAnswer.toLowerCase(), 12) : null;
        const result = await pool.query(
            'INSERT INTO users (username, password, secret_question, secret_answer) VALUES ($1, $2, $3, $4) RETURNING id',
            [username.trim(), hashedPassword, secretQuestion?.trim() || null, hashedAnswer]
        );
        const userId = result.rows[0].id;
        const token = jwt.sign({ id: userId, username: username.trim() }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: userId, username: username.trim(), is_public: false, wallet_connected: false, first_login: true, is_admin: false } });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Username taken' });
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim()) return res.status(400).json({ error: 'Credentials required' });
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
        if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
        const user = result.rows[0];
        if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user.id, username: user.username, is_public: user.is_public, wallet_connected: user.wallet_connected, first_login: user.first_login, is_admin: user.is_admin, wallet_address: user.wallet_address, wallet_type: user.wallet_type } });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { username } = req.body;
    try {
        const result = await pool.query('SELECT secret_question FROM users WHERE username = $1', [username?.trim()]);
        if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
        res.json({ secretQuestion: result.rows[0].secret_question });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { username, secretAnswer, newPassword } = req.body;
    if (!username?.trim() || !secretAnswer?.trim() || !newPassword?.trim() || newPassword.length < 6) return res.status(400).json({ error: 'Invalid data' });
    try {
        const result = await pool.query('SELECT secret_answer FROM users WHERE username = $1', [username.trim()]);
        if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
        if (!await bcrypt.compare(secretAnswer.toLowerCase(), result.rows[0].secret_answer)) return res.status(401).json({ error: 'Wrong answer' });
        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [await bcrypt.hash(newPassword, 12), username.trim()]);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword?.trim() || !newPassword?.trim() || newPassword.length < 6) return res.status(400).json({ error: 'Invalid data' });
    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (!await bcrypt.compare(currentPassword, result.rows[0].password)) return res.status(401).json({ error: 'Wrong password' });
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [await bcrypt.hash(newPassword, 12), req.user.id]);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/user/skip-wallet', authenticateToken, async (req, res) => {
    try { await pool.query('UPDATE users SET first_login = false WHERE id = $1', [req.user.id]); res.json({ success: true }); }
    catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/user/wallet', authenticateToken, async (req, res) => {
    const { wallet_address, wallet_type } = req.body;
    if (!wallet_address?.trim() || !wallet_type?.trim()) return res.status(400).json({ error: 'Address and type required' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET wallet_connected = true, wallet_address = $1, wallet_type = $2, is_public = true, first_login = false WHERE id = $3', [wallet_address.trim(), wallet_type.trim(), req.user.id]);
        const demoTrades = generateWalletTrades(wallet_address.trim());
        if (demoTrades.length) {
            const params = [req.user.id];
            const placeholders = demoTrades.map((_, i) => `($1, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5}, $${i*5+6})`).join(',');
            demoTrades.forEach(t => params.push(t.id, t.pair, t.volume, t.type, t.timestamp));
            await client.query(`INSERT INTO trades (user_id, id, pair, volume, type, timestamp) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`, params);
        }
        await client.query('COMMIT');
        res.json({ success: true, wallet_connected: true, trades_imported: demoTrades.length });
    } catch { await client.query('ROLLBACK'); res.status(500).json({ error: 'Server error' }); }
    finally { client.release(); }
});

app.post('/api/user/wallet/disconnect', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET wallet_connected = false, wallet_address = NULL, wallet_type = NULL, is_public = false WHERE id = $1', [req.user.id]);
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/trades', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, pair, volume, type, timestamp FROM trades WHERE user_id = $1 ORDER BY timestamp DESC', [req.user.id]);
        res.json(result.rows);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/trades', authenticateToken, async (req, res) => {
    const { id, pair, volume, type, timestamp } = req.body;
    if (!id || !pair?.trim() || !volume || !type || !timestamp) return res.status(400).json({ error: 'All fields required' });
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) return res.status(403).json({ error: 'Manual entry disabled for Pro' });
        await pool.query('INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6)', [id, req.user.id, pair.trim().toUpperCase(), volume, type, timestamp]);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/trades/:id', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) return res.status(403).json({ error: 'Delete disabled for Pro' });
        await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/trades/sync', authenticateToken, async (req, res) => {
    const { trades } = req.body;
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'Invalid format' });
    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);
        if (trades.length) {
            const params = [req.user.id];
            const placeholders = trades.map((_, i) => `($1, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5}, $${i*5+6})`).join(',');
            trades.forEach(t => params.push(t.id, t.pair, t.volume, t.type, t.timestamp));
            await pool.query(`INSERT INTO trades (user_id, id, pair, volume, type, timestamp) VALUES ${placeholders}`, params);
        }
        await pool.query('COMMIT');
        res.json({ success: true, count: trades.length });
    } catch { await pool.query('ROLLBACK'); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/user/public', authenticateToken, async (req, res) => {
    const { is_public } = req.body;
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (!user.rows[0].wallet_connected) return res.status(403).json({ error: 'Pro required' });
        await pool.query('UPDATE users SET is_public = $1 WHERE id = $2', [!!is_public, req.user.id]);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/premium/analytics', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT wallet_connected, is_admin FROM users WHERE id = $1', [req.user.id]);
        if (!user.rows[0].wallet_connected && !user.rows[0].is_admin) return res.status(403).json({ error: 'Pro required' });
        const trades = await pool.query('SELECT * FROM trades WHERE user_id = $1 ORDER BY timestamp', [req.user.id]);
        res.json(calculatePremiumAnalytics(trades.rows));
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leaderboard', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.wallet_type, COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl, COUNT(t.id) as total_trades, COALESCE(ROUND(100.0 * SUM(CASE WHEN t.type = 'profit' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 1), 0) as win_rate
            FROM users u LEFT JOIN trades t ON u.id = t.user_id WHERE u.is_public = true AND u.wallet_connected = true GROUP BY u.id HAVING COUNT(t.id) > 0 ORDER BY total_pl DESC LIMIT $1`, [limit]);
        res.json(result.rows.map((r, i) => ({ rank: i+1, ...r, totalPL: Math.round(r.total_pl*100)/100 })));
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT u.id, u.username, u.wallet_connected, COUNT(t.id) as trades_count, COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl FROM users u LEFT JOIN trades t ON u.id = t.user_id WHERE u.is_admin = false GROUP BY u.id ORDER BY u.created_at DESC`);
        res.json(result.rows);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM users WHERE id = $1 AND is_admin = false', [req.params.userId]); res.json({ success: true }); }
    catch { res.status(500).json({ error: 'Server error' }); }
});

function generateWalletTrades(address) {
    const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD'];
    const trades = [];
    for (let i = 0; i < Math.floor(Math.random()*15)+10; i++) {
        trades.push({ id: `wallet-${address.slice(0,8)}-${Date.now()}-${i}`, pair: pairs[Math.floor(Math.random()*pairs.length)], volume: +(Math.random()*5+0.5).toFixed(2), type: Math.random() > 0.35 ? 'profit' : 'loss', timestamp: Date.now() - i*3600000 - Math.random()*86400000 });
    }
    return trades;
}

function calculatePremiumAnalytics(rows) {
    const profitTrades = rows.filter(t => t.type === 'profit'), lossTrades = rows.filter(t => t.type === 'loss');
    const avgProfit = profitTrades.length ? profitTrades.reduce((a,t) => a+t.volume, 0) / profitTrades.length : 0;
    const avgLoss = lossTrades.length ? lossTrades.reduce((a,t) => a+t.volume, 0) / lossTrades.length : 0;
    const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : 0;
    const winRate = rows.length ? (profitTrades.length / rows.length) * 100 : 0;
    const returns = rows.map(t => t.type === 'profit' ? t.volume : -t.volume);
    const avgReturn = returns.length ? returns.reduce((a,r) => a+r, 0) / returns.length : 0;
    const variance = returns.length ? returns.reduce((a,r) => a + Math.pow(r-avgReturn,2), 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    let peak = 0, maxDrawdown = 0, runningPL = 0;
    rows.forEach(t => { runningPL += t.type === 'profit' ? t.volume : -t.volume; peak = Math.max(peak, runningPL); maxDrawdown = Math.max(maxDrawdown, peak - runningPL); });
    const pairs = {}; rows.forEach(t => { pairs[t.pair] = (pairs[t.pair]||0) + (t.type==='profit'?t.volume:-t.volume); });
    const sortedPairs = Object.entries(pairs).sort((a,b) => b[1]-a[1]);
    const days = {}; rows.forEach(t => { const d = new Date(t.timestamp).toLocaleDateString('ru-RU'); days[d] = (days[d]||0) + (t.type==='profit'?t.volume:-t.volume); });
    const sortedDays = Object.entries(days).sort((a,b) => b[1]-a[1]);
    return { totalTrades: rows.length, profitTrades: profitTrades.length, lossTrades: lossTrades.length, winRate: Math.round(winRate*10)/10, avgProfit: Math.round(avgProfit*100)/100, avgLoss: Math.round(avgLoss*100)/100, profitFactor: Math.round(profitFactor*100)/100, sharpeRatio: Math.round(sharpeRatio*100)/100, maxDrawdown: Math.round(maxDrawdown*100)/100, monthlyProjection: Math.round(avgReturn*30*100)/100, bestPair: sortedPairs[0]?.[0]||'—', worstPair: sortedPairs[sortedPairs.length-1]?.[0]||'—', bestDay: sortedDays[0]?{date:sortedDays[0][0],pl:Math.round(sortedDays[0][1]*100)/100}:null, worstDay: sortedDays[sortedDays.length-1]?{date:sortedDays[sortedDays.length-1][0],pl:Math.round(sortedDays[sortedDays.length-1][1]*100)/100}:null };
}

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1y' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
process.on('SIGTERM', () => pool.end().then(() => process.exit(0)));