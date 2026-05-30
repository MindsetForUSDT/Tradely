import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 12;

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Необходимо указать email, пароль и имя пользователя' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Проверяем уникальность email и username
    const existingByEmail = await prisma.profile.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingByEmail) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const existingByUsername = await prisma.profile.findFirst({
      where: { username: username.trim() },
    });

    if (existingByUsername) {
      return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Создаем профиль
    const profile = await prisma.profile.create({
      data: {
        clerk_id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        email: normalizedEmail,
        username,
        hashed_password: hashedPassword,
        subscription_tier: 'free',
      },
    });

    const token = signToken(profile.id);

    res.status(201).json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        subscription_tier: profile.subscription_tier,
        created_at: profile.created_at.toISOString(),
      },
      token,
    });
  } catch (error: any) {
    console.error('[Auth POST /register] Error:', error.message);
    res.status(500).json({ error: 'Ошибка регистрации', details: error.message });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Необходимо указать email и пароль' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Ищем профиль
    const profile = await prisma.profile.findFirst({
      where: { email: normalizedEmail },
    });

    if (!profile || !profile.hashed_password) {
      // Одинаковое сообщение для безопасности — не раскрываем существование пользователя
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, profile.hashed_password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = signToken(profile.id);

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        subscription_tier: profile.subscription_tier,
        created_at: profile.created_at.toISOString(),
      },
      token,
    });
  } catch (error: any) {
    console.error('[Auth POST /login] Error:', error.message);
    res.status(500).json({ error: 'Ошибка входа', details: error.message });
  }
});

export default router;
