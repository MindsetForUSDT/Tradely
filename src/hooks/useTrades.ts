// ============================================================
// TradeumDiary — Хук сделок с кешированием и оптимизациями
// Данные кешируются на 2 минуты. При повторном монтировании
// компонента мгновенно отдаются закешированные данные
// ============================================================

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
}

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

// Ключ кеша с параметрами для инвалидации
const tradesQueryKey = (options: UseTradesOptions) => ['trades', options] as const;

export function useTrades(options?: UseTradesOptions) {
  const { limit = 50, daysAgo = 30 } = options || {};

  const { data: trades = [], isLoading, error } = useQuery({
    queryKey: tradesQueryKey({ limit, daysAgo }),
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - daysAgo);

      // ✅ Используем Supabase SDK вместо fetch()
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('timestamp', { ascending: false })
        .gte('timestamp', since.toISOString())
        .limit(limit);

      if (error) throw error;
      return data as Trade[];
    },
    staleTime: 2 * 60 * 1000,  // Данные устаревают через 2 минуты
    gcTime: 10 * 60 * 1000,     // 10 минут храним неиспользуемые данные
    refetchOnWindowFocus: true,  // Обновляем при возврате на вкладку
    retry: 2,
  });

  // Все вычисления остаются в useMemo как раньше
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
    error,
    pnlData,
    tokenVolumes,
    weekdayPerformance,
    totalVolume: trades.reduce((s, t) => s + t.value_usd, 0),
    totalTrades: trades.length,
  };
}