import { requiredEnv } from '../config/env.js';

export const PRO_MONTHLY_AMOUNT = '499.00';
export const PRO_MONTHLY_PLAN = 'pro_monthly';
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

interface YooMoneyAmount {
  value: string;
  currency: string;
}

export interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid?: boolean;
  amount: YooMoneyAmount;
  created_at: string;
  captured_at?: string;
  confirmation?: { type: string; confirmation_url?: string };
  payment_method?: { id?: string; saved?: boolean; title?: string };
  metadata?: Record<string, string>;
  test?: boolean;
}

export function isBillingConfigured() {
  return Boolean(
    process.env.BILLING_ENABLED === 'true' &&
    process.env.YOOKASSA_SHOP_ID?.trim() &&
    process.env.YOOKASSA_SECRET_KEY?.trim()
  );
}

function authorizationHeader() {
  const credentials = `${requiredEnv('YOOKASSA_SHOP_ID')}:${requiredEnv('YOOKASSA_SECRET_KEY')}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function requestYooKassa<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${YOOKASSA_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authorizationHeader(),
      'Content-Type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const description = typeof payload.description === 'string' ? payload.description : '';
    throw new Error(
      `ЮKassa отклонила запрос (${response.status})${description ? `: ${description}` : ''}`
    );
  }
  return payload as T;
}

export function createYooKassaPayment(input: {
  idempotenceKey: string;
  userId: string;
  email: string;
  returnUrl: string;
}) {
  const vatCode = Number(process.env.YOOKASSA_VAT_CODE || 0);
  const receipt =
    Number.isInteger(vatCode) && vatCode >= 1 && vatCode <= 6
      ? {
          customer: { email: input.email },
          items: [
            {
              description: 'Подписка Tradeum PRO на 1 месяц',
              quantity: '1.00',
              amount: { value: PRO_MONTHLY_AMOUNT, currency: 'RUB' },
              vat_code: vatCode,
              payment_mode: 'full_payment',
              payment_subject: 'service',
            },
          ],
        }
      : undefined;

  return requestYooKassa<YooKassaPayment>('/payments', {
    method: 'POST',
    headers: { 'Idempotence-Key': input.idempotenceKey },
    body: JSON.stringify({
      amount: { value: PRO_MONTHLY_AMOUNT, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: input.returnUrl },
      description: 'Tradeum PRO — 1 месяц',
      metadata: { user_id: input.userId, plan_code: PRO_MONTHLY_PLAN },
      save_payment_method: false,
      ...(receipt ? { receipt } : {}),
    }),
  });
}

export function getYooKassaPayment(paymentId: string) {
  return requestYooKassa<YooKassaPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}
