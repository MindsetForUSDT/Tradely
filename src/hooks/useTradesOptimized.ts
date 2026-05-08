import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { safeAdd } from '@/lib/decimal';

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

export function useTradesOptimized(options?: UseTradesOptions) {
  const { limit = 50, daysAgo = 30 } = options || {};

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', { limit, daysAgo }],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', '77629667-dd24-487b-90ac-a2dbea8b994a')
        .order('timestamp', { ascending: false })
        .gte('timestamp', since.toISOString())
        .limit(limit);

      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const pnlData = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime()
    );
    let cum = 0;
    const result: { date: string; pnl: number; cumulativePnl: number }[] = [];
    for (const t of sorted) {
      const pnl = (t.pnl_realized as number) || 0;
      cum = safeAdd(cum, pnl);
      result.push({
        date: new Date(t.timestamp as string).toISOString().split('T')[0],
        pnl,
        cumulativePnl: cum,
      });
    }
    return result;
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const symbol = (t.symbol as string) || 'UNKNOWN';
      const base = symbol.split('/')[0];
      map.set(base, (map.get(base) || 0) + ((t.value_usd as number) || 0));
    }
    const total = trades.reduce((s, t) => s + ((t.value_usd as number) || 0), 0);
    const result: { token: string; volume: number; percentage: number }[] = [];
    map.forEach((volume, token) => {
      result.push({ token, volume, percentage: total ? (volume / total) * 100 : 0 });
    });
    return result.sort((a, b) => b.volume - a.volume).slice(0, 8);
  }, [trades]);

  const weekdayPerformance = useMemo(() => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const buckets = days.map((day) => ({ day, profit: 0, trades: 0 }));
    for (const t of trades) {
      const idx = new Date(t.timestamp as string).getDay();
      buckets[idx].profit = safeAdd(buckets[idx].profit, (t.pnl_realized as number) || 0);
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
    totalVolume: trades.reduce((s, t) => safeAdd(s, (t.value_usd as number) || 0), 0),
    totalTrades: trades.length,
  };
}
