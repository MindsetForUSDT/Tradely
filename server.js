require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Подключение к Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) console.error('❌ Ошибка подключения к Supabase:', err.stack);
    else { console.log('✅ Подключено к Supabase PostgreSQL'); release(); }
});

// Создание таблиц
const createTables = async () => {
    try {
        await pool.query(`
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

        const adminPass = await bcrypt.hash('TradeumAdmin2024!', 10);
        await pool.query(
            `INSERT INTO users (username, password, is_admin, first_login, wallet_connected)
             VALUES ('admin', $1, true, false, true)
             ON CONFLICT (username) DO NOTHING`,
            [adminPass]
        );
        console.log('✅ Таблицы созданы');
    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err);
    }
};
createTables();

// Безопасность
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

// Общий rate limiter
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', generalLimiter);

// Строгий rate limiter для логина
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 5, // 5 попыток
    message: { error: 'Слишком много попыток входа. Попробуйте через час.' },
    standardHeaders: true,
    legacyHeaders: false,
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
const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// ========== АНТИ-СОН ==========
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ========== API Роуты ==========

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, secretQuestion, secretAnswer } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Имя и пароль обязательны' });
        if (username.length < 3 || password.length < 6) return res.status(400).json({ error: 'Имя: мин 3, пароль: мин 6' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedAnswer = secretAnswer ? await bcrypt.hash(secretAnswer.toLowerCase(), 10) : null;

        const result = await pool.query(
            'INSERT INTO users (username, password, secret_question, secret_answer) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hashedPassword, secretQuestion || null, hashedAnswer]
        );

        const userId = result.rows[0].id;
        const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: userId, username, is_public: false, wallet_connected: false, first_login: true, is_admin: false } });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Пользователь уже существует' });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Логин (со строгим rate limit)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Имя и пароль обязательны' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Неверное имя или пароль' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Неверное имя или пароль' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            token,
            user: {
                id: user.id, username: user.username,
                is_public: user.is_public, wallet_connected: user.wallet_connected,
                first_login: user.first_login, is_admin: user.is_admin,
                wallet_address: user.wallet_address, wallet_type: user.wallet_type
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Восстановление пароля (шаг 1: получить вопрос)
app.post('/api/auth/forgot-password', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Введите имя пользователя' });

    try {
        const result = await pool.query('SELECT secret_question FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        if (!result.rows[0].secret_question) return res.status(404).json({ error: 'Секретный вопрос не задан' });

        res.json({ secretQuestion: result.rows[0].secret_question });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Восстановление пароля (шаг 2: проверить ответ и сменить пароль)
app.post('/api/auth/reset-password', async (req, res) => {
    const { username, secretAnswer, newPassword } = req.body;
    if (!username || !secretAnswer || !newPassword) return res.status(400).json({ error: 'Все поля обязательны' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль: минимум 6 символов' });

    try {
        const result = await pool.query('SELECT secret_answer FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });

        const validAnswer = await bcrypt.compare(secretAnswer.toLowerCase(), result.rows[0].secret_answer);
        if (!validAnswer) return res.status(401).json({ error: 'Неверный ответ на секретный вопрос' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);

        res.json({ success: true, message: 'Пароль успешно изменён' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Смена пароля (для авторизованного пользователя)
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Все поля обязательны' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Новый пароль: минимум 6 символов' });

    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!validPassword) return res.status(401).json({ error: 'Неверный текущий пароль' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Профиль
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, is_public, wallet_connected, wallet_address, wallet_type, first_login, is_admin FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Пропустить онбординг
app.post('/api/user/skip-wallet', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET first_login = false WHERE id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Подключить кошелек (Pro) - с BULK INSERT
app.post('/api/user/wallet', authenticateToken, async (req, res) => {
    const { wallet_address, wallet_type } = req.body;
    if (!wallet_address || !wallet_type) return res.status(400).json({ error: 'Нужен адрес и тип' });

    try {
        await pool.query(
            'UPDATE users SET wallet_connected = true, wallet_address = $1, wallet_type = $2, is_public = true, first_login = false WHERE id = $3',
            [wallet_address, wallet_type, req.user.id]
        );

        const demoTrades = generateWalletTrades(wallet_address);
        if (demoTrades.length > 0) {
            const values = demoTrades.map(t =>
                `('${t.id}', ${req.user.id}, '${t.pair}', ${t.volume}, '${t.type}', ${t.timestamp})`
            ).join(',');

            await pool.query(
                `INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ${values} ON CONFLICT (id) DO NOTHING`
            );
        }

        res.json({ success: true, wallet_connected: true, trades_imported: demoTrades.length });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Отключить кошелек
app.post('/api/user/wallet/disconnect', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET wallet_connected = false, wallet_address = NULL, wallet_type = NULL, is_public = false WHERE id = $1', [req.user.id]);
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, wallet_connected: false });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Сделки
app.get('/api/trades', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, pair, volume, type, timestamp FROM trades WHERE user_id = $1 ORDER BY timestamp DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.post('/api/trades', authenticateToken, async (req, res) => {
    const { id, pair, volume, type, timestamp } = req.body;
    if (!id || !pair || !volume || !type || !timestamp) return res.status(400).json({ error: 'Все поля обязательны' });

    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) return res.status(403).json({ error: 'Pro режим: ручное добавление отключено' });

        await pool.query(
            'INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, req.user.id, pair.toUpperCase(), volume, type, timestamp]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.delete('/api/trades/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (user.rows[0].wallet_connected) return res.status(403).json({ error: 'Pro режим: удаление отключено' });

        await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.post('/api/trades/sync', authenticateToken, async (req, res) => {
    const { trades } = req.body;
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'Неверный формат' });

    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM trades WHERE user_id = $1', [req.user.id]);
        if (trades.length > 0) {
            const values = trades.map(t =>
                `('${t.id}', ${req.user.id}, '${t.pair}', ${t.volume}, '${t.type}', ${t.timestamp})`
            ).join(',');
            await pool.query(`INSERT INTO trades (id, user_id, pair, volume, type, timestamp) VALUES ${values}`);
        }
        await pool.query('COMMIT');
        res.json({ success: true, count: trades.length });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: 'Ошибка синхронизации' });
    }
});

// Публичность
app.post('/api/user/public', authenticateToken, async (req, res) => {
    const { is_public } = req.body;
    try {
        const user = await pool.query('SELECT wallet_connected FROM users WHERE id = $1', [req.user.id]);
        if (!user.rows[0].wallet_connected) return res.status(403).json({ error: 'Требуется подключение кошелька' });

        await pool.query('UPDATE users SET is_public = $1 WHERE id = $2', [is_public, req.user.id]);
        res.json({ success: true, is_public });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Статистика
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT type, SUM(volume) as total_volume, COUNT(*) as count
            FROM trades WHERE user_id = $1 GROUP BY type
        `, [req.user.id]);

        let totalPL = 0, wins = 0, totalCount = 0, maxProfit = 0, maxLoss = 0, profitSum = 0, lossSum = 0;
        result.rows.forEach(row => {
            totalCount += parseInt(row.count);
            if (row.type === 'profit') {
                totalPL += row.total_volume; wins += parseInt(row.count);
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
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Premium аналитика
app.get('/api/premium/analytics', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT wallet_connected, is_admin FROM users WHERE id = $1', [req.user.id]);
        if (!user.rows[0].wallet_connected && !user.rows[0].is_admin) {
            return res.status(403).json({ error: 'Требуется Pro статус' });
        }

        const trades = await pool.query('SELECT * FROM trades WHERE user_id = $1 ORDER BY timestamp', [req.user.id]);
        const rows = trades.rows;

        const profitTrades = rows.filter(t => t.type === 'profit');
        const lossTrades = rows.filter(t => t.type === 'loss');
        const avgProfit = profitTrades.length ? profitTrades.reduce((a, t) => a + t.volume, 0) / profitTrades.length : 0;
        const avgLoss = lossTrades.length ? lossTrades.reduce((a, t) => a + t.volume, 0) / lossTrades.length : 0;
        const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : 0;
        const winRate = rows.length ? (profitTrades.length / rows.length) * 100 : 0;

        const returns = rows.map(t => t.type === 'profit' ? t.volume : -t.volume);
        const avgReturn = returns.length ? returns.reduce((a, r) => a + r, 0) / returns.length : 0;
        const variance = returns.length ? returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

        let peak = 0, maxDrawdown = 0, runningPL = 0;
        rows.forEach(t => {
            runningPL += t.type === 'profit' ? t.volume : -t.volume;
            peak = Math.max(peak, runningPL);
            maxDrawdown = Math.max(maxDrawdown, peak - runningPL);
        });

        const monthlyProjection = avgReturn * 30;
        const pairs = {}; rows.forEach(t => { if (!pairs[t.pair]) pairs[t.pair] = 0; pairs[t.pair] += t.type === 'profit' ? t.volume : -t.volume; });
        const sortedPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]);

        const days = {}; rows.forEach(t => { const d = new Date(t.timestamp).toLocaleDateString('ru-RU'); if (!days[d]) days[d] = 0; days[d] += t.type === 'profit' ? t.volume : -t.volume; });
        const sortedDays = Object.entries(days).sort((a, b) => b[1] - a[1]);

        res.json({
            totalTrades: rows.length, profitTrades: profitTrades.length, lossTrades: lossTrades.length,
            winRate: Math.round(winRate * 10) / 10,
            avgProfit: Math.round(avgProfit * 100) / 100,
            avgLoss: Math.round(avgLoss * 100) / 100,
            profitFactor: Math.round(profitFactor * 100) / 100,
            sharpeRatio: Math.round(sharpeRatio * 100) / 100,
            maxDrawdown: Math.round(maxDrawdown * 100) / 100,
            monthlyProjection: Math.round(monthlyProjection * 100) / 100,
            bestPair: sortedPairs[0]?.[0] || '—',
            worstPair: sortedPairs[sortedPairs.length - 1]?.[0] || '—',
            bestDay: sortedDays[0] ? { date: sortedDays[0][0], pl: Math.round(sortedDays[0][1] * 100) / 100 } : null,
            worstDay: sortedDays[sortedDays.length - 1] ? { date: sortedDays[sortedDays.length - 1][0], pl: Math.round(sortedDays[sortedDays.length - 1][1] * 100) / 100 } : null
        });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Лидерборд
app.get('/api/leaderboard', async (req, res) => {
    const limit = parseInt(req.query.limit) || 25;
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.wallet_type,
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

        res.json(result.rows.map((row, i) => ({
            rank: i + 1, username: row.username, wallet_type: row.wallet_type,
            totalPL: Math.round(row.total_pl * 100) / 100,
            totalTrades: parseInt(row.total_trades), winRate: row.win_rate
        })));
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Админ: пользователи
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.wallet_connected, u.is_public, u.created_at,
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
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Админ: удалить пользователя
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1 AND is_admin = false', [req.params.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// Вспомогательные функции
function generateWalletTrades(address) {
    const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD'];
    const trades = [];
    const count = Math.floor(Math.random() * 15) + 10;
    for (let i = 0; i < count; i++) {
        trades.push({
            id: `wallet-${address.slice(0, 8)}-${Date.now()}-${i}`,
            pair: pairs[Math.floor(Math.random() * pairs.length)],
            volume: +(Math.random() * 5 + 0.5).toFixed(2),
            type: Math.random() > 0.35 ? 'profit' : 'loss',
            timestamp: Date.now() - (i * 3600000) - Math.random() * 86400000
        });
    }
    return trades;
}

// Статика
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));