import { calculateTradeBreakdown } from '@/lib/tradeAnalytics';
import type { Trade } from '@/types';

export type ProductRangeDays = 7 | 30 | 90;

export interface TradePeriodSummary {
  closedTrades: number;
  grossPnl: number;
  fees: number;
  netPnl: number;
  winRate: number;
  winners: number;
}

export type DisciplineStatus = 'kept' | 'breached' | 'inactive' | 'not-configured';

export interface DisciplineDay {
  key: string;
  label: string;
  trades: number;
  netPnl: number;
  lossAmount: number;
  limitUsage: number | null;
  status: DisciplineStatus;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getCalendarRangeStart(days: ProductRangeDays | number, now = new Date()) {
  const safeDays = Math.max(1, Math.floor(days));
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - (safeDays - 1));
  return start;
}

export function summarizeTradePeriod(trades: Trade[]): TradePeriodSummary {
  const closedTrades = trades.filter((trade) => trade.status === 'closed');
  const summary = closedTrades.reduce(
    (result, trade) => {
      const breakdown = calculateTradeBreakdown(trade);
      result.grossPnl += breakdown.grossPnl;
      result.fees += breakdown.fees;
      result.netPnl += breakdown.netPnl;
      if (breakdown.netPnl > 0) result.winners += 1;
      return result;
    },
    { grossPnl: 0, fees: 0, netPnl: 0, winners: 0 }
  );

  return {
    closedTrades: closedTrades.length,
    ...summary,
    winRate: closedTrades.length ? (summary.winners / closedTrades.length) * 100 : 0,
  };
}

export function buildDisciplineHistory(
  trades: Trade[],
  dailyLossLimit: number,
  now = new Date(),
  days = 14
): DisciplineDay[] {
  const safeDays = Math.max(1, Math.floor(days));
  const firstDay = getCalendarRangeStart(safeDays, now);
  const grouped = new Map<string, { trades: number; netPnl: number }>();

  trades.forEach((trade) => {
    if (trade.status !== 'closed') return;
    const timestamp = new Date(trade.timestamp);
    if (!Number.isFinite(timestamp.getTime()) || timestamp < firstDay) return;
    const key = localDateKey(timestamp);
    const current = grouped.get(key) || { trades: 0, netPnl: 0 };
    current.trades += 1;
    current.netPnl += calculateTradeBreakdown(trade).netPnl;
    grouped.set(key, current);
  });

  const configuredLimit =
    Number.isFinite(dailyLossLimit) && dailyLossLimit > 0 ? Math.abs(dailyLossLimit) : null;

  return Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    const key = localDateKey(date);
    const result = grouped.get(key) || { trades: 0, netPnl: 0 };
    const lossAmount = Math.max(0, -result.netPnl);
    const limitUsage = configuredLimit ? (lossAmount / configuredLimit) * 100 : null;
    const status: DisciplineStatus = !result.trades
      ? 'inactive'
      : !configuredLimit
        ? 'not-configured'
        : lossAmount > configuredLimit
          ? 'breached'
          : 'kept';

    return {
      key,
      label: new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'short',
      }).format(date),
      trades: result.trades,
      netPnl: result.netPnl,
      lossAmount,
      limitUsage,
      status,
    };
  });
}

export function safeInternalPath(value: unknown, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const origin = 'https://tradeum.local';
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
