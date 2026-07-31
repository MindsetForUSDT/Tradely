import { describe, expect, it } from 'vitest';
import type { Trade } from '@/types';
import { calculateLossDiagnostics } from './lossDiagnostics';

function trade(id: string, overrides: Partial<Trade> = {}): Trade {
  return {
    id,
    user_id: 'user-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    amount: 1,
    price: 100,
    price_usd: 100,
    value_usd: 100,
    fee: 2,
    fee_usd: 2,
    pnl_realized: 8,
    status: 'closed',
    timestamp: '2026-07-27T10:30:00.000Z',
    raw_data: JSON.stringify({
      entryPrice: 100,
      exitPrice: 110,
      openedAt: '2026-07-27T10:00:00.000Z',
      closedAt: '2026-07-27T10:30:00.000Z',
      grossPnl: 10,
      tradingFees: 2,
      fundingAndAdjustments: 0,
      netPnl: 8,
      stopLoss: 95,
      emotion: 'calm',
    }),
    ...overrides,
  };
}

describe('calculateLossDiagnostics', () => {
  it('separates commission load, risk and execution coverage', () => {
    const result = calculateLossDiagnostics([
      trade('win'),
      trade('loss', {
        symbol: 'ETHUSDT',
        pnl_realized: -12,
        timestamp: '2026-07-27T11:45:00.000Z',
        raw_data: JSON.stringify({
          entryPrice: 100,
          exitPrice: 90,
          openedAt: '2026-07-27T11:15:00.000Z',
          closedAt: '2026-07-27T11:45:00.000Z',
          grossPnl: -10,
          tradingFees: 2,
          fundingAndAdjustments: 0,
          netPnl: -12,
          emotion: 'fear',
        }),
      }),
      trade('win-2', {
        timestamp: '2026-07-28T10:30:00.000Z',
      }),
    ]);

    expect(result.trades).toBe(3);
    expect(result.grossPnl).toBe(10);
    expect(result.fees).toBe(6);
    expect(result.netPnl).toBe(4);
    expect(result.feeRateOfTurnover).toBeCloseTo(2);
    expect(result.feeShareOfGrossPnl).toBeCloseTo(60);
    expect(result.maxDrawdown).toBe(12);
    expect(result.maxLoss).toBe(12);
    expect(result.averageHoldingMinutes).toBe(30);
    expect(result.holdingCoverage).toBe(100);
    expect(result.riskCoverage).toBeCloseTo(66.666, 2);
    expect(result.hourly.reduce((sum, bucket) => sum + bucket.trades, 0)).toBe(3);
    expect(result.hourly.some((bucket) => bucket.trades === 2)).toBe(true);
    expect(result.symbols[0]?.label).toBe('BTCUSDT');
    expect(result.insights[0]?.id).toBe('fees');
  });

  it('does not claim a stable cause from fewer than three trades', () => {
    const result = calculateLossDiagnostics([trade('only')]);

    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]?.id).toBe('sample');
    expect(result.insights[0]?.tone).toBe('neutral');
  });

  it('does not fabricate unavailable holding and risk metrics', () => {
    const result = calculateLossDiagnostics([
      trade('unknown', {
        raw_data: JSON.stringify({
          grossPnl: 10,
          tradingFees: 2,
          netPnl: 8,
        }),
      }),
    ]);

    expect(result.averageHoldingMinutes).toBeNull();
    expect(result.averageRMultiple).toBeNull();
    expect(result.holdingCoverage).toBe(0);
    expect(result.riskCoverage).toBe(0);
  });
});
