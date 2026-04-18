require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const DB_PATH = process.env.DB_PATH || './database.sqlite';

// Админ-аккаунт
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'TradeumAdmin2024!';

// Безопасность
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cryptologos.cc"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https://cryptologos.cc"],
        },
    },
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(DB_PATH);

// Создание таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_public BOOLEAN DEFAULT 0,
        wallet_connected BOOLEAN DEFAULT 0,
        wallet_address TEXT,
        wallet_type TEXT,
        first_login BOOLEAN DEFAULT 1,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        pair TEXT NOT NULL,
        volume REAL NOT NULL,
        type TEXT CHECK(type IN ('profit', 'loss')) NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_public ON users(is_public)`);

    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) return;
        const columns = rows.map(r => r.name);

        if (!columns.includes('wallet_connected')) {
            db.run(`ALTER TABLE users ADD COLUMN wallet_connected BOOLEAN DEFAULT 0`);
        }
        if (!columns.includes('wallet_address')) {
            db.run(`ALTER TABLE users ADD COLUMN wallet_address TEXT`);
        }
        if (!columns.includes('wallet_type')) {
            db.run(`ALTER TABLE users ADD COLUMN wallet_type TEXT`);
        }
        if (!columns.includes('first_login')) {
            db.run(`ALTER TABLE users ADD COLUMN first_login BOOLEAN DEFAULT 1`);
        }
        if (!columns.includes('is_admin')) {
            db.run(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0`);
        }
    });

    // Создаём админ-аккаунт
    bcrypt.hash(ADMIN_PASSWORD, 10, (err, hash) => {
        if (err) return;
        db.run(
            'INSERT OR IGNORE INTO users (username, password, is_admin, first_login, wallet_connected) VALUES (?, ?, 1, 0, 1)',
            [ADMIN_USERNAME, hash]
        );
    });
});

// Middleware для JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Недействительный токен' });
        req.user = user;
        next();
    });
};

// Middleware для админа
const requireAdmin = (req, res, next) => {
    db.get('SELECT is_admin FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user || !user.is_admin) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        next();
    });
};

// ========== API Роуты ==========

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Имя и пароль обязательны' });
        }
        if (username.length < 3 || password.length < 6) {
            return res.status(400).json({ error: 'Имя: мин 3 символа, пароль: мин 6' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (username, password, is_public, wallet_connected, first_login) VALUES (?, ?, 0, 0, 1)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Пользователь уже существует' });
                    }
                    return res.status(500).json({ error: 'Ошибка сервера' });
                }
                const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '30d' });
                res.json({
                    token,
                    user: {
                        id: this.lastID,
                        username,
                        is_public: false,
                        wallet_connected: false,
                        first_login: true,
                        is_admin: false
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Логин
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Имя и пароль обязательны' });
    }

    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Неверное имя или пароль' });
            }
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Неверное имя или пароль' });
            }
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    is_public: user.is_public === 1,
                    wallet_connected: user.wallet_connected === 1,
                    first_login: user.first_login === 1,
                    is_admin: user.is_admin === 1,
                    wallet_address: user.wallet_address,
                    wallet_type: user.wallet_type
                }
            });
        }
    );
});

// Статус пользователя
app.get('/api/user/status', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
            res.json({
                ...user,
                is_public: user.is_public === 1,
                wallet_connected: user.wallet_connected === 1,
                first_login: user.first_login === 1,
                is_admin: user.is_admin === 1
            });
        }
    );
});

// Профиль
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
            res.json({
                ...user,
                is_public: user.is_public === 1,
                wallet_connected: user.wallet_connected === 1,
                first_login: user.first_login === 1,
                is_admin: user.is_admin === 1
            });
        }
    );
});

// Завершить первый вход
app.post('/api/user/first-login-complete', authenticateToken, (req, res) => {
    db.run('UPDATE users SET first_login = 0 WHERE id = ?', [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка' });
        res.json({ success: true });
    });
});

// Пропустить подключение кошелька
app.post('/api/user/skip-wallet', authenticateToken, (req, res) => {
    db.run('UPDATE users SET first_login = 0 WHERE id = ?', [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка' });
        res.json({ success: true });
    });
});

