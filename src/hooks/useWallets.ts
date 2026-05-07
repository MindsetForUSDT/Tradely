import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setWallets([]);
        return;
      }
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });
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
    load();
  }, []);

  return { wallets, isLoading, error, refresh: load };
}
