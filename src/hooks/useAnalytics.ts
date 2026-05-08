import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function getUserId(): string | null {
  const raw = localStorage.getItem('tradeumdiary-auth');
  if (!raw) return null;
  const p = JSON.parse(raw);
  return (
    p?.user?.id || (p?.access_token ? JSON.parse(atob(p.access_token.split('.')[1])).sub : null)
  );
}

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
