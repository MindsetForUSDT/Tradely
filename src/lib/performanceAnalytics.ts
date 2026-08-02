import type { Trade } from '@/types';
import { calculateTradeBreakdown, parseTradeMeta } from './tradeAnalytics';

export interface PerformanceBucket {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  expectancy: number;
  profitFactor: number | null;
}

export interface PerformanceAnalytics {
  finalTrades: Trade[];
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  expectancy: number;
  profitFactor: number | null;
  averageWin: number;
  averageLoss: number;
  payoffRatio: number | null;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: number;
  strategyCoverage: number;
  sample: 'small' | 'working' | 'extended';
  weekdays: PerformanceBucket[];
  strategies: PerformanceBucket[];
}

interface MutableBucket {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
}

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function round(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

export function isFinalTrade(trade: Trade) {
  if (trade.status !== 'closed') return false;
  return parseTradeMeta(trade.raw_data).finalTrade !== false;
}

function addToBucket(map: Map<string, MutableBucket>, key: string, label: string, pnl: number) {
  const bucket = map.get(key) || {
    key,
    label,
    trades: 0,
    wins: 0,
    losses: 0,
    grossProfit: 0,
    grossLoss: 0,
    netPnl: 0,
  };

  bucket.trades += 1;
  bucket.wins += pnl > 0 ? 1 : 0;
  bucket.losses += pnl < 0 ? 1 : 0;
  bucket.grossProfit += pnl > 0 ? pnl : 0;
  bucket.grossLoss += pnl < 0 ? Math.abs(pnl) : 0;
  bucket.netPnl += pnl;
  map.set(key, bucket);
}

function finalizeBucket(bucket: MutableBucket): PerformanceBucket {
  return {
    key: bucket.key,
    label: bucket.label,
    trades: bucket.trades,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate: bucket.trades ? (bucket.wins / bucket.trades) * 100 : 0,
    netPnl: round(bucket.netPnl),
    expectancy: bucket.trades ? round(bucket.netPnl / bucket.trades) : 0,
    profitFactor:
      bucket.grossLoss > 0
        ? round(bucket.grossProfit / bucket.grossLoss)
        : bucket.grossProfit > 0
          ? null
          : 0,
  };
}

export function calculatePerformanceAnalytics(trades: Trade[]): PerformanceAnalytics {
  const finalTrades = trades
    .filter(isFinalTrade)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const weekdayMap = new Map<string, MutableBucket>();
  const strategyMap = new Map<string, MutableBucket>();

  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let netPnl = 0;
  let strategyTagged = 0;
  let winStreak = 0;
  let lossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  for (const trade of finalTrades) {
    const breakdown = calculateTradeBreakdown(trade);
    const pnl = breakdown.netPnl;
    const meta = parseTradeMeta(trade.raw_data);

    netPnl += pnl;
    if (pnl > 0) {
      wins += 1;
      grossProfit += pnl;
      winStreak += 1;
      lossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, winStreak);
    } else if (pnl < 0) {
      losses += 1;
      grossLoss += Math.abs(pnl);
      lossStreak += 1;
      winStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, lossStreak);
    } else {
      breakeven += 1;
    }

    const closedAt = new Date(meta.closedAt || trade.timestamp);
    if (Number.isFinite(closedAt.getTime())) {
      const weekdayIndex = (closedAt.getDay() + 6) % 7;
      addToBucket(weekdayMap, String(weekdayIndex), weekdayLabels[weekdayIndex], pnl);
    }

    const strategy = String(meta.strategy || trade.strategy_tag || '').trim();
    if (strategy) strategyTagged += 1;
    addToBucket(strategyMap, strategy || 'unassigned', strategy || 'Без стратегии', pnl);
  }

  const averageWin = wins ? grossProfit / wins : 0;
  const averageLoss = losses ? grossLoss / losses : 0;
  const weekdays = weekdayLabels.map((label, index) =>
    finalizeBucket(
      weekdayMap.get(String(index)) || {
        key: String(index),
        label,
        trades: 0,
        wins: 0,
        losses: 0,
        grossProfit: 0,
        grossLoss: 0,
        netPnl: 0,
      }
    )
  );

  return {
    finalTrades,
    trades: finalTrades.length,
    wins,
    losses,
    breakeven,
    expectancy: finalTrades.length ? round(netPnl / finalTrades.length) : 0,
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss) : grossProfit > 0 ? null : 0,
    averageWin: round(averageWin),
    averageLoss: round(averageLoss),
    payoffRatio: averageLoss > 0 ? round(averageWin / averageLoss) : averageWin > 0 ? null : 0,
    maxWinStreak,
    maxLossStreak,
    currentStreak: winStreak > 0 ? winStreak : lossStreak > 0 ? -lossStreak : 0,
    strategyCoverage: finalTrades.length ? (strategyTagged / finalTrades.length) * 100 : 0,
    sample: finalTrades.length >= 50 ? 'extended' : finalTrades.length >= 20 ? 'working' : 'small',
    weekdays,
    strategies: [...strategyMap.values()]
      .map(finalizeBucket)
      .sort((a, b) => b.trades - a.trades || b.netPnl - a.netPnl),
  };
}
