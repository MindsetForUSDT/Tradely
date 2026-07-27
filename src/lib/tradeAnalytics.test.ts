import { describe, expect, it } from 'vitest';
import type { Trade } from '@/types';
import { calculateTradeBreakdown } from './tradeAnalytics';

function trade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    user_id: 'user-1',
    symbol: 'HYPEUSDT',
    side: 'buy',
    amount: 3.53,
    price: 60.07,
    price_usd: 60.07,
    value_usd: 212.0118,
    fee: 0.42,
    fee_usd: 0.42,
    pnl_realized: -0.42,
    status: 'closed',
    timestamp: '2026-07-27T11:47:00.000Z',
    raw_data: JSON.stringify({
      entryPrice: 60.06,
      exitPrice: 60.07,
      openedAt: '2026-07-27T11:23:00.000Z',
      closedAt: '2026-07-27T11:47:00.000Z',
    }),
    ...overrides,
  };
}

describe('calculateTradeBreakdown', () => {
  it('separates gross movement, fees, adjustments and net P&L', () => {
    const result = calculateTradeBreakdown(trade());

    expect(result.grossPnl).toBeCloseTo(0.0353, 6);
    expect(result.fees).toBeCloseTo(0.42, 6);
    expect(result.fundingAndAdjustments).toBeCloseTo(-0.0353, 6);
    expect(result.grossPnl - result.fees + result.fundingAndAdjustments).toBeCloseTo(
      result.netPnl,
      6
    );
    expect(result.durationMinutes).toBe(24);
  });

  it('uses the inverse price formula for short trades', () => {
    const result = calculateTradeBreakdown(
      trade({
        side: 'sell',
        amount: 2,
        value_usd: 200,
        fee_usd: 1,
        pnl_realized: 19,
        raw_data: JSON.stringify({ entryPrice: 100, exitPrice: 90 }),
      })
    );

    expect(result.direction).toBe('short');
    expect(result.grossPnl).toBe(20);
    expect(result.netPnl).toBe(19);
    expect(result.fundingAndAdjustments).toBe(0);
  });
});
