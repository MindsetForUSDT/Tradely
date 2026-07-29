import { createHash, randomBytes } from 'crypto';
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { isProduction, requiredSecret } from '../config/env.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();
const ACCESS_COOKIE = 'td_access';
const REFRESH_COOKIE = 'td_refresh';
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const SALT_ROUNDS = 12;

const userSelect = {
  id: true,
  email: true,
  username: true,
  avatar_url: true,
  subscription_tier: true,
  subscription_expires_at: true,
  created_at: true,
} as const;

const passwordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .max(128, 'Пароль слишком длинный')
  .regex(/[a-zа-я]/i, 'Добавьте букву')
  .regex(/[0-9]/, 'Добавьте цифру');

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email').max(254),
  username: z.string().trim().min(2, 'Имя должно содержать минимум 2 символа').max(40),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email').max(254),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(false),
});

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email').max(254),
});

const resetSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'access' }, requiredSecret('JWT_SECRET'), {
    expiresIn: '15m',
    issuer: 'tradeumdiary-api',
    audience: 'tradeumdiary-web',
  });
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
  };
}

async function createRefreshSession(userId: string, req: Request, persistent: boolean) {
  const refreshToken = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.authSession.create({
    data: {
      user_id: userId,
      token_hash: tokenHash(refreshToken),
      expires_at: expiresAt,
      ip_address: req.ip,
      user_agent: req.get('user-agent')?.slice(0, 500),
      persistent,
    },
  });

  return { refreshToken, expiresAt };
}

function setSessionCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  remember: boolean
) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    path: '/',
    maxAge: ACCESS_TTL_MS,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    path: '/api/auth',
    ...(remember ? { maxAge: REFRESH_TTL_MS } : {}),
  });
}

function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: '/api/auth' });
}

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    error: error.issues[0]?.message || 'Проверьте введённые данные',
    fields: error.flatten().fieldErrors,
  });
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const { email, password, username } = parsed.data;
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.profile.findUnique({ where: { email }, select: { id: true } }),
      prisma.profile.findFirst({ where: { username }, select: { id: true } }),
    ]);

    if (existingEmail)
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    if (existingUsername) return res.status(409).json({ error: 'Это имя пользователя уже занято' });

    const profile = await prisma.profile.create({
      data: {
        email,
        username,
        hashed_password: await bcrypt.hash(password, SALT_ROUNDS),
        subscription_tier: 'free',
      },
      select: userSelect,
    });
    const session = await createRefreshSession(profile.id, req, true);
    setSessionCookies(res, signAccessToken(profile.id), session.refreshToken, true);
    void writeAuditLog({ action: 'auth.register', userId: profile.id, request: req });

    return res.status(201).json({ success: true, user: profile });
  } catch (error) {
    console.error('[Auth] Registration failed', error);
    return res.status(500).json({ error: 'Не удалось создать аккаунт' });
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const { email, password, remember } = parsed.data;
    const profile = await prisma.profile.findUnique({ where: { email } });
    const passwordMatches =
      profile?.hashed_password && (await bcrypt.compare(password, profile.hashed_password));

    if (!profile || !passwordMatches) {
      void writeAuditLog({ action: 'auth.login_failed', request: req, metadata: { email } });
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const session = await createRefreshSession(profile.id, req, remember);
    setSessionCookies(res, signAccessToken(profile.id), session.refreshToken, remember);
    void writeAuditLog({ action: 'auth.login', userId: profile.id, request: req });

    const user = await prisma.profile.findUniqueOrThrow({
      where: { id: profile.id },
      select: userSelect,
    });
    return res.json({ success: true, user });
  } catch (error) {
    console.error('[Auth] Login failed', error);
    return res.status(500).json({ error: 'Не удалось выполнить вход' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.profile.findUnique({ where: { id: req.userId! }, select: userSelect });
  if (!user) return res.status(401).json({ error: 'Сессия недействительна' });
  return res.json({ user });
});

router.post('/refresh', async (req, res) => {
  const currentToken = req.cookies?.[REFRESH_COOKIE];
  if (!currentToken) {
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Сессия истекла' });
  }

  try {
    const current = await prisma.authSession.findUnique({
      where: { token_hash: tokenHash(currentToken) },
      include: { user: { select: userSelect } },
    });
    if (!current || current.revoked_at || current.expires_at <= new Date()) {
      clearSessionCookies(res);
      return res.status(401).json({ error: 'Сессия истекла' });
    }

    const nextToken = randomBytes(48).toString('base64url');
    const nextExpiry = new Date(Date.now() + REFRESH_TTL_MS);
    await prisma.$transaction([
      prisma.authSession.update({
        where: { id: current.id },
        data: { revoked_at: new Date(), last_used_at: new Date() },
      }),
      prisma.authSession.create({
        data: {
          user_id: current.user_id,
          token_hash: tokenHash(nextToken),
          expires_at: nextExpiry,
          ip_address: req.ip,
          user_agent: req.get('user-agent')?.slice(0, 500),
          persistent: current.persistent,
        },
      }),
    ]);

    setSessionCookies(res, signAccessToken(current.user_id), nextToken, current.persistent);
    return res.json({ success: true, user: current.user });
  } catch (error) {
    console.error('[Auth] Refresh failed', error);
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Сессия истекла' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    await prisma.authSession.updateMany({
      where: { token_hash: tokenHash(refreshToken), revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
  clearSessionCookies(res);
  return res.json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const genericResponse = {
    success: true,
    message: 'Если аккаунт существует, письмо со ссылкой уже отправлено',
  };

  try {
    const profile = await prisma.profile.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true },
    });
    if (!profile) return res.json(genericResponse);

    const rawToken = randomBytes(48).toString('base64url');
    await prisma.passwordResetToken.updateMany({
      where: { user_id: profile.id, used_at: null },
      data: { used_at: new Date() },
    });
    await prisma.passwordResetToken.create({
      data: {
        user_id: profile.id,
        token_hash: tokenHash(rawToken),
        expires_at: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    const appUrl = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const resetUrl = `${appUrl}/update-password?token=${encodeURIComponent(rawToken)}`;
    await sendPasswordResetEmail(profile.email, resetUrl);
    void writeAuditLog({
      action: 'auth.password_reset_requested',
      userId: profile.id,
      request: req,
    });

    return res.json({
      ...genericResponse,
      ...(!isProduction ? { developmentResetUrl: resetUrl } : {}),
    });
  } catch (error) {
    console.error('[Auth] Password reset request failed', error);
    return res.status(503).json({ error: 'Сервис восстановления временно недоступен' });
  }
});

router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash(parsed.data.token) },
    });
    if (!resetToken || resetToken.used_at || resetToken.expires_at <= new Date()) {
      return res.status(400).json({ error: 'Ссылка недействительна или уже использована' });
    }

    await prisma.$transaction([
      prisma.profile.update({
        where: { id: resetToken.user_id },
        data: { hashed_password: await bcrypt.hash(parsed.data.password, SALT_ROUNDS) },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used_at: new Date() },
      }),
      prisma.authSession.updateMany({
        where: { user_id: resetToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);
    clearSessionCookies(res);
    void writeAuditLog({
      action: 'auth.password_reset_completed',
      userId: resetToken.user_id,
      request: req,
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Password reset failed', error);
    return res.status(500).json({ error: 'Не удалось изменить пароль' });
  }
});

export default router;
