import { useState, useEffect } from 'react';
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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .order('added_at', { ascending: false });

        if (mounted) {
          setWallets(data || []);
          setIsLoading(false);
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    }

    fetch();
    return () => {
      mounted = false;
    };
  }, []);

  return { wallets, isLoading, error: null, refresh: () => {} };
}
