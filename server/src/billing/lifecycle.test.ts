import assert from 'node:assert/strict';
import test from 'node:test';
import { addSubscriptionMonth, nextSubscriptionPeriod, verifyPaidPayment } from './lifecycle.js';

const payment = {
  id: 'payment-1',
  status: 'succeeded' as const,
  paid: true,
  amount: { value: '499.00', currency: 'RUB' },
  created_at: '2026-08-02T10:00:00.000Z',
  metadata: { user_id: 'user-1', plan_code: 'pro_monthly' },
};

test('adds one calendar month without overflowing short months', () => {
  assert.equal(
    addSubscriptionMonth(new Date('2026-01-31T10:00:00.000Z')).toISOString(),
    '2026-02-28T10:00:00.000Z'
  );
});

test('extends an active subscription from its existing end', () => {
  const period = nextSubscriptionPeriod(
    new Date('2026-09-10T10:00:00.000Z'),
    new Date('2026-08-02T10:00:00.000Z')
  );
  assert.equal(period.start.toISOString(), '2026-09-10T10:00:00.000Z');
  assert.equal(period.end.toISOString(), '2026-10-10T10:00:00.000Z');
});

test('verifies amount, currency, owner and plan before granting access', () => {
  const verified = verifyPaidPayment(payment, { providerPaymentId: 'payment-1', userId: 'user-1' });
  assert.equal(verified.paidAt.toISOString(), payment.created_at);
});

test('rejects a succeeded payment assigned to another account', () => {
  assert.throws(
    () => verifyPaidPayment(payment, { providerPaymentId: 'payment-1', userId: 'user-2' }),
    /Владелец/
  );
});
