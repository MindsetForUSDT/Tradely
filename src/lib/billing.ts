export type BillingPlan = 'free' | 'pro';
export type BillingViewState = 'loading' | 'unavailable' | 'ready' | 'checking' | 'active';

export interface SubscriptionSummary {
  configured: boolean;
  plan: BillingPlan;
  plan_code: 'free' | 'pro_monthly';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  renewal: 'manual';
}

export interface PaymentRecord {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'succeeded' | 'canceled' | 'failed' | 'refunded';
  paid_at: string | null;
  created_at: string;
}

export function resolveBillingViewState(input: {
  loading: boolean;
  returnedFromProvider: boolean;
  subscription: SubscriptionSummary | null;
}): BillingViewState {
  if (input.loading) return 'loading';
  if (!input.subscription?.configured) return 'unavailable';
  if (input.subscription.plan === 'pro') return 'active';
  return input.returnedFromProvider ? 'checking' : 'ready';
}

export function formatBillingDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
