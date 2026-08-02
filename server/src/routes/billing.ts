import { randomUUID } from 'node:crypto';
import { BillingStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  isBillingConfigured,
  createYooKassaPayment,
  PRO_MONTHLY_PLAN,
} from '../billing/yookassa.js';
import { writeAuditLog } from '../services/audit.js';
import { getEntitlements } from '../services/entitlements.js';

const router = Router();
const PENDING_REUSE_MS = 24 * 60 * 60 * 1_000;

function serializePayment(payment: {
  id: string;
  amount: Prisma.Decimal;
  currency: string;
  status: BillingStatus;
  paid_at: Date | null;
  created_at: Date;
}) {
  return {
    id: payment.id,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    status: payment.status.toLowerCase(),
    paid_at: payment.paid_at?.toISOString() || null,
    created_at: payment.created_at.toISOString(),
  };
}

router.get('/subscription', requireAuth, async (req: AuthRequest, res) => {
  const entitlements = await getEntitlements(req.userId!);
  const [profile, subscription] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: req.userId! },
      select: { subscription_expires_at: true },
    }),
    prisma.subscription.findFirst({
      where: { user_id: req.userId! },
      orderBy: { updated_at: 'desc' },
    }),
  ]);
  return res.json({
    configured: isBillingConfigured(),
    plan: entitlements.tier,
    plan_code: entitlements.tier === 'pro' ? PRO_MONTHLY_PLAN : 'free',
    current_period_end: profile?.subscription_expires_at?.toISOString() || null,
    cancel_at_period_end: subscription?.cancel_at_period_end || false,
    renewal: 'manual',
  });
});

router.get('/payments', requireAuth, async (req: AuthRequest, res) => {
  const payments = await prisma.payment.findMany({
    where: { user_id: req.userId! },
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      paid_at: true,
      created_at: true,
    },
  });
  return res.json({ payments: payments.map(serializePayment) });
});

router.post('/checkout', requireAuth, async (req: AuthRequest, res) => {
  if (!isBillingConfigured()) {
    return res.status(503).json({ error: 'Платёжный магазин ещё не настроен' });
  }
  const profile = await prisma.profile.findUnique({
    where: { id: req.userId! },
    select: { email: true },
  });
  if (!profile) return res.status(404).json({ error: 'Профиль не найден' });

  const reusable = await prisma.payment.findFirst({
    where: {
      user_id: req.userId!,
      status: BillingStatus.PENDING,
      confirmation_url: { not: null },
      created_at: { gte: new Date(Date.now() - PENDING_REUSE_MS) },
    },
    orderBy: { created_at: 'desc' },
  });
  if (reusable?.confirmation_url) {
    return res.json({ payment_id: reusable.id, confirmation_url: reusable.confirmation_url });
  }

  const idempotenceKey = randomUUID();
  const localPayment = await prisma.payment.create({
    data: {
      user_id: req.userId!,
      provider: 'yookassa',
      idempotence_key: idempotenceKey,
      amount: new Prisma.Decimal('499.00'),
      currency: 'RUB',
      status: BillingStatus.PENDING,
    },
  });

  try {
    const providerPayment = await createYooKassaPayment({
      idempotenceKey,
      userId: req.userId!,
      email: profile.email,
      returnUrl: `${process.env.APP_URL || 'http://localhost:3000'}/payment?return=1`,
    });
    const confirmationUrl = providerPayment.confirmation?.confirmation_url;
    if (!confirmationUrl) throw new Error('ЮKassa не вернула ссылку подтверждения');
    const updated = await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        provider_payment_id: providerPayment.id,
        confirmation_url: confirmationUrl,
        raw_status: providerPayment as unknown as Prisma.InputJsonValue,
      },
    });
    void writeAuditLog({
      action: 'billing.checkout_created',
      userId: req.userId,
      request: req,
      metadata: { paymentId: updated.id, provider: 'yookassa' },
    });
    return res.status(201).json({ payment_id: updated.id, confirmation_url: confirmationUrl });
  } catch (error) {
    await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        status: BillingStatus.FAILED,
        raw_status: { error: error instanceof Error ? error.message : 'Provider error' },
      },
    });
    console.error('[Billing checkout]', error);
    return res.status(502).json({ error: 'Не удалось создать платёж. Попробуйте ещё раз.' });
  }
});

router.post('/cancel', requireAuth, async (req: AuthRequest, res) => {
  const subscription = await prisma.subscription.findFirst({
    where: { user_id: req.userId!, status: 'ACTIVE' },
    orderBy: { updated_at: 'desc' },
  });
  if (!subscription) return res.status(404).json({ error: 'Активная подписка не найдена' });
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancel_at_period_end: true },
  });
  void writeAuditLog({ action: 'billing.renewal_canceled', userId: req.userId, request: req });
  return res.json({
    success: true,
    current_period_end: updated.current_period_end?.toISOString() || null,
  });
});

export default router;
