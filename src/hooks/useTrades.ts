import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Trade {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_hash: string;
  timestamp: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  value_usd: number;
  is_buy: boolean;
  created_at: string;
}

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

export function useTrades(options?: UseTradesOptions) {
  const { limit = 50, daysAgo = 30 } = options || {};

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', { limit, daysAgo }],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

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
      return data as Trade[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Все вычисления остаются как раньше
  const pnlData = useMemo(() => {
    let cumulative = 0;
    return [...trades]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((t) => {
        const pnl = t.is_buy ? -t.value_usd : t.value_usd;
        cumulative += pnl;
        return {
          date: new Date(t.timestamp).toISOString().split('T')[0],
          pnl,
          cumulativePnl: cumulative,
        };
      });
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t) => {
      const token = t.is_buy ? t.token_in : t.token_out;
      map.set(token, (map.get(token) || 0) + t.value_usd);
    });
    const total = trades.reduce((s, t) => s + t.value_usd, 0);
    return Array.from(map.entries())
      .map(([token, volume]) => ({
        token,
        volume,
        percentage: total ? (volume / total) * 100 : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [trades]);

  const weekdayPerformance = useMemo(() => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days.map((day, i) => {
      const dayTrades = trades.filter((t) => new Date(t.timestamp).getDay() === i);
      return {
        day,
        profit: dayTrades.reduce((s, t) => s + (t.is_buy ? -t.value_usd : t.value_usd), 0),
        trades: dayTrades.length,
      };
    });
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