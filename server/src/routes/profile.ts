import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();
const publicProfile = {
  id: true,
  email: true,
  username: true,
  avatar_url: true,
  subscription_tier: true,
  subscription_expires_at: true,
  created_at: true,
  updated_at: true,
} as const;

const updateProfileSchema = z
  .object({
    username: z.string().trim().min(2).max(40).optional(),
    avatar_url: z.string().url().max(2000).nullable().optional(),
  })
  .strict();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
      select: publicProfile,
    });
    if (!profile) return res.status(404).json({ error: 'Профиль не найден' });
    return res.json(profile);
  } catch (error) {
    console.error('[Profile GET]', error);
    return res.status(500).json({ error: 'Не удалось загрузить профиль' });
  }
});

router.patch('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Проверьте данные профиля',
    });
  }

  try {
    const profile = await prisma.profile.update({
      where: { id: req.userId! },
      data: parsed.data,
      select: publicProfile,
    });
    void writeAuditLog({ action: 'profile.updated', userId: req.userId, request: req });
    return res.json(profile);
  } catch (error) {
    console.error('[Profile PATCH]', error);
    return res.status(500).json({ error: 'Не удалось обновить профиль' });
  }
});

export default router;