// Публичность
app.post('/api/user/public', authenticateToken, (req, res) => {
    const { is_public } = req.body;
    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (!user.wallet_connected) {
            return res.status(403).json({ error: 'Требуется подключение кошелька' });
        }
        db.run('UPDATE users SET is_public = ? WHERE id = ?', [is_public ? 1 : 0, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка обновления' });
            res.json({ success: true, is_public: !!is_public });
        });
    });
});

// Подключение кошелька
app.post('/api/user/wallet', authenticateToken, (req, res) => {
    const { wallet_address, wallet_type } = req.body;
    if (!wallet_address || !wallet_type) {
        return res.status(400).json({ error: 'Адрес и тип кошелька обязательны' });
    }
    db.run(
        'UPDATE users SET wallet_connected = 1, wallet_address = ?, wallet_type = ?, is_public = 1, first_login = 0 WHERE id = ?',
        [wallet_address, wallet_type, req.user.id],
        async (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка подключения' });
            const demoTrades = generateWalletTrades(wallet_address);
            await importTradesToDB(req.user.id, demoTrades);
            res.json({ success: true, wallet_connected: true, trades_imported: demoTrades.length });
        }
    );
});

// Отключение кошелька
app.post('/api/user/wallet/disconnect', authenticateToken, (req, res) => {
    db.run(
        'UPDATE users SET wallet_connected = 0, wallet_address = NULL, wallet_type = NULL, is_public = 0 WHERE id = ?',
        [req.user.id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            db.run('DELETE FROM trades WHERE user_id = ?', [req.user.id]);
            res.json({ success: true, wallet_connected: false });
        }
    );
});

// Сделки
app.get('/api/trades', authenticateToken, (req, res) => {
    db.all(
        'SELECT id, pair, volume, type, timestamp FROM trades WHERE user_id = ? ORDER BY timestamp DESC',
        [req.user.id],
        (err, trades) => res.json(trades || [])
    );
});

app.post('/api/trades', authenticateToken, (req, res) => {
    const { id, pair, volume, type, timestamp } = req.body;
    if (!id || !pair || !volume || !type || !timestamp) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.wallet_connected) {
            return res.status(403).json({ error: 'Ручное добавление недоступно для Pro' });
        }
        db.run(
            'INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.user.id, pair.toUpperCase(), volume, type, timestamp],
            (err) => {
                if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
                res.json({ success: true });
            }
        );
    });
});

app.put('/api/trades/:id', authenticateToken, (req, res) => {
    const { pair, volume, type } = req.body;
    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.wallet_connected) return res.status(403).json({ error: 'Редактирование недоступно для Pro' });
        db.run(
            'UPDATE trades SET pair = ?, volume = ?, type = ? WHERE id = ? AND user_id = ?',
            [pair.toUpperCase(), volume, type, req.params.id, req.user.id],
            function(err) {
                if (err) return res.status(500).json({ error: 'Ошибка' });
                if (this.changes === 0) return res.status(404).json({ error: 'Сделка не найдена' });
                res.json({ success: true });
            }
        );
    });
});

app.delete('/api/trades/:id', authenticateToken, (req, res) => {
    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.wallet_connected) return res.status(403).json({ error: 'Удаление недоступно для Pro' });
        db.run('DELETE FROM trades WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            if (this.changes === 0) return res.status(404).json({ error: 'Сделка не найдена' });
            res.json({ success: true });
        });
    });
});

app.post('/api/trades/sync', authenticateToken, (req, res) => {
    const { trades } = req.body;
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'Неверный формат' });
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM trades WHERE user_id = ?', [req.user.id]);
        const stmt = db.prepare('INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
        trades.forEach(t => stmt.run([t.id, req.user.id, t.pair, t.volume, t.type, t.timestamp]));
        stmt.finalize();
        db.run('COMMIT', (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка синхронизации' });
            res.json({ success: true, count: trades.length });
        });
    });
});

