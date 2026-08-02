import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEntitlements } from './entitlements.js';

const now = new Date('2026-08-02T10:00:00.000Z');

test('expired PRO is treated as Free', () => {
  const result = buildEntitlements(
    { subscription_tier: 'pro', subscription_expires_at: new Date('2026-08-02T09:59:59.000Z') },
    now
  );
  assert.equal(result.tier, 'free');
  assert.equal(result.historyDays, 30);
});

test('active PRO receives server-side plan limits', () => {
  const result = buildEntitlements(
    { subscription_tier: 'pro', subscription_expires_at: new Date('2026-09-02T10:00:00.000Z') },
    now
  );
  assert.equal(result.tier, 'pro');
  assert.equal(result.sourcesMax, 5);
  assert.equal(result.syncIntervalMinutes, 60);
});
