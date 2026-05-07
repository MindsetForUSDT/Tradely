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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setWallets([]);
        setError('Не авторизован');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWallets(data || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  return { wallets, isLoading, error, refresh: fetchWallets };
}
