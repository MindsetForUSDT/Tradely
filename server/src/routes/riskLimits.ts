import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';
import { requirePro } from '../middleware/entitlements.js';

const router = Router();
const defaults = {
  daily_loss_limit: 0,
  weekly_loss_limit: 0,
  position_size_percent: 2,
  max_leverage: 1,
  alert_enabled: true,
  alert_email: '',
};
const limitsSchema = z.object({
  daily_loss_limit: z.coerce.number().min(0).max(10_000_000),
  weekly_loss_limit: z.coerce.number().min(0).max(50_000_000),
  position_size_percent: z.coerce.number().min(0.1).max(100),
  max_leverage: z.coerce.number().min(1).max(200),
  alert_enabled: z.boolean(),
  alert_email: z.union([z.literal(''), z.string().email()]).default(''),
});

function serialize(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item && typeof item === 'object' && 'toNumber' in item
        ? (item as { toNumber(): number }).toNumber()
        : item,
    ])
  );
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const limits = await prisma.riskLimit.findUnique({ where: { user_id: req.userId! } });
  return res.json(limits ? serialize(limits) : defaults);
});

router.post('/', requireAuth, requirePro, async (req: AuthRequest, res) => {
  const parsed = limitsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message || 'Некорректные лимиты' });
  }
  const limits = await prisma.riskLimit.upsert({
    where: { user_id: req.userId! },
    create: { user_id: req.userId!, ...parsed.data, alert_email: parsed.data.alert_email || null },
    update: { ...parsed.data, alert_email: parsed.data.alert_email || null },
  });
  void writeAuditLog({ action: 'risk_limits.updated', userId: req.userId, request: req });
  return res.json(serialize(limits));
});

export default router;
