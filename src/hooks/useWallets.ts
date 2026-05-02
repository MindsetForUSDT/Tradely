import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useWallets() {
  const {
    data: wallets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', '77629667-dd24-487b-90ac-a2dbea8b994a')
        .order('added_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  return { wallets, isLoading, error: null, refresh: refetch };
}
