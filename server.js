require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'tradeum-super-secret-' + Math.random().toString(36);
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TradeumAdmin2024!';

if (!DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required');
    process.exit(1);
}

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

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('DB Pool Error:', err.message));

// Создание таблиц
(async () => {
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

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const existingAdmin = await client.query('SELECT id FROM users WHERE username = $1', [ADMIN_USERNAME]);
        if (existingAdmin.rows.length === 0) {
            await client.query(
                'INSERT INTO users (username, password, is_admin, first_login, wallet_connected) VALUES ($1, $2, true, false, true)',
                [ADMIN_USERNAME, hashedPassword]
            );
        } else {
            await client.query(
                'UPDATE users SET password = $1, is_admin = true WHERE username = $2',
                [hashedPassword, ADMIN_USERNAME]
            );
        }
        await client.query('COMMIT');
        console.log('Database ready');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
    }
})();

// Auth middleware
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

// Health
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(503).json({ status: 'error', message: err.message });
    }
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, secretQuestion, secretAnswer } = req.body;
        if (!username?.trim() || !password?.trim()) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        if (username.trim().length < 3 || password.length < 6) {
            return res.status(400).json({ error: 'Username min 3, password min 6 chars' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const hashedAnswer = secretAnswer ? await bcrypt.hash(secretAnswer.toLowerCase(), 12) : null;

        const result = await pool.query(
            'INSERT INTO users (username, password, secret_question, secret_answer) VALUES ($1, $2, $3, $4) RETURNING id',
            [username.trim(), hashedPassword, secretQuestion?.trim() || null, hashedAnswer]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, username: username.trim() }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user.id,
                username: username.trim(),
                is_public: false,
                wallet_connected: false,
                first_login: true,
                is_admin: false
            }
        });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Username already taken' });
        console.error('Register error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: 'Credentials required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
        if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        if (!await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

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
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Profile error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/skip-wallet', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET first_login = false WHERE id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Skip wallet error:', err.message);
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

        const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD'];
        for (let i = 0; i < 10; i++) {
            await client.query(
                'INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
                [crypto.randomUUID(), req.user.id, pairs[Math.floor(Math.random() * pairs.length)], +(Math.random() * 5 + 0.5).toFixed(2), Math.random() > 0.35 ? 'profit' : 'loss', Date.now() - i * 86400000]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, wallet_connected: true, trades_imported: 10 });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Wallet error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

app.post('/api/user/wallet/disconnect', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET wallet_connected = false, wallet_address = NULL, wallet_type = NULL, is_public = false WHERE id = $1', [req.user.id]);
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Disconnect error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/trades', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, pair, volume, type, timestamp FROM trades WHERE user_id = $1 ORDER BY timestamp DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Trades error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/trades', authenticateToken, async (req, res) => {
    const { id, pair, volume, type, timestamp } = req.body;
    if (!id || !pair || !volume || !type || !timestamp) return res.status(400).json({ error: 'All fields required' });
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) return res.status(403).json({ error: 'Manual entry disabled for Pro' });
        await pool.query('INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6)', [id, req.user.id, pair.trim().toUpperCase(), volume, type, timestamp]);
        res.json({ success: true });
    } catch (err) {
        console.error('Add trade error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/trades/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Server on ${PORT}`));