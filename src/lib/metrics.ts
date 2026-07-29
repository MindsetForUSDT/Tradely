// lib/metrics.ts — ЗАЩИЩЕННЫЕ МЕТРИКИ
import type { Trade } from '@/types';

function safeDivide(a: number, b: number, fallback = 0): number {
  if (!isFinite(a) || !isFinite(b) || b === 0) return fallback;
  const result = a / b;
  return isFinite(result) ? +result.toFixed(4) : fallback;
}

/**
 * Математическое ожидание (Expectancy)
 * Формула: (WinRate × AvgWin) - (LossRate × AvgLoss)
 */
export function calculateExpectancy(trades: Trade[]): number {
  if (!trades?.length) return 0;

  const winners = trades.filter((t) => (t.pnl_realized ?? 0) > 0);
  const losers = trades.filter((t) => (t.pnl_realized ?? 0) < 0);

  const winRate = winners.length / trades.length;
  const lossRate = losers.length / trades.length;

  const avgWin = winners.length
    ? winners.reduce((s, t) => s + (t.pnl_realized ?? 0), 0) / winners.length
    : 0;

  const avgLoss = losers.length
    ? Math.abs(losers.reduce((s, t) => s + (t.pnl_realized ?? 0), 0)) / losers.length
    : 0;

  const expectancy = winRate * avgWin - lossRate * avgLoss;
  return isFinite(expectancy) ? +expectancy.toFixed(2) : 0;
}

/**
 * Фактор прибыли (Profit Factor)
 * Формула: GrossProfit / GrossLoss
 */
export function calculateProfitFactor(trades: Trade[]): number {
  if (!trades?.length) return 0;

  const grossProfit = trades
    .filter((t) => (t.pnl_realized ?? 0) > 0)
    .reduce((s, t) => s + (t.pnl_realized ?? 0), 0);

  const grossLoss = Math.abs(
    trades.filter((t) => (t.pnl_realized ?? 0) < 0).reduce((s, t) => s + (t.pnl_realized ?? 0), 0)
  );

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;

  const pf = grossProfit / grossLoss;
  return isFinite(pf) ? +pf.toFixed(2) : 0;
}

export interface StreakAnalysis {
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: number; // >0 для побед, <0 для поражений, 0 если нет сделок
  currentStreakType: 'win' | 'loss' | 'none';
}

/**
 * Анализ серий побед/поражений
 */
export function calculateStreakAnalysis(trades: Trade[]): StreakAnalysis {
  if (!trades?.length) {
    return {
      maxWinStreak: 0,
      maxLossStreak: 0,
      currentStreak: 0,
      currentStreakType: 'none',
    };
  }

  let maxWin = 0;
  let maxLoss = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const trade of trades) {
    const pnl = trade.pnl_realized ?? 0;

    if (pnl > 0) {
      currentWin++;
      currentLoss = 0;
      maxWin = Math.max(maxWin, currentWin);
    } else if (pnl < 0) {
      currentLoss++;
      currentWin = 0;
      maxLoss = Math.max(maxLoss, currentLoss);
    }
    // pnl === 0 игнорируется (нейтральные сделки не прерывают серию)
  }

  const currentStreak = currentWin > 0 ? currentWin : currentLoss > 0 ? -currentLoss : 0;

  return {
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    currentStreak,
    currentStreakType: currentStreak > 0 ? 'win' : currentStreak < 0 ? 'loss' : 'none',
  };
}

/**
 * Коэффициент восстановления (Recovery Factor)
 * Формула: TotalPnL / MaxDrawdown
 */
export function calculateRecoveryFactor(trades: Trade[]): number {
  if (!trades?.length) return 0;

  const totalPnl = trades.reduce((s, t) => s + (t.pnl_realized ?? 0), 0);
  const drawdown = calculateMaxDrawdown(trades);

  return safeDivide(totalPnl, Math.abs(drawdown.minPnl), totalPnl > 0 ? 999 : 0);
}

/**
 * Максимальная просадка
 */
export function calculateMaxDrawdown(trades: Trade[]): {
  maxDrawdownPercent: number;
  minPnl: number;
  peakPnl: number;
} {
  if (!trades?.length) {
    return { maxDrawdownPercent: 0, minPnl: 0, peakPnl: 0 };
  }

  let peak = 0;
  let minPnl = 0;
  let runningPnl = 0;

  for (const trade of trades) {
    runningPnl += trade.pnl_realized ?? 0;
    peak = Math.max(peak, runningPnl);
    minPnl = Math.min(minPnl, runningPnl - peak);
  }

  const drawdownPercent = peak > 0 ? (Math.abs(minPnl) / peak) * 100 : 0;

  return {
    maxDrawdownPercent: +drawdownPercent.toFixed(2),
    minPnl: +minPnl.toFixed(2),
    peakPnl: +peak.toFixed(2),
  };
}
