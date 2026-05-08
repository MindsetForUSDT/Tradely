import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

export function useTradesOptimized(options?: UseTradesOptions) {
  const { limit = 50, daysAgo = 30 } = options || {};

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', { limit, daysAgo }],
    queryFn: async () => {
      const uid = getUserId();
      if (!uid) return [];
      const since = new Date();
      since.setDate(since.getDate() - daysAgo);
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', uid)
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
    return sorted.map((t) => {
      const pnl = (t.pnl_realized as number) || 0;
      cum += pnl;
      return {
        date: new Date(t.timestamp as string).toISOString().split('T')[0],
        pnl,
        cumulativePnl: cum,
      };
    });
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const s = (t.symbol as string) || '?';
      const base = s.split('/')[0];
      map.set(base, (map.get(base) || 0) + ((t.value_usd as number) || 0));
    }
    const total = trades.reduce((s, t) => s + ((t.value_usd as number) || 0), 0);
    const r: { token: string; volume: number; percentage: number }[] = [];
    map.forEach((vol, tok) =>
      r.push({ token: tok, volume: vol, percentage: total ? (vol / total) * 100 : 0 })
    );
    return r.sort((a, b) => b.volume - a.volume).slice(0, 8);
  }, [trades]);

  const weekdayPerformance = useMemo(() => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const buckets = days.map((d) => ({ day: d, profit: 0, trades: 0 }));
    for (const t of trades) {
      const i = new Date(t.timestamp as string).getDay();
      buckets[i].profit += (t.pnl_realized as number) || 0;
      buckets[i].trades++;
    }
    return buckets;
  }, [trades]);

  return {
    trades,
    isLoading,
    pnlData,
    tokenVolumes,
    weekdayPerformance,
    totalVolume: trades.reduce((s, t) => s + ((t.value_usd as number) || 0), 0),
    totalTrades: trades.length,
  };
}
