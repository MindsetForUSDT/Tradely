import { describe, expect, it } from 'vitest';
import type { Trade } from '@/types';
import {
  calculateExpectancy,
  calculateMaxDrawdown,
  calculateProfitFactor,
  calculateRecoveryFactor,
  calculateStreakAnalysis,
} from './metrics';

const trade = (id: string, pnl: number): Trade => ({
  id,
  user_id: 'user-1',
  symbol: 'BTCUSDT',
  side: 'sell',
  amount: 1,
  price: 100,
  value_usd: 100,
  fee: 0,
  status: 'closed',
  pnl_realized: pnl,
  timestamp: `2026-01-${id.padStart(2, '0')}T00:00:00.000Z`,
});

describe('trade metrics', () => {
  it('calculates expectancy without treating breakeven trades as losses', () => {
    const trades = [trade('1', 100), trade('2', -50), trade('3', 0)];

    expect(calculateExpectancy(trades)).toBe(16.67);
  });

  it('calculates profit factor from gross realized profit and loss', () => {
    const trades = [trade('1', 120), trade('2', -40), trade('3', -20)];

    expect(calculateProfitFactor(trades)).toBe(2);
  });

  it('keeps the active streak when the latest trade is breakeven', () => {
    const trades = [trade('1', -20), trade('2', 10), trade('3', 15), trade('4', 0)];

    expect(calculateStreakAnalysis(trades)).toEqual({
      maxWinStreak: 2,
      maxLossStreak: 1,
      currentStreak: 2,
      currentStreakType: 'win',
    });
  });

  it('calculates drawdown from the cumulative realized P&L curve', () => {
    const trades = [trade('1', 100), trade('2', -25), trade('3', -35), trade('4', 20)];

    expect(calculateMaxDrawdown(trades)).toEqual({
      maxDrawdownPercent: 60,
      minPnl: -60,
      peakPnl: 100,
    });
  });

  it('keeps recovery factor negative for a net-losing series', () => {
    const trades = [trade('1', 20), trade('2', -50)];

    expect(calculateRecoveryFactor(trades)).toBe(-0.6);
  });
});
