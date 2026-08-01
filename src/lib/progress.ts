import type { Trade } from '@/types';
import { calculateTradeBreakdown } from '@/lib/tradeAnalytics';

export interface GoalRecord {
  id: string;
  title: string;
  target: string;
  progress: number;
  status: 'active' | 'completed' | 'archived';
  due_at?: string | null;
  created_at?: string;
}

export interface WeeklyDaySummary {
  date: string;
  trades: number;
  netPnl: number;
  fees: number;
}

export interface WeeklyProgressSummary {
  trades: number;
  netPnl: number;
  grossPnl: number;
  fees: number;
  wins: number;
  losses: number;
  winRate: number | null;
  activeDays: number;
  positiveDays: number;
  days: WeeklyDaySummary[];
}

export interface ProgressAchievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  progressLabel: string;
}

export function clampGoalProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function summarizeWeek(trades: Trade[]): WeeklyProgressSummary {
  const dayMap = new Map<string, WeeklyDaySummary>();
  let netPnl = 0;
  let grossPnl = 0;
  let fees = 0;
  let wins = 0;
  let losses = 0;

  for (const trade of trades) {
    const breakdown = calculateTradeBreakdown(trade);
    const date = trade.timestamp.slice(0, 10);
    const current = dayMap.get(date) ?? { date, trades: 0, netPnl: 0, fees: 0 };

    current.trades += 1;
    current.netPnl += breakdown.netPnl;
    current.fees += breakdown.fees;
    dayMap.set(date, current);

    netPnl += breakdown.netPnl;
    grossPnl += breakdown.grossPnl;
    fees += breakdown.fees;
    if (breakdown.netPnl > 0) wins += 1;
    if (breakdown.netPnl < 0) losses += 1;
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const closedTrades = wins + losses;

  return {
    trades: trades.length,
    netPnl,
    grossPnl,
    fees,
    wins,
    losses,
    winRate: closedTrades ? (wins / closedTrades) * 100 : null,
    activeDays: days.length,
    positiveDays: days.filter((day) => day.netPnl > 0).length,
    days,
  };
}

export function buildProgressAchievements(input: {
  accountCreated: boolean;
  walletCount: number;
  tradeCount: number;
  completedGoalCount: number;
}): ProgressAchievement[] {
  const { accountCreated, walletCount, tradeCount, completedGoalCount } = input;
  return [
    {
      id: 'workspace',
      title: 'Рабочее пространство создано',
      description: 'Профиль Tradeum готов к работе.',
      unlocked: accountCreated,
      progress: accountCreated ? 1 : 0,
      target: 1,
      progressLabel: accountCreated ? 'Готово' : 'Не завершено',
    },
    {
      id: 'source',
      title: 'Подключён первый источник',
      description: 'Торговая история может обновляться автоматически.',
      unlocked: walletCount > 0,
      progress: Math.min(walletCount, 1),
      target: 1,
      progressLabel: `${Math.min(walletCount, 1)} из 1`,
    },
    {
      id: 'first-trade',
      title: 'Получена первая сделка',
      description: 'В журнале появились реальные торговые данные.',
      unlocked: tradeCount > 0,
      progress: Math.min(tradeCount, 1),
      target: 1,
      progressLabel: `${Math.min(tradeCount, 1)} из 1`,
    },
    {
      id: 'sample-size',
      title: 'Собрана выборка для анализа',
      description: '30 сделок дают более устойчивую основу для сравнения паттернов.',
      unlocked: tradeCount >= 30,
      progress: Math.min(tradeCount, 30),
      target: 30,
      progressLabel: `${Math.min(tradeCount, 30)} из 30 сделок`,
    },
    {
      id: 'completed-goal',
      title: 'Завершена первая цель',
      description: 'Проверяемое правило доведено до результата.',
      unlocked: completedGoalCount > 0,
      progress: Math.min(completedGoalCount, 1),
      target: 1,
      progressLabel: `${Math.min(completedGoalCount, 1)} из 1`,
    },
  ];
}
