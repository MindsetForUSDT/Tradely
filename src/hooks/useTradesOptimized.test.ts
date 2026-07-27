import { describe, expect, it } from 'vitest';
import { normalizeTrade } from './useTradesOptimized';

describe('normalizeTrade', () => {
  it('converts Prisma decimal strings before arithmetic reaches UI components', () => {
    const normalized = normalizeTrade({
      id: 'trade-1',
      user_id: 'user-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      amount: '0.25' as unknown as number,
      price: undefined as unknown as number,
      price_usd: '64000.5' as unknown as number,
      value_usd: '16000.125' as unknown as number,
      fee: undefined as unknown as number,
      fee_usd: '8.25' as unknown as number,
      pnl_realized: '120.75' as unknown as number,
      status: 'closed',
      timestamp: '2026-07-27T10:00:00.000Z',
    });

    expect(normalized.amount).toBe(0.25);
    expect(normalized.price).toBe(64000.5);
    expect(normalized.fee).toBe(8.25);
    expect(normalized.pnl_realized).toBe(120.75);
    expect(normalized.value_usd + (normalized.pnl_realized || 0)).toBe(16120.875);
  });
});
