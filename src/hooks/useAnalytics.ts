import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user || user.subscription_tier !== 'pro') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/daily_analytics?user_id=eq.${user.id}&date=gte.${since.toISOString().split('T')[0]}&order=date.desc`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    const data = await res.json();
    setAnalytics(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, [user, days]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return {
    analytics,
    todayAnalytics: analytics[0] || null,
    isLoading,
    refresh: fetchAnalytics,
  };
}