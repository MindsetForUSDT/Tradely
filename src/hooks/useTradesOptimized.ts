import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Trade } from '@/types';

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

export function useTradesOptimized(options?: UseTradesOptions) {
  const { limit = 50, daysAgo = 30 } = options || {};

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', { limit, daysAgo }],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [] as Trade[];

      const since = new Date();
      since.setDate(since.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .gte('timestamp', since.toISOString())
        .limit(limit);

      if (error) throw error;
      return (data || []) as Trade[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const pnlData = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let cum = 0;
    const result: { date: string; pnl: number; cumulativePnl: number }[] = [];
    for (const t of sorted) {
      const pnl =
        ((t as Record<string, unknown>).pnl_realized as number) ||
        (t.side === 'buy' ? -t.value_usd : t.value_usd);
      cum += pnl;
      result.push({
        date: new Date(t.timestamp).toISOString().split('T')[0],
        pnl,
        cumulativePnl: cum,
      });
    }
    return result;
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const base = t.symbol.split('/')[0];
      map.set(base, (map.get(base) || 0) + t.value_usd);
    }
    const total = trades.reduce((s, t) => s + t.value_usd, 0);
    return Array.from(map.entries())
      .map(([token, volume]) => ({ token, volume, percentage: total ? (volume / total) * 100 : 0 }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [trades]);

  const weekdayPerformance = useMemo(() => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const buckets = days.map((day) => ({ day, profit: 0, trades: 0 }));
    for (const t of trades) {
      const idx = new Date(t.timestamp).getDay();
      buckets[idx].profit +=
        ((t as Record<string, unknown>).pnl_realized as number) ||
        (t.side === 'buy' ? -t.value_usd : t.value_usd);
      buckets[idx].trades += 1;
    }
    return buckets;
  }, [trades]);

  return {
    trades,
    isLoading,
    pnlData,
    tokenVolumes,
    weekdayPerformance,
    totalVolume: trades.reduce((s, t) => s + t.value_usd, 0),
    totalTrades: trades.length,
  };
}
