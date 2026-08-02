import { calculateTradeBreakdown } from '@/lib/tradeAnalytics';
import type { Trade } from '@/types';

export type RiskWindowStatus = 'not-configured' | 'no-trades' | 'safe' | 'warning' | 'breached';

export interface RiskWindowSnapshot {
  trades: number;
  netPnl: number;
  lossUsed: number;
  limit: number;
  remaining: number | null;
  usagePercent: number | null;
  status: RiskWindowStatus;
}

export interface RiskDisciplineSnapshot {
  today: RiskWindowSnapshot;
  week: RiskWindowSnapshot;
  shouldStopTrading: boolean;
  latestTradeAt: string | null;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfLocalWeek(value: Date) {
  const start = startOfLocalDay(value);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function summarizeWindow(trades: Trade[], limitValue: number): RiskWindowSnapshot {
  const netPnl = trades.reduce((total, trade) => total + calculateTradeBreakdown(trade).netPnl, 0);
  const lossUsed = Math.max(0, -netPnl);
  const limit = Number.isFinite(limitValue) ? Math.max(0, limitValue) : 0;
  const usagePercent = limit > 0 ? (lossUsed / limit) * 100 : null;
  const remaining = limit > 0 ? Math.max(0, limit - lossUsed) : null;
  const status: RiskWindowStatus =
    limit <= 0
      ? 'not-configured'
      : trades.length === 0
        ? 'no-trades'
        : lossUsed >= limit
          ? 'breached'
          : usagePercent !== null && usagePercent >= 80
            ? 'warning'
            : 'safe';

  return {
    trades: trades.length,
    netPnl,
    lossUsed,
    limit,
    remaining,
    usagePercent,
    status,
  };
}

export function buildRiskDisciplineSnapshot(
  trades: Trade[],
  limits: { daily: number; weekly: number },
  now = new Date()
): RiskDisciplineSnapshot {
  const todayStart = startOfLocalDay(now).getTime();
  const weekStart = startOfLocalWeek(now).getTime();
  const nowTime = now.getTime();
  const closedTrades = trades
    .filter((trade) => trade.status === 'closed')
    .map((trade) => ({ trade, timestamp: new Date(trade.timestamp).getTime() }))
    .filter(({ timestamp }) => Number.isFinite(timestamp) && timestamp <= nowTime);

  const todayTrades = closedTrades
    .filter(({ timestamp }) => timestamp >= todayStart)
    .map(({ trade }) => trade);
  const weekTrades = closedTrades
    .filter(({ timestamp }) => timestamp >= weekStart)
    .map(({ trade }) => trade);
  const latestTimestamp = closedTrades.reduce(
    (latest, item) => Math.max(latest, item.timestamp),
    Number.NEGATIVE_INFINITY
  );
  const today = summarizeWindow(todayTrades, limits.daily);
  const week = summarizeWindow(weekTrades, limits.weekly);

  return {
    today,
    week,
    shouldStopTrading: today.status === 'breached' || week.status === 'breached',
    latestTradeAt: Number.isFinite(latestTimestamp)
      ? new Date(latestTimestamp).toISOString()
      : null,
  };
}
