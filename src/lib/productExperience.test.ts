import { describe, expect, it } from 'vitest';
import {
  buildDisciplineHistory,
  getCalendarRangeStart,
  safeInternalPath,
  summarizeTradePeriod,
} from '@/lib/productExperience';
import type { Trade } from '@/types';

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: overrides.id || 'trade-1',
    user_id: 'user-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    amount: 1,
    price: 100,
    price_usd: 100,
    value_usd: 100,
    fee: 0,
    fee_usd: 0,
    status: 'closed',
    pnl_realized: 0,
    timestamp: '2026-07-31T10:00:00.000Z',
    ...overrides,
  };
}

describe('product experience helpers', () => {
  it('uses inclusive calendar boundaries for product periods', () => {
    const start = getCalendarRangeStart(7, new Date(2026, 6, 31, 18, 45));
    expect(start).toEqual(new Date(2026, 6, 25, 0, 0, 0, 0));
  });

  it('keeps period and discipline P&L on the shared net calculation', () => {
    const trades = [
      trade({
        id: 'winner',
        pnl_realized: 82,
        fee_usd: 8,
        raw_data: JSON.stringify({ grossPnl: 100, tradingFees: 8, netPnl: 82 }),
      }),
      trade({
        id: 'loser',
        pnl_realized: -55,
        fee_usd: 5,
        raw_data: JSON.stringify({ grossPnl: -50, tradingFees: 5, netPnl: -55 }),
      }),
    ];

    expect(summarizeTradePeriod(trades)).toMatchObject({
      closedTrades: 2,
      grossPnl: 50,
      fees: 13,
      netPnl: 27,
      winners: 1,
      winRate: 50,
    });

    const history = buildDisciplineHistory(trades, 50, new Date('2026-07-31T18:00:00.000Z'), 1);
    expect(history[0]).toMatchObject({ trades: 2, netPnl: 27, status: 'kept' });
  });

  it('accepts only same-origin internal redirects', () => {
    expect(safeInternalPath('/subscribe?selected=pro')).toBe('/subscribe?selected=pro');
    expect(safeInternalPath('//evil.example/collect')).toBe('/dashboard');
    expect(safeInternalPath('https://evil.example/collect')).toBe('/dashboard');
  });
});
