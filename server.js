require('dotenv').config();

// ========== Валидация окружения ==========
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ FATAL: ${envVar} is required`);
        process.exit(1);
    }
}

const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TradeumAdmin2024!';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

// ========== Logger (pino) ==========
let logger;
try {
    const pino = require('pino');
    logger = pino({
        level: NODE_ENV === 'production' ? 'info' : 'debug',
        transport: NODE_ENV !== 'production' ? {
            target: 'pino-pretty',
            options: { colorize: true }
        } : undefined,
        formatters: {
            level(label) {
                return { level: label };
            }
        }
    });
} catch (err) {
    logger = console;
    logger.warn('pino not installed, using console. Run: npm install pino pino-pretty');
}

const app = express();
app.use(compression());

// ========== Database Pool ==========
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error');
});

// ========== Миграция (создание таблиц) ==========
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

        // Admin user setup
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const existingAdmin = await client.query('SELECT id FROM users WHERE username = $1', [ADMIN_USERNAME]);
        if (existingAdmin.rows.length === 0) {
            await client.query(
                `INSERT INTO users (username, password, is_admin, first_login, wallet_connected) VALUES ($1, $2, true, false, true)`,
                [ADMIN_USERNAME, hashedPassword]
            );
            logger.info('Admin user created');
        } else {
            await client.query(
                'UPDATE users SET password = $1, is_admin = true WHERE username = $2',
                [hashedPassword, ADMIN_USERNAME]
            );
        }
        await client.query('COMMIT');
        logger.info('✅ Database migration completed');
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err }, 'Migration failed');
        throw err;
    } finally {
        client.release();
    }
};

// ========== Security Middlewares ==========
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// ========== Rate Limiting ==========
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', generalLimiter);

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later' }
});

// ========== JWT Helpers ==========
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
};

const setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
    });
};

const clearTokenCookie = (res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
};

// ========== Auth Middleware ==========
const authenticateToken = (req, res, next) => {
    // Проверяем токен в куке или заголовке
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            clearTokenCookie(res);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        if (!result.rows[0]?.is_admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    } catch (err) {
        logger.error({ err }, 'Admin middleware error');
        res.status(500).json({ error: 'Server error' });
    }
};

// ========== Health Check ==========
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', uptime: process.uptime() });
    } catch (err) {
        res.status(503).json({ status: 'degraded', error: 'Database unavailable' });
    }
});

// ========== Auth Routes ==========

// Проверка авторизации (для клиента)
app.get('/api/auth/check', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows.length) {
            clearTokenCookie(res);
            return res.status(401).json({ error: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    } catch (err) {
        logger.error({ err }, 'Auth check error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, secretQuestion, secretAnswer } = req.body;
        if (!username?.trim() || !password?.trim()) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        if (username.trim().length < 3 || password.length < 6) {
            return res.status(400).json({ error: 'Username must be at least 3 characters, password at least 6' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const hashedAnswer = secretAnswer ? await bcrypt.hash(secretAnswer.toLowerCase(), 12) : null;

        const result = await pool.query(
            'INSERT INTO users (username, password, secret_question, secret_answer) VALUES ($1, $2, $3, $4) RETURNING id, username',
            [username.trim(), hashedPassword, secretQuestion?.trim() || null, hashedAnswer]
        );

        const user = result.rows[0];
        const token = generateToken({ id: user.id, username: user.username });

        setTokenCookie(res, token);

        res.json({
            token, // Оставляем для совместимости
            user: {
                id: user.id,
                username: user.username,
                is_public: false,
                wallet_connected: false,
                first_login: true,
                is_admin: false
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Username already taken' });
        }
        logger.error({ error }, 'Registration error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: 'Credentials required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
        if (!result.rows.length) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({ id: user.id, username: user.username });
        setTokenCookie(res, token);

        logger.info({ userId: user.id, username: user.username }, 'User logged in');

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                is_public: user.is_public,
                wallet_connected: user.wallet_connected,
                first_login: user.first_login,
                is_admin: user.is_admin,
                wallet_address: user.wallet_address,
                wallet_type: user.wallet_type
            }
        });
    } catch (err) {
        logger.error({ err }, 'Login error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    clearTokenCookie(res);
    res.json({ success: true });
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { username } = req.body;
    try {
        const result = await pool.query(
            'SELECT secret_question FROM users WHERE username = $1',
            [username?.trim()]
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ secretQuestion: result.rows[0].secret_question });
    } catch (err) {
        logger.error({ err }, 'Forgot password error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { username, secretAnswer, newPassword } = req.body;
    if (!username?.trim() || !secretAnswer?.trim() || !newPassword?.trim() || newPassword.length < 6) {
        return res.status(400).json({ error: 'Invalid data. New password must be at least 6 characters' });
    }

    try {
        const result = await pool.query(
            'SELECT secret_answer FROM users WHERE username = $1',
            [username.trim()]
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const answerMatch = await bcrypt.compare(secretAnswer.toLowerCase().trim(), result.rows[0].secret_answer);
        if (!answerMatch) {
            return res.status(401).json({ error: 'Wrong answer' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE users SET password = $1 WHERE username = $2',
            [hashedPassword, username.trim()]
        );

        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Reset password error');
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== User Routes ==========
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword?.trim() || !newPassword?.trim() || newPassword.length < 6) {
        return res.status(400).json({ error: 'Invalid data. New password must be at least 6 characters' });
    }

    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const passwordMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        logger.info({ userId: req.user.id }, 'Password changed');
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Change password error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows.length) {
            clearTokenCookie(res);
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        logger.error({ err }, 'Profile fetch error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/skip-wallet', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET first_login = false WHERE id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Skip wallet error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/wallet', authenticateToken, async (req, res) => {
    const { wallet_address, wallet_type } = req.body;
    if (!wallet_address?.trim() || !wallet_type?.trim()) {
        return res.status(400).json({ error: 'Address and type required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'UPDATE users SET wallet_connected = true, wallet_address = $1, wallet_type = $2, is_public = true, first_login = false WHERE id = $3',
            [wallet_address.trim(), wallet_type.trim(), req.user.id]
        );

        const demoTrades = generateWalletTrades(wallet_address.trim());
        if (demoTrades.length) {
            const params = [req.user.id];
            const placeholders = demoTrades.map((_, i) =>
                `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`
            ).join(',');
            demoTrades.forEach(t => params.push(t.id, t.pair, t.volume, t.type, t.timestamp));

            await client.query(
                `INSERT INTO trades (user_id, id, pair, volume, type, timestamp) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`,
                params
            );
        }

        await client.query('COMMIT');
        logger.info({ userId: req.user.id, wallet_type }, 'Wallet connected');
        res.json({ success: true, wallet_connected: true, trades_imported: demoTrades.length });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err }, 'Wallet connection error');
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

app.post('/api/user/wallet/disconnect', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE users SET wallet_connected = false, wallet_address = NULL, wallet_type = NULL, is_public = false WHERE id = $1',
            [req.user.id]
        );
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);
        logger.info({ userId: req.user.id }, 'Wallet disconnected');
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Wallet disconnect error');
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== Trades Routes ==========
app.get('/api/trades', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, pair, volume, type, timestamp FROM trades WHERE user_id = $1 ORDER BY timestamp DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error({ err }, 'Fetch trades error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/trades', authenticateToken, async (req, res) => {
    const { id, pair, volume, type, timestamp } = req.body;
    if (!id || !pair?.trim() || !volume || !type || !timestamp) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) {
            return res.status(403).json({ error: 'Manual entry disabled for Pro users' });
        }

        await pool.query(
            'INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, req.user.id, pair.trim().toUpperCase(), volume, type, timestamp]
        );
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Add trade error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/trades/:id', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) {
            return res.status(403).json({ error: 'Delete disabled for Pro users' });
        }

        await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Delete trade error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/trades/sync', authenticateToken, async (req, res) => {
    const { trades } = req.body;
    if (!Array.isArray(trades)) {
        return res.status(400).json({ error: 'Invalid format. Expected an array of trades' });
    }

    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);

        if (trades.length) {
            const params = [req.user.id];
            const placeholders = trades.map((_, i) =>
                `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`
            ).join(',');
            trades.forEach(t => params.push(t.id, t.pair, t.volume, t.type, t.timestamp));

            await pool.query(
                `INSERT INTO trades (user_id, id, pair, volume, type, timestamp) VALUES ${placeholders}`,
                params
            );
        }

        await pool.query('COMMIT');
        logger.info({ userId: req.user.id, count: trades.length }, 'Trades synced');
        res.json({ success: true, count: trades.length });
    } catch (err) {
        await pool.query('ROLLBACK');
        logger.error({ err }, 'Sync trades error');
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== Premium & Leaderboard ==========
app.post('/api/user/public', authenticateToken, async (req, res) => {
    const { is_public } = req.body;
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (!user.rows[0].wallet_connected) {
            return res.status(403).json({ error: 'Pro required' });
        }

        await pool.query('UPDATE users SET is_public = $1 WHERE id = $2', [!!is_public, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Public toggle error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/premium/analytics', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT wallet_connected, is_admin FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!user.rows[0].wallet_connected && !user.rows[0].is_admin) {
            return res.status(403).json({ error: 'Pro required' });
        }

        const trades = await pool.query(
            'SELECT * FROM trades WHERE user_id = $1 ORDER BY timestamp',
            [req.user.id]
        );
        res.json(calculatePremiumAnalytics(trades.rows));
    } catch (err) {
        logger.error({ err }, 'Premium analytics error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    try {
        const result = await pool.query(`
            SELECT
                u.id, u.username, u.wallet_type,
                COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl,
                COUNT(t.id) as total_trades,
                COALESCE(ROUND(100.0 * SUM(CASE WHEN t.type = 'profit' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 1), 0) as win_rate
            FROM users u
            LEFT JOIN trades t ON u.id = t.user_id
            WHERE u.is_public = true AND u.wallet_connected = true
            GROUP BY u.id
            HAVING COUNT(t.id) > 0
            ORDER BY total_pl DESC
            LIMIT $1
        `, [limit]);

        res.json(result.rows.map((r, i) => ({
            rank: i + 1,
            ...r,
            totalPL: Math.round(r.total_pl * 100) / 100
        })));
    } catch (err) {
        logger.error({ err }, 'Leaderboard error');
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== Admin Routes ==========
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id, u.username, u.wallet_connected,
                COUNT(t.id) as trades_count,
                COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl
            FROM users u
            LEFT JOIN trades t ON u.id = t.user_id
            WHERE u.is_admin = false
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        logger.error({ err }, 'Admin users fetch error');
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 AND is_admin = false',
            [req.params.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found or cannot be deleted' });
        }
        logger.info({ deletedUserId: req.params.userId, byAdmin: req.user.id }, 'User deleted by admin');
        res.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Admin delete user error');
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== Helper Functions ==========
function generateWalletTrades(address) {
    const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD'];
    const trades = [];
    const tradeCount = Math.floor(Math.random() * 15) + 10;

    for (let i = 0; i < tradeCount; i++) {
        trades.push({
            id: crypto.randomUUID(),
            pair: pairs[Math.floor(Math.random() * pairs.length)],
            volume: +(Math.random() * 5 + 0.5).toFixed(2),
            type: Math.random() > 0.35 ? 'profit' : 'loss',
            timestamp: Date.now() - i * 3600000 - Math.random() * 86400000
        });
    }
    return trades;
}

function calculatePremiumAnalytics(rows) {
    if (!rows.length) {
        return {
            totalTrades: 0, profitTrades: 0, lossTrades: 0,
            winRate: 0, avgProfit: 0, avgLoss: 0,
            profitFactor: 0, sharpeRatio: 0, maxDrawdown: 0,
            monthlyProjection: 0, bestPair: '—', worstPair: '—',
            bestDay: null, worstDay: null
        };
    }

    const profitTrades = rows.filter(t => t.type === 'profit');
    const lossTrades = rows.filter(t => t.type === 'loss');

    const avgProfit = profitTrades.length
        ? profitTrades.reduce((a, t) => a + t.volume, 0) / profitTrades.length
        : 0;
    const avgLoss = lossTrades.length
        ? lossTrades.reduce((a, t) => a + t.volume, 0) / lossTrades.length
        : 0;
    const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : avgProfit > 0 ? Infinity : 0;
    const winRate = rows.length ? (profitTrades.length / rows.length) * 100 : 0;

    const returns = rows.map(t => t.type === 'profit' ? t.volume : -t.volume);
    const avgReturn = returns.length
        ? returns.reduce((a, r) => a + r, 0) / returns.length
        : 0;
    const variance = returns.length
        ? returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length
        : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    let peak = 0, maxDrawdown = 0, runningPL = 0;
    rows.forEach(t => {
        runningPL += t.type === 'profit' ? t.volume : -t.volume;
        peak = Math.max(peak, runningPL);
        maxDrawdown = Math.max(maxDrawdown, peak - runningPL);
    });

    const pairs = {};
    rows.forEach(t => {
        pairs[t.pair] = (pairs[t.pair] || 0) + (t.type === 'profit' ? t.volume : -t.volume);
    });
    const sortedPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]);

    const days = {};
    rows.forEach(t => {
        const d = new Date(t.timestamp).toLocaleDateString('ru-RU');
        days[d] = (days[d] || 0) + (t.type === 'profit' ? t.volume : -t.volume);
    });
    const sortedDays = Object.entries(days).sort((a, b) => b[1] - a[1]);

    return {
        totalTrades: rows.length,
        profitTrades: profitTrades.length,
        lossTrades: lossTrades.length,
        winRate: Math.round(winRate * 10) / 10,
        avgProfit: Math.round(avgProfit * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        profitFactor: profitFactor === Infinity ? '∞' : Math.round(profitFactor * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        monthlyProjection: Math.round(avgReturn * 30 * 100) / 100,
        bestPair: sortedPairs[0]?.[0] || '—',
        worstPair: sortedPairs[sortedPairs.length - 1]?.[0] || '—',
        bestDay: sortedDays[0] ? { date: sortedDays[0][0], pl: Math.round(sortedDays[0][1] * 100) / 100 } : null,
        worstDay: sortedDays[sortedDays.length - 1] ? { date: sortedDays[sortedDays.length - 1][0], pl: Math.round(sortedDays[sortedDays.length - 1][1] * 100) / 100 } : null
    };
}

// ========== Static Files & SPA Fallback ==========
if (NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public'), {
        maxAge: '30d',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
    logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
});

// ========== Start Server ==========
const startServer = async () => {
    try {
        await createTables();
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT} [${NODE_ENV}]`);
        });
    } catch (err) {
        logger.fatal({ err }, 'Failed to start server');
        process.exit(1);
    }
};

startServer();

// ========== Graceful Shutdown ==========
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception');
    process.exit(1);
});