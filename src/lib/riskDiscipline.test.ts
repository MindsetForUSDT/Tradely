import { describe, expect, it } from 'vitest';
import { buildRiskDisciplineSnapshot } from '@/lib/riskDiscipline';
import type { Trade } from '@/types';

function trade(
  id: string,
  timestamp: string,
  pnl: number,
  status: Trade['status'] = 'closed'
): Trade {
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
    status,
    timestamp,
    raw_data: JSON.stringify({ netPnl: pnl }),
  };
}

describe('risk discipline snapshot', () => {
  const now = new Date(2026, 7, 5, 18, 0, 0);

  it('separates the current day from the calendar week', () => {
    const snapshot = buildRiskDisciplineSnapshot(
      [
        trade('monday', new Date(2026, 7, 3, 12).toISOString(), -70),
        trade('today', new Date(2026, 7, 5, 10).toISOString(), -35),
      ],
      { daily: 100, weekly: 200 },
      now
    );

    expect(snapshot.today).toMatchObject({ trades: 1, netPnl: -35, status: 'safe' });
    expect(snapshot.week).toMatchObject({ trades: 2, netPnl: -105, status: 'safe' });
  });

  it('warns at 80% and stops when either limit is reached', () => {
    const warning = buildRiskDisciplineSnapshot(
      [trade('today', new Date(2026, 7, 5, 10).toISOString(), -80)],
      { daily: 100, weekly: 500 },
      now
    );
    expect(warning.today).toMatchObject({ usagePercent: 80, remaining: 20, status: 'warning' });
    expect(warning.shouldStopTrading).toBe(false);

    const breached = buildRiskDisciplineSnapshot(
      [trade('today', new Date(2026, 7, 5, 10).toISOString(), -100)],
      { daily: 100, weekly: 500 },
      now
    );
    expect(breached.today.status).toBe('breached');
    expect(breached.shouldStopTrading).toBe(true);
  });

  it('keeps unconfigured and inactive windows distinct', () => {
    const unconfigured = buildRiskDisciplineSnapshot([], { daily: 0, weekly: 0 }, now);
    expect(unconfigured.today.status).toBe('not-configured');

    const inactive = buildRiskDisciplineSnapshot([], { daily: 100, weekly: 500 }, now);
    expect(inactive.today.status).toBe('no-trades');
    expect(inactive.today.usagePercent).toBe(0);
  });

  it('ignores open, future and previous-week trades', () => {
    const snapshot = buildRiskDisciplineSnapshot(
      [
        trade('open', new Date(2026, 7, 5, 10).toISOString(), -500, 'open'),
        trade('future', new Date(2026, 7, 6, 10).toISOString(), -500),
        trade('previous-week', new Date(2026, 7, 2, 10).toISOString(), -500),
      ],
      { daily: 100, weekly: 500 },
      now
    );

    expect(snapshot.today.trades).toBe(0);
    expect(snapshot.week.trades).toBe(0);
    expect(snapshot.shouldStopTrading).toBe(false);
  });
});
