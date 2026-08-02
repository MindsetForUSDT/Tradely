import { describe, expect, it } from 'vitest';
import { resolveBillingViewState, type SubscriptionSummary } from './billing';

const free: SubscriptionSummary = {
  configured: true,
  plan: 'free',
  plan_code: 'free',
  current_period_end: null,
  cancel_at_period_end: false,
  renewal: 'manual',
};

describe('billing view state', () => {
  it('does not claim checkout is available without server configuration', () => {
    expect(
      resolveBillingViewState({
        loading: false,
        returnedFromProvider: false,
        subscription: { ...free, configured: false },
      })
    ).toBe('unavailable');
  });

  it('does not activate PRO just because the user returned from checkout', () => {
    expect(
      resolveBillingViewState({ loading: false, returnedFromProvider: true, subscription: free })
    ).toBe('checking');
  });

  it('shows active only after the server returns the PRO entitlement', () => {
    expect(
      resolveBillingViewState({
        loading: false,
        returnedFromProvider: true,
        subscription: { ...free, plan: 'pro', plan_code: 'pro_monthly' },
      })
    ).toBe('active');
  });
});
