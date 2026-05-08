import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';

export function useAnalytics(days = 30) {
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const uid = getUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(days);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { analytics, todayAnalytics: analytics[0] || null, isLoading };
}
