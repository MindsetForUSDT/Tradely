import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Trade } from '@/types';

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

const cache = new Map<string, { ts: number; data: unknown }>();
const TTL = 60_000;

function getCached<T>(key: string): T | null {
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data as T;
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { ts: Date.now(), data });
  if (cache.size > 20) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
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

  const totalVolume = useMemo(() => {
    const key = 'tv_' + trades.length;
    const c = getCached<number>(key);
    if (c !== null) return c;
    const v = trades.reduce((s, t) => s + t.value_usd, 0);
    setCache(key, v);
    return v;
  }, [trades]);

  const pnlData = useMemo(() => {
    const key = 'pnl_' + trades.length;
    const c = getCached(key);
    if (c) return c as { date: string; pnl: number; cumulativePnl: number }[];

    let cum = 0;
    const data = [...trades]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((t) => {
        const pnl = t.is_buy ? t.amount_out - t.amount_in : t.amount_in - t.amount_out;
        cum += pnl;
        return { date: new Date(t.timestamp).toISOString().split('T')[0], pnl, cumulativePnl: cum };
      });
    setCache(key, data);
    return data;
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    const key = 'tok_' + trades.length;
    const c = getCached(key);
    if (c) return c as { token: string; volume: number; percentage: number }[];

    const map = new Map<string, number>();
    for (const t of trades) {
      const tok = t.is_buy ? t.token_in : t.token_out;
      map.set(tok, (map.get(tok) || 0) + t.value_usd);
    }
    const data = Array.from(map.entries())
      .map(([token, volume]) => ({
        token,
        volume,
        percentage: totalVolume ? (volume / totalVolume) * 100 : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
    setCache(key, data);
    return data;
  }, [trades, totalVolume]);

  const weekdayPerformance = useMemo(() => {
    const key = 'wd_' + trades.length;
    const c = getCached(key);
    if (c) return c as { day: string; profit: number; trades: number }[];

    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const buckets = days.map((day) => ({ day, profit: 0, trades: 0 }));
    for (const t of trades) {
      const idx = new Date(t.timestamp).getDay();
      buckets[idx].profit += t.is_buy ? t.amount_out - t.amount_in : t.amount_in - t.amount_out;
      buckets[idx].trades += 1;
    }
    setCache(key, buckets);
    return buckets;
  }, [trades]);

  return {
    trades,
    isLoading,
    pnlData,
    tokenVolumes,
    weekdayPerformance,
    totalVolume,
    totalTrades: trades.length,
  };
}
