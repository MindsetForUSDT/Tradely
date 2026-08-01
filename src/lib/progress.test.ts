import { describe, expect, it } from 'vitest';
import type { Trade } from '@/types';
import { buildProgressAchievements, clampGoalProgress, summarizeWeek } from '@/lib/progress';

function trade(id: string, timestamp: string, pnl: number, fee: number): Trade {
  return {
    id,
    user_id: 'user-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    amount: 1,
    price: 100,
    value_usd: 100,
    fee,
    fee_usd: fee,
    pnl_realized: pnl,
    status: 'closed',
    timestamp,
    raw_data: JSON.stringify({ grossPnl: pnl + fee, tradingFees: fee }),
  };
}

describe('progress helpers', () => {
  it('clamps goal progress to whole percentages', () => {
    expect(clampGoalProgress(-12)).toBe(0);
    expect(clampGoalProgress(46.7)).toBe(47);
    expect(clampGoalProgress(130)).toBe(100);
  });

  it('summarizes only the supplied real trades by day', () => {
    const summary = summarizeWeek([
      trade('1', '2026-07-29T10:00:00.000Z', 12, 1),
      trade('2', '2026-07-29T12:00:00.000Z', -4, 0.5),
      trade('3', '2026-07-30T09:00:00.000Z', 8, 1.5),
    ]);

    expect(summary.trades).toBe(3);
    expect(summary.netPnl).toBe(16);
    expect(summary.grossPnl).toBe(19);
    expect(summary.fees).toBe(3);
    expect(summary.winRate).toBeCloseTo(66.67, 1);
    expect(summary.activeDays).toBe(2);
    expect(summary.positiveDays).toBe(2);
    expect(summary.days[0]).toMatchObject({ trades: 2, netPnl: 8 });
  });

  it('unlocks achievements only from verifiable counts', () => {
    const achievements = buildProgressAchievements({
      accountCreated: true,
      walletCount: 1,
      tradeCount: 12,
      completedGoalCount: 0,
    });

    expect(achievements.find((item) => item.id === 'workspace')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'source')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'sample-size')?.unlocked).toBe(false);
    expect(achievements.find((item) => item.id === 'completed-goal')?.unlocked).toBe(false);
  });
});
