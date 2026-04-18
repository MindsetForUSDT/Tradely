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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Инициализация SQLite
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

    // Добавляем колонки если их нет (для существующих баз)
    db.run(`ALTER TABLE users ADD COLUMN wallet_connected BOOLEAN DEFAULT 0`);
    db.run(`ALTER TABLE users ADD COLUMN wallet_address TEXT`);
    db.run(`ALTER TABLE users ADD COLUMN wallet_type TEXT`);
});

// ========== Middleware для JWT ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// ========== API Роуты ==========

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }

        if (username.length < 3 || password.length < 6) {
            return res.status(400).json({ error: 'Имя: мин 3 символа, пароль: мин 6 символов' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            'INSERT INTO users (username, password, is_public, wallet_connected) VALUES (?, ?, 0, 0)',
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
                        wallet_connected: false
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
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    db.get(
        'SELECT id, username, password, is_public, wallet_connected, wallet_address, wallet_type FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Неверное имя или пароль' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Неверное имя или пароль' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    is_public: user.is_public === 1,
                    wallet_connected: user.wallet_connected === 1,
                    wallet_address: user.wallet_address,
                    wallet_type: user.wallet_type
                }
            });
        }
    );
});

// Получить статус пользователя
app.get('/api/user/status', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            res.json({
                ...user,
                is_public: user.is_public === 1,
                wallet_connected: user.wallet_connected === 1
            });
        }
    );
});

// Получить профиль
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            res.json({
                ...user,
                is_public: user.is_public === 1,
                wallet_connected: user.wallet_connected === 1
            });
        }
    );
});

// Обновить настройки публичности
app.post('/api/user/public', authenticateToken, (req, res) => {
    const { is_public } = req.body;

    // Проверяем, подключен ли кошелек
    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (!user.wallet_connected) {
            return res.status(403).json({ error: 'Требуется подключение кошелька' });
        }

        db.run(
            'UPDATE users SET is_public = ? WHERE id = ?',
            [is_public ? 1 : 0, req.user.id],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка обновления' });
                }
                res.json({ success: true, is_public: is_public ? 1 : 0 });
            }
        );
    });
});

// Подключение кошелька
app.post('/api/user/wallet', authenticateToken, (req, res) => {
    const { wallet_address, wallet_type } = req.body;

    if (!wallet_address || !wallet_type) {
        return res.status(400).json({ error: 'Адрес и тип кошелька обязательны' });
    }

    db.run(
        'UPDATE users SET wallet_connected = 1, wallet_address = ?, wallet_type = ?, is_public = 1 WHERE id = ?',
        [wallet_address, wallet_type, req.user.id],
        async (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка подключения кошелька' });
            }

            // Генерируем демо-сделки для кошелька
            const demoTrades = generateWalletTrades(wallet_address);
            await importTradesToDB(req.user.id, demoTrades);

            res.json({
                success: true,
                wallet_connected: true,
                trades_imported: demoTrades.length
            });
        }
    );
});

// Отключение кошелька
app.post('/api/user/wallet/disconnect', authenticateToken, (req, res) => {
    db.run(
        'UPDATE users SET wallet_connected = 0, wallet_address = NULL, wallet_type = NULL, is_public = 0 WHERE id = ?',
        [req.user.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка отключения кошелька' });
            }

            // Удаляем все сделки пользователя
            db.run('DELETE FROM trades WHERE user_id = ?', [req.user.id]);

            res.json({ success: true, wallet_connected: false });
        }
    );
});

// Получить все сделки пользователя
app.get('/api/trades', authenticateToken, (req, res) => {
    db.all(
        'SELECT id, pair, volume, type, timestamp FROM trades WHERE user_id = ? ORDER BY timestamp DESC',
        [req.user.id],
        (err, trades) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения сделок' });
            }
            res.json(trades);
        }
    );
});

// Добавить сделку (только для manual режима)
app.post('/api/trades', authenticateToken, (req, res) => {
    const { id, pair, volume, type, timestamp } = req.body;

    if (!id || !pair || !volume || !type || !timestamp) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверяем режим пользователя
    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (user.wallet_connected) {
            return res.status(403).json({ error: 'Ручное добавление недоступно для Pro трейдеров' });
        }

        db.run(
            'INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.user.id, pair.toUpperCase(), volume, type, timestamp],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка сохранения сделки' });
                }
                res.json({ success: true });
            }
        );
    });
});

