import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useWallet() {
  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', '77629667-dd24-487b-90ac-a2dbea8b994a');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    wallets,
    isLoading,
    hasWallet: wallets.length > 0,
    activeWallet: wallets.find((w: any) => w.processing_status === 'completed') || wallets[0],
  };
}
