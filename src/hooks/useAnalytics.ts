import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(days);

      if (error) throw error;
      return data as DailyAnalytics[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { analytics, todayAnalytics: analytics[0] || null, isLoading };
}
