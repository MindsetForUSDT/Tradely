import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  target: z.string().trim().min(2).max(240),
  due_at: z.string().datetime().nullable().optional(),
});
const updateSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    target: z.string().trim().min(2).max(240).optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
  })
  .strict();

function serialize(goal: {
  id: string;
  title: string;
  target_description: string;
  progress: number;
  status: string;
  due_at: Date | null;
  created_at: Date;
}) {
  return {
    id: goal.id,
    title: goal.title,
    target: goal.target_description,
    progress: goal.progress,
    status: goal.status,
    due_at: goal.due_at?.toISOString() || null,
    created_at: goal.created_at.toISOString(),
  };
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const goals = await prisma.goal.findMany({
    where: { user_id: req.userId!, status: { not: 'archived' } },
    orderBy: { created_at: 'desc' },
  });
  return res.json(goals.map(serialize));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const goal = await prisma.goal.create({
    data: {
      user_id: req.userId!,
      title: parsed.data.title,
      target_description: parsed.data.target,
      due_at: parsed.data.due_at ? new Date(parsed.data.due_at) : null,
    },
  });
  return res.status(201).json(serialize(goal));
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const result = await prisma.goal.updateMany({
    where: { id: String(req.params.id), user_id: req.userId! },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.target !== undefined ? { target_description: parsed.data.target } : {}),
      ...(parsed.data.progress !== undefined ? { progress: parsed.data.progress } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });
  if (!result.count) return res.status(404).json({ error: 'Цель не найдена' });
  return res.json({ success: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const result = await prisma.goal.deleteMany({
    where: { id: String(req.params.id), user_id: req.userId! },
  });
  if (!result.count) return res.status(404).json({ error: 'Цель не найдена' });
  return res.json({ success: true });
});

export default router;
