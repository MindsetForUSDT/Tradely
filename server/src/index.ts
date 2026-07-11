import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

console.log('[Server] ====== SERVER START ======');
console.log('[Server] ENV:', process.env.NODE_ENV);
console.log('[Server] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Импортируем Prisma ПЕРЕД маршрутами
import { prisma } from './db.js';

// Тестируем подключение к БД
prisma
  .$connect()
  .then(() => {
    console.log('[Server] ✅ Prisma connected to database');
  })
  .catch((err) => {
    console.error('[Server] ❌ Prisma connection error:', err);
  });

import profileRouter from './routes/profile.js';
import walletsRouter from './routes/wallets.js';
import tradesRouter from './routes/trades.js';
import analyticsRouter from './routes/analytics.js';
import webhookRouter from './routes/webhook.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Краткий access log без заголовков и токенов авторизации.
app.use((req, res, next) => {
  console.log(`[Server] 📥 ${req.method} ${req.path}`);
  next();
});

app.use(helmet());
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  (process.env.NODE_ENV === 'production'
    ? 'https://tradeumdiary.com'
    : 'http://localhost:3000,http://127.0.0.1:3000')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

console.log('[Server] ✅ Middleware configured');

app.get('/health', (req, res) => {
  console.log('[Server] Health check');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'TradeumDiary API',
    version: '1.0.0',
    endpoints: {
      profile: '/api/profile',
      auth: '/api/auth',
      wallets: '/api/wallets',
      trades: '/api/trades',
      analytics: '/api/analytics',
      webhook: '/api/webhook',
      health: '/health',
    },
  });
});

console.log('[Server] Registering routes...');
app.use('/api/auth', authRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/profile', profileRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/analytics', analyticsRouter);
console.log('[Server] ✅ Routes registered');

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] ❌ ERROR:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/health`);
});

const shutdown = async (signal: string) => {
  console.log(`[Server] ${signal}: shutting down`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
