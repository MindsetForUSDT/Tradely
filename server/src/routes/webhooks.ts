import { BillingStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { nextSubscriptionPeriod, verifyPaidPayment } from '../billing/lifecycle.js';
import { getYooKassaPayment, PRO_MONTHLY_PLAN } from '../billing/yookassa.js';

const router = Router();
const webhookSchema = z
  .object({
    type: z.literal('notification'),
    event: z.enum(['payment.succeeded', 'payment.canceled']),
    object: z.object({ id: z.string().min(1) }).passthrough(),
  })
  .passthrough();

router.post('/yookassa', async (req, res) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Некорректное уведомление' });
  const providerPaymentId = parsed.data.object.id;
  const eventKey = `${parsed.data.event}:${providerPaymentId}`;

  try {
    const existingEvent = await prisma.billingEvent.findUnique({
      where: { provider_event_id: eventKey },
    });
    if (existingEvent?.processed_at) return res.sendStatus(200);

    const currentPayment = await getYooKassaPayment(providerPaymentId);
    const localPayment = await prisma.payment.findUnique({
      where: { provider_payment_id: providerPaymentId },
    });
    if (!localPayment) {
      await prisma.billingEvent.upsert({
        where: { provider_event_id: eventKey },
        create: {
          provider: 'yookassa',
          provider_event_id: eventKey,
          event_type: parsed.data.event,
          payload: parsed.data as unknown as Prisma.InputJsonValue,
          processing_error: 'Локальный платёж не найден',
        },
        update: { processing_error: 'Локальный платёж не найден' },
      });
      return res.sendStatus(200);
    }

    await prisma.$transaction(async (tx) => {
      const event = await tx.billingEvent.upsert({
        where: { provider_event_id: eventKey },
        create: {
          provider: 'yookassa',
          provider_event_id: eventKey,
          event_type: parsed.data.event,
          payment_id: localPayment.id,
          payload: parsed.data as unknown as Prisma.InputJsonValue,
        },
        update: {},
      });
      if (event.processed_at) return;

      if (parsed.data.event === 'payment.canceled') {
        if (currentPayment.status !== 'canceled') throw new Error('Статус отмены не подтверждён');
        await tx.payment.update({
          where: { id: localPayment.id },
          data: {
            status: BillingStatus.CANCELED,
            raw_status: currentPayment as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.billingEvent.update({
          where: { id: event.id },
          data: { processed_at: new Date(), processing_error: null },
        });
        return;
      }

      if (localPayment.status !== BillingStatus.SUCCEEDED) {
        const verified = verifyPaidPayment(currentPayment, {
          providerPaymentId,
          userId: localPayment.user_id,
        });
        const active = await tx.subscription.findFirst({
          where: { user_id: localPayment.user_id, status: 'ACTIVE' },
          orderBy: { current_period_end: 'desc' },
        });
        const period = nextSubscriptionPeriod(active?.current_period_end || null, verified.paidAt);
        const subscription = active
          ? await tx.subscription.update({
              where: { id: active.id },
              data: {
                current_period_end: period.end,
                cancel_at_period_end: false,
                provider_payment_method_id: verified.paymentMethodId,
              },
            })
          : await tx.subscription.create({
              data: {
                user_id: localPayment.user_id,
                provider: 'yookassa',
                plan_code: PRO_MONTHLY_PLAN,
                status: 'ACTIVE',
                current_period_start: period.start,
                current_period_end: period.end,
                provider_payment_method_id: verified.paymentMethodId,
              },
            });
        await Promise.all([
          tx.payment.update({
            where: { id: localPayment.id },
            data: {
              status: BillingStatus.SUCCEEDED,
              subscription_id: subscription.id,
              paid_at: verified.paidAt,
              provider_payment_method_id: verified.paymentMethodId,
              raw_status: currentPayment as unknown as Prisma.InputJsonValue,
            },
          }),
          tx.profile.update({
            where: { id: localPayment.user_id },
            data: { subscription_tier: 'pro', subscription_expires_at: period.end },
          }),
        ]);
      }

      await tx.billingEvent.update({
        where: { id: event.id },
        data: { processed_at: new Date(), processing_error: null },
      });
    });
    return res.sendStatus(200);
  } catch (error) {
    console.error('[YooKassa webhook]', error);
    await prisma.billingEvent
      .upsert({
        where: { provider_event_id: eventKey },
        create: {
          provider: 'yookassa',
          provider_event_id: eventKey,
          event_type: parsed.data.event,
          payload: parsed.data as unknown as Prisma.InputJsonValue,
          processing_error: error instanceof Error ? error.message : 'Webhook error',
        },
        update: { processing_error: error instanceof Error ? error.message : 'Webhook error' },
      })
      .catch(() => undefined);
    return res.status(503).json({ error: 'Уведомление будет обработано повторно' });
  }
});

export default router;
