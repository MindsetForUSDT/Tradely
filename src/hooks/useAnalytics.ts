import { useState, useEffect, useCallback } from 'react';
import { getUserId, getToken } from '@/lib/supabase';

interface DailyAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_volume_usd: number;
  total_trades: number;
  realized_pnl_usd: number;
  win_rate: number;
  best_trade_usd: number;
  worst_trade_usd: number;
}

export function useAnalytics(days = 30) {
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token) { setIsLoading(false); return; }

    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/daily_analytics?user_id=eq.${userId}&order=date.desc&limit=${days}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setAnalytics(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Analytics fetch error:', e);
    }
    setIsLoading(false);
  }, [days]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return {
    analytics,
    todayAnalytics: analytics[0] || null,
    isLoading,
    refresh: fetchAnalytics,
  };
}