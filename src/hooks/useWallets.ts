import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';

export function useWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const uid = getUserId();
    if (!uid) {
      setWallets([]);
      setIsLoading(false);
      return;
    }
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', uid)
      .order('added_at', { ascending: false });
    setWallets(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { wallets, isLoading, error: null, refresh: load };
}
