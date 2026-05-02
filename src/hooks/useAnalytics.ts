import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useAnalytics(days = 30) {
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('user_id', '77629667-dd24-487b-90ac-a2dbea8b994a')
        .order('date', { ascending: false })
        .limit(days);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { analytics, todayAnalytics: analytics[0] || null, isLoading };
}
