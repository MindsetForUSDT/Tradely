import { describe, expect, it } from 'vitest';
import type { Trade } from '@/types';
import { calculatePerformanceAnalytics } from './performanceAnalytics';

function trade(id: string, pnl: number, overrides: Partial<Trade> = {}): Trade {
  return {
    id,
    user_id: 'user-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    amount: 1,
    price: 100,
    price_usd: 100,
    value_usd: 100,
    fee: 0,
    fee_usd: 0,
    pnl_realized: pnl,
    status: 'closed',
    timestamp: `2026-07-${id.padStart(2, '0')}T10:00:00.000Z`,
    raw_data: JSON.stringify({ netPnl: pnl, strategy: 'Breakout', finalTrade: true }),
    ...overrides,
  };
}

describe('calculatePerformanceAnalytics', () => {
  it('uses only final closed trades for strategy metrics', () => {
    const result = calculatePerformanceAnalytics([
      trade('1', 100),
      trade('2', -40),
      trade('3', 500, { status: 'open' }),
      trade('4', 300, { raw_data: JSON.stringify({ finalTrade: false }) }),
    ]);

    expect(result.trades).toBe(2);
    expect(result.expectancy).toBe(30);
    expect(result.profitFactor).toBe(2.5);
  });

  it('calculates streaks chronologically and keeps breakeven neutral', () => {
    const result = calculatePerformanceAnalytics([
      trade('4', -10),
      trade('1', 5),
      trade('3', 0),
      trade('2', 8),
    ]);

    expect(result.maxWinStreak).toBe(2);
    expect(result.maxLossStreak).toBe(1);
    expect(result.currentStreak).toBe(-1);
    expect(result.breakeven).toBe(1);
  });

  it('separates weekdays and exposes missing strategy coverage', () => {
    const result = calculatePerformanceAnalytics([
      trade('27', 12),
      trade('28', -4, { raw_data: JSON.stringify({ netPnl: -4, finalTrade: true }) }),
    ]);

    expect(result.weekdays.find((day) => day.label === 'Пн')?.netPnl).toBe(12);
    expect(result.weekdays.find((day) => day.label === 'Вт')?.netPnl).toBe(-4);
    expect(result.strategyCoverage).toBe(50);
    expect(result.strategies.some((strategy) => strategy.key === 'unassigned')).toBe(true);
  });

  it('does not invent a finite profit factor without losing trades', () => {
    const result = calculatePerformanceAnalytics([trade('1', 10), trade('2', 20)]);

    expect(result.profitFactor).toBeNull();
    expect(result.payoffRatio).toBeNull();
    expect(result.sample).toBe('small');
  });
});
