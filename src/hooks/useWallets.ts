import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  label: string | null;
  processing_status: string;
  error_message: string | null;
  added_at: string;
}

export function useWallets() {
  const {
    data: wallets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as Wallet[];
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  return { wallets, isLoading, error: error ? (error as Error).message : null, refresh: refetch };
}
