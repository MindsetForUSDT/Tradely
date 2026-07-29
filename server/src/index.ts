import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { validateRuntimeConfig } from './config/env.js';

validateRuntimeConfig();

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
import authRouter from './routes/auth.js';
import riskLimitsRouter from './routes/riskLimits.js';
import goalsRouter from './routes/goals.js';
import { syncDueWallets } from './services/walletSync.js';
import { runSyncWorkerBatch } from './jobs/sync-scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

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
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Недопустимый источник запроса' });
  }
  return next();
});
app.use(cookieParser());
app.use(express.json({ limit: '256kb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => ['/me', '/refresh', '/logout'].includes(req.path),
  message: { error: 'Слишком много попыток. Повторите через 15 минут.' },
});

console.log('[Server] ✅ Middleware configured');

const schedulerState: {
  running: boolean;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
} = { running: false, lastStartedAt: null, lastCompletedAt: null, lastError: null };

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      scheduler: schedulerState,
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'unavailable',
      scheduler: schedulerState,
    });
  }
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
      riskLimits: '/api/risk-limits',
      goals: '/api/goals',
      health: '/health',
    },
  });
});

console.log('[Server] Registering routes...');
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/risk-limits', riskLimitsRouter);
app.use('/api/goals', goalsRouter);
console.log('[Server] ✅ Routes registered');

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] ❌ ERROR:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/health`);
});

const initialSync = setTimeout(() => {
  void runScheduledSync();
}, 5_000);
initialSync.unref();

const syncTimer = setInterval(() => {
  void runScheduledSync();
}, 60_000);
syncTimer.unref();

async function runScheduledSync() {
  if (schedulerState.running) return;
  schedulerState.running = true;
  schedulerState.lastStartedAt = new Date().toISOString();
  schedulerState.lastError = null;
  try {
    await Promise.all([syncDueWallets(), runSyncWorkerBatch()]);
    schedulerState.lastCompletedAt = new Date().toISOString();
  } catch (error) {
    schedulerState.lastError = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('[Auto Sync] Scheduler failed:', error);
  } finally {
    schedulerState.running = false;
  }
}

const shutdown = async (signal: string) => {
  console.log(`[Server] ${signal}: shutting down`);
  clearTimeout(initialSync);
  clearInterval(syncTimer);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