// Обновить сделку (только для manual режима)
app.put('/api/trades/:id', authenticateToken, (req, res) => {
    const tradeId = req.params.id;
    const { pair, volume, type } = req.body;

    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (user.wallet_connected) {
            return res.status(403).json({ error: 'Редактирование недоступно для Pro трейдеров' });
        }

        db.run(
            'UPDATE trades SET pair = ?, volume = ?, type = ? WHERE id = ? AND user_id = ?',
            [pair.toUpperCase(), volume, type, tradeId, req.user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка обновления' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Сделка не найдена' });
                }
                res.json({ success: true });
            }
        );
    });
});

// Удалить сделку (только для manual режима)
app.delete('/api/trades/:id', authenticateToken, (req, res) => {
    const tradeId = req.params.id;

    db.get('SELECT wallet_connected FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (user.wallet_connected) {
            return res.status(403).json({ error: 'Удаление недоступно для Pro трейдеров' });
        }

        db.run(
            'DELETE FROM trades WHERE id = ? AND user_id = ?',
            [tradeId, req.user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка удаления' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Сделка не найдена' });
                }
                res.json({ success: true });
            }
        );
    });
});

// Синхронизация всех сделок
app.post('/api/trades/sync', authenticateToken, (req, res) => {
    const { trades } = req.body;

    if (!Array.isArray(trades)) {
        return res.status(400).json({ error: 'Неверный формат данных' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM trades WHERE user_id = ?', [req.user.id]);

        const stmt = db.prepare(
            'INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
        );

        trades.forEach(trade => {
            stmt.run([trade.id, req.user.id, trade.pair, trade.volume, trade.type, trade.timestamp]);
        });

        stmt.finalize();

        db.run('COMMIT', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка синхронизации' });
            }
            res.json({ success: true, count: trades.length });
        });
    });
});

// Статистика пользователя
app.get('/api/user/stats', authenticateToken, (req, res) => {
    db.all(
        `SELECT type, SUM(volume) as total_volume, COUNT(*) as count
         FROM trades
         WHERE user_id = ?
         GROUP BY type`,
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения статистики' });
            }

            let totalPL = 0;
            let wins = 0;
            let totalCount = 0;
            let maxProfit = 0;
            let maxLoss = 0;
            let profitSum = 0;
            let lossSum = 0;

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
                totalTrades: totalCount,
                wins,
                losses: totalCount - wins,
                avgProfit: Math.round(avgProfit * 100) / 100,
                avgLoss: Math.round(avgLoss * 100) / 100,
                maxProfit: Math.round(maxProfit * 100) / 100,
                maxLoss: Math.round(maxLoss * 100) / 100
            });
        }
    );
});

// Доска лидеров
app.get('/api/leaderboard', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;

    db.all(
        `SELECT
            u.id,
            u.username,
            u.wallet_type,
            COALESCE(SUM(CASE WHEN t.type = 'profit' THEN t.volume ELSE -t.volume END), 0) as total_pl,
            COUNT(t.id) as total_trades,
            COALESCE(
                ROUND(
                    100.0 * SUM(CASE WHEN t.type = 'profit' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0),
                    1
                ),
                0
            ) as win_rate
         FROM users u
         LEFT JOIN trades t ON u.id = t.user_id
         WHERE u.is_public = 1 AND u.wallet_connected = 1
         GROUP BY u.id, u.username, u.wallet_type
         HAVING total_trades > 0
         ORDER BY total_pl DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения лидерборда' });
            }

            res.json(rows.map((row, index) => ({
                rank: index + 1,
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
            volume: volume,
            type: isProfit ? 'profit' : 'loss',
            timestamp: Date.now() - (i * 3600000) - Math.random() * 86400000
        });
    }

    return trades;
}

async function importTradesToDB(userId, trades) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(
            'INSERT OR IGNORE INTO trades (id, user_id, pair, volume, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
        );

        trades.forEach(trade => {
            stmt.run([trade.id, userId, trade.pair, trade.volume, trade.type, trade.timestamp]);
        });

        stmt.finalize();
        resolve();
    });
}

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    db.close();
    process.exit(0);
});