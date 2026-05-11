// hooks/useAggregatedChartData.ts
import { useMemo } from 'react';
import type { Trade } from '@/types';

type AggregationLevel = 'hourly' | 'daily' | 'weekly' | 'monthly';

interface AggregatedPoint {
  timestamp: number;
  date: string;
  pnl: number;
  cumulativePnl: number;
  volume: number;
  trades: number;
  winRate: number;
}

export function useAggregatedChartData(
  trades: Trade[],
  level: AggregationLevel = 'daily',
  maxPoints = 500
) {
  return useMemo(() => {
    if (!trades?.length) return [];

    // Сортируем по времени
    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Группируем по временному интервалу
    const groups = new Map<string, Trade[]>();

    for (const trade of sorted) {
      const date = new Date(trade.timestamp);
      let key: string;

      switch (level) {
        case 'hourly':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(trade);
    }

    // Агрегируем каждую группу
    let cumulative = 0;
    const aggregated = Array.from(groups.entries())
      .map(([key, groupTrades]) => {
        const pnl = groupTrades.reduce((s, t) => s + (t.pnl_realized || 0), 0);
        const volume = groupTrades.reduce((s, t) => s + (t.value_usd || 0), 0);
        const winners = groupTrades.filter((t) => (t.pnl_realized || 0) > 0).length;
        cumulative += pnl;

        return {
          timestamp: new Date(groupTrades[0].timestamp).getTime(),
          date: key,
          pnl: +pnl.toFixed(2),
          cumulativePnl: +cumulative.toFixed(2),
          volume: +volume.toFixed(2),
          trades: groupTrades.length,
          winRate: +((winners / groupTrades.length) * 100).toFixed(1),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // ✅ Если точек слишком много, агрегируем сильнее
    if (aggregated.length > maxPoints) {
      const step = Math.ceil(aggregated.length / maxPoints);
      return aggregated.filter((_, i) => i % step === 0);
    }

    return aggregated;
  }, [trades, level, maxPoints]);
}