// Статистика
app.get('/api/user/stats', authenticateToken, (req, res) => {
    db.all(
        `SELECT type, SUM(volume) as total_volume, COUNT(*) as count FROM trades WHERE user_id = ? GROUP BY type`,
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            let totalPL = 0, wins = 0, totalCount = 0, maxProfit = 0, maxLoss = 0, profitSum = 0, lossSum = 0;
            rows.forEach(row => {
                totalCount += row.count;
                if (row.type === 'profit') {
                    totalPL += row.total_volume;
                    wins += row.count;
                    profitSum += row.total_volume;
                    maxProfit = Math.max(maxProfit, row.total_volume / row.count);
                } else {
                    totalPL -= row.total_volume;
                    lossSum += row.total_volume;
                    maxLoss = Math.max(maxLoss, row.total_volume / row.count);
                }
            });
            const winRate = totalCount > 0 ? (wins / totalCount) * 100 : 0;
            const avgProfit = wins > 0 ? profitSum / wins : 0;
            const avgLoss = (totalCount - wins) > 0 ? lossSum / (totalCount - wins) : 0;
            res.json({
                totalPL: Math.round(totalPL * 100) / 100,
                winRate: Math.round(winRate * 10) / 10,
                totalTrades: totalCount, wins, losses: totalCount - wins,
                avgProfit: Math.round(avgProfit * 100) / 100,
                avgLoss: Math.round(avgLoss * 100) / 100,
                maxProfit: Math.round(maxProfit * 100) / 100,
                maxLoss: Math.round(maxLoss * 100) / 100
            });
        }
    );
});

// Premium аналитика
app.get('/api/premium/analytics', authenticateToken, (req, res) => {
    db.get('SELECT wallet_connected, is_admin FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (!user.wallet_connected && !user.is_admin) {
            return res.status(403).json({ error: 'Требуется Pro статус' });
        }

        db.all('SELECT * FROM trades WHERE user_id = ? ORDER BY timestamp', [req.user.id], (err, trades) => {
            if (err) return res.status(500).json({ error: 'Ошибка' });

            const profitTrades = trades.filter(t => t.type === 'profit');
            const lossTrades = trades.filter(t => t.type === 'loss');
            const avgProfit = profitTrades.length ? profitTrades.reduce((a, t) => a + t.volume, 0) / profitTrades.length : 0;
            const avgLoss = lossTrades.length ? lossTrades.reduce((a, t) => a + t.volume, 0) / lossTrades.length : 0;
            const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : 0;
            const winRate = trades.length ? (profitTrades.length / trades.length) * 100 : 0;

            const returns = trades.map(t => t.type === 'profit' ? t.volume : -t.volume);
            const avgReturn = returns.length ? returns.reduce((a, r) => a + r, 0) / returns.length : 0;
            const variance = returns.length ? returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
            const stdDev = Math.sqrt(variance);
            const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

            let peak = 0, maxDrawdown = 0, runningPL = 0;
            trades.forEach(t => {
                runningPL += t.type === 'profit' ? t.volume : -t.volume;
                peak = Math.max(peak, runningPL);
                maxDrawdown = Math.max(maxDrawdown, peak - runningPL);
            });

            const monthlyProjection = avgReturn * 30;

            res.json({
                totalTrades: trades.length,
                profitTrades: profitTrades.length,
                lossTrades: lossTrades.length,
                winRate: Math.round(winRate * 10) / 10,
                avgProfit: Math.round(avgProfit * 100) / 100,
                avgLoss: Math.round(avgLoss * 100) / 100,
                profitFactor: Math.round(profitFactor * 100) / 100,
                sharpeRatio: Math.round(sharpeRatio * 100) / 100,
                maxDrawdown: Math.round(maxDrawdown * 100) / 100,
                monthlyProjection: Math.round(monthlyProjection * 100) / 100,
                bestPair: getBestPair(trades),
                worstPair: getWorstPair(trades),
                bestDay: getBestDay(trades),
                worstDay: getWorstDay(trades)
            });
        });
    });
});

// Вспомогательные функции для Premium
function getBestPair(trades) {
    const pairs = {};
    trades.forEach(t => {
        if (!pairs[t.pair]) pairs[t.pair] = 0;
        pairs[t.pair] += t.type === 'profit' ? t.volume : -t.volume;
    });
    return Object.entries(pairs).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
}

