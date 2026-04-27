import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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

export function useTrades(options?: { limit?: number; daysAgo?: number }) {
  const { limit = 50, daysAgo = 30 } = options || {};
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/trades?user_id=eq.${user.id}&timestamp=gte.${since.toISOString()}&order=timestamp.desc&limit=${limit}`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    const data = await res.json();
    setTrades(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, [user, daysAgo, limit]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

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
      .map(([token, volume]) => ({ token, volume, percentage: total ? (volume / total) * 100 : 0 }))
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
    refresh: fetchTrades,
    pnlData,
    tokenVolumes,
    weekdayPerformance,
    totalVolume: trades.reduce((s, t) => s + t.value_usd, 0),
    totalTrades: trades.length,
  };
}