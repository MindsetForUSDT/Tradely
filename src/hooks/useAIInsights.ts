import { useMemo } from 'react';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';

interface Insight {
  type: 'warning' | 'success' | 'info';
  message: string;
  metric?: string;
  value?: string;
}

export function useAIInsights(days = 90): Insight[] {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: days });

  return useMemo(() => {
    const insights: Insight[] = [];
    if (!trades.length) return insights;

    // 1. Анализ по дням недели
    const byWeekday: Record<number, { pnl: number; count: number }> = {};
    trades.forEach((t: any) => {
      const day = new Date(t.timestamp).getDay();
      if (!byWeekday[day]) byWeekday[day] = { pnl: 0, count: 0 };
      byWeekday[day].pnl += t.pnl_realized || 0;
      byWeekday[day].count++;
    });

    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const worstDay = Object.entries(byWeekday).sort((a, b) => a[1].pnl - b[1].pnl)[0];
    const bestDay = Object.entries(byWeekday).sort((a, b) => b[1].pnl - a[1].pnl)[0];

    if (worstDay && worstDay[1].pnl < 0) {
      insights.push({
        type: 'warning',
        message: `Вы теряете деньги по ${weekdays[parseInt(worstDay[0])]}: ${worstDay[1].pnl.toFixed(2)}$ за ${worstDay[1].count} сделок`,
        metric: 'weekday_pnl',
        value: worstDay[1].pnl.toFixed(2),
      });
    }

    if (bestDay && bestDay[1].pnl > 0) {
      insights.push({
        type: 'success',
        message: `Лучший день — ${weekdays[parseInt(bestDay[0])]}: +${bestDay[1].pnl.toFixed(2)}$`,
        metric: 'best_weekday',
        value: bestDay[1].pnl.toFixed(2),
      });
    }

    // 2. Анализ по размерам сделок
    const volumes = trades.map((t: any) => t.value_usd || 0).sort((a, b) => a - b);
    const median = volumes[Math.floor(volumes.length / 2)];
    const largeTrades = trades.filter((t: any) => (t.value_usd || 0) > median * 3);
    const largePnL = largeTrades.reduce((s, t) => s + (t.pnl_realized || 0), 0);

    if (largeTrades.length > 0 && largePnL < 0) {
      insights.push({
        type: 'warning',
        message: `Крупные сделки (>${(median * 3).toFixed(0)}$) принесли убыток ${largePnL.toFixed(2)}$`,
        metric: 'large_trades_pnl',
        value: largePnL.toFixed(2),
      });
    }

    // 3. Анализ винрейта по стратегиям
    const strategies = new Set(
      trades.filter((t: any) => t.strategy_tag).map((t: any) => t.strategy_tag)
    );
    strategies.forEach((strategy: any) => {
      const sTrades = trades.filter((t: any) => t.strategy_tag === strategy);
      const sWinners = sTrades.filter((t: any) => (t.pnl_realized || 0) > 0);
      const sWinRate = sTrades.length ? (sWinners.length / sTrades.length) * 100 : 0;
      const sPnl = sTrades.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);

      if (sTrades.length >= 5 && sWinRate < 40) {
        insights.push({
          type: 'warning',
          message: `Стратегия "${strategy}" имеет низкий винрейт ${sWinRate.toFixed(0)}% (${sTrades.length} сделок, P&L: ${sPnl.toFixed(2)}$)`,
          metric: 'low_winrate_strategy',
          value: strategy,
        });
      }
    });

    // 4. Анализ восстановления после убытков
    const { maxLossStreak } = (() => {
      let maxLoss = 0,
        currentL = 0;
      trades.forEach((t: any) => {
        if ((t.pnl_realized || 0) < 0) {
          currentL++;
          maxLoss = Math.max(maxLoss, currentL);
        } else currentL = 0;
      });
      return { maxLossStreak: maxLoss };
    })();

    if (maxLossStreak >= 5) {
      insights.push({
        type: 'warning',
        message: `Серия из ${maxLossStreak} убыточных сделок подряд. Проверьте риск-менеджмент.`,
        metric: 'loss_streak',
        value: String(maxLossStreak),
      });
    }

    // 5. Успешные паттерны
    const winners = trades.filter((t: any) => (t.pnl_realized || 0) > 0);
    if (winners.length > trades.length * 0.6) {
      insights.push({
        type: 'success',
        message: `Отличный общий винрейт: ${((winners.length / trades.length) * 100).toFixed(1)}%`,
        metric: 'winrate',
        value: ((winners.length / trades.length) * 100).toFixed(1),
      });
    }

    return insights;
  }, [trades]);
}