function getWorstPair(trades) {
    const pairs = {};
    trades.forEach(t => {
        if (!pairs[t.pair]) pairs[t.pair] = 0;
        pairs[t.pair] += t.type === 'profit' ? t.volume : -t.volume;
    });
    return Object.entries(pairs).sort((a, b) => a[1] - b[1])[0]?.[0] || '—';
}

function getBestDay(trades) {
    const days = {};
    trades.forEach(t => {
        const day = new Date(t.timestamp).toLocaleDateString('ru-RU');
        if (!days[day]) days[day] = 0;
        days[day] += t.type === 'profit' ? t.volume : -t.volume;
    });
    const best = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
    return best ? { date: best[0], pl: Math.round(best[1] * 100) / 100 } : null;
}

function getWorstDay(trades) {
    const days = {};
    trades.forEach(t => {
        const day = new Date(t.timestamp).toLocaleDateString('ru-RU');
        if (!days[day]) days[day] = 0;
        days[day] += t.type === 'profit' ? t.volume : -t.volume;
    });
    const worst = Object.entries(days).sort((a, b) => a[1] - b[1])[0];
    return worst ? { date: worst[0], pl: Math.round(worst[1] * 100) / 100 } : null;
}

// Админ: все пользователи
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT u.id, u.username, u.wallet_connected, u.is_public, u.created_at,
                COUNT(t.id) as trades_count,
                COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl
         FROM users u
         LEFT JOIN trades t ON u.id = t.user_id
         WHERE u.is_admin = 0
         GROUP BY u.id
         ORDER BY u.created_at DESC`,
        (err, users) => res.json(users || [])
    );
});

// Админ: сделки пользователя
app.get('/api/admin/trades/:userId', authenticateToken, requireAdmin, (req, res) => {
    db.all(
        'SELECT * FROM trades WHERE user_id = ? ORDER BY timestamp DESC',
        [req.params.userId],
        (err, trades) => res.json(trades || [])
    );
});

// Админ: удалить пользователя
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM users WHERE id = ? AND is_admin = 0', [req.params.userId], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка' });
        res.json({ success: true, deleted: this.changes > 0 });
    });
});

// Лидерборд
app.get('/api/leaderboard', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    db.all(
        `SELECT u.id, u.username, u.wallet_type,
                COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl,
                COUNT(t.id) as total_trades,
                COALESCE(ROUND(100.0 * SUM(CASE WHEN t.type = 'profit' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 1), 0) as win_rate
         FROM users u
         LEFT JOIN trades t ON u.id = t.user_id
         WHERE u.is_public = 1 AND u.wallet_connected = 1
         GROUP BY u.id
         HAVING total_trades > 0
         ORDER BY total_pl DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            res.json(rows.map((row, i) => ({
                rank: i + 1,
                username: row.username,
                wallet_type: row.wallet_type,
                totalPL: Math.round(row.total_pl * 100) / 100,
                totalTrades: row.total_trades,
                winRate: row.win_rate
            })));
        }
    );
});

// Вспомогательные функции
function generateWalletTrades(address) {
    const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD'];
    const trades = [];
    const count = Math.floor(Math.random() * 15) + 10;
    for (let i = 0; i < count; i++) {
        const isProfit = Math.random() > 0.35;
        const volume = +(Math.random() * 5 + 0.5).toFixed(2);
        trades.push({
            id: `wallet-${address.slice(0, 8)}-${Date.now()}-${i}`,
            pair: pairs[Math.floor(Math.random() * pairs.length)],
            volume, type: isProfit ? 'profit' : 'loss',
            timestamp: Date.now() - (i * 3600000) - Math.random() * 86400000
        });
    }
    return trades;
}

async function importTradesToDB(userId, trades) {
    return new Promise((resolve) => {
        const stmt = db.prepare('INSERT OR IGNORE INTO trades (id, user_id, pair, volume, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
        trades.forEach(t => stmt.run([t.id, userId, t.pair, t.volume, t.type, t.timestamp]));
        stmt.finalize();
        resolve();
    });
}

// Статика и SPA Fallback
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Запуск
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
process.on('SIGTERM', () => { db.close(); process.exit(0); });