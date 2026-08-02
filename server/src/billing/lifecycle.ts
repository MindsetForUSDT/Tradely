import type { YooKassaPayment } from './yookassa.js';
import { PRO_MONTHLY_AMOUNT, PRO_MONTHLY_PLAN } from './yookassa.js';

export function addSubscriptionMonth(from: Date): Date {
  const result = new Date(from);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function nextSubscriptionPeriod(currentEnd: Date | null, paidAt: Date) {
  const start = currentEnd && currentEnd > paidAt ? currentEnd : paidAt;
  return { start, end: addSubscriptionMonth(start) };
}

export function verifyPaidPayment(
  payment: YooKassaPayment,
  expected: { providerPaymentId: string; userId: string }
): { paidAt: Date; paymentMethodId: string | null } {
  if (payment.id !== expected.providerPaymentId) throw new Error('Идентификатор платежа не совпал');
  if (payment.status !== 'succeeded' || payment.paid !== true) {
    throw new Error('Платёж ещё не подтверждён');
  }
  if (payment.amount.value !== PRO_MONTHLY_AMOUNT || payment.amount.currency !== 'RUB') {
    throw new Error('Сумма или валюта платежа не совпала');
  }
  if (
    payment.metadata?.user_id !== expected.userId ||
    payment.metadata?.plan_code !== PRO_MONTHLY_PLAN
  ) {
    throw new Error('Владелец или тариф платежа не совпал');
  }
  const paidAt = new Date(payment.captured_at || payment.created_at);
  if (Number.isNaN(paidAt.getTime())) throw new Error('Некорректное время платежа');
  return { paidAt, paymentMethodId: payment.payment_method?.id || null };
}
