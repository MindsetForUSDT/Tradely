import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const raw = localStorage.getItem('tradeumdiary-auth');
    const userId = raw
      ? JSON.parse(raw)?.user?.id ||
        JSON.parse(atob(JSON.parse(raw).access_token.split('.')[1])).sub
      : null;
    if (!userId) {
      setWallets([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    setWallets(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { wallets, isLoading, error: null, refresh: load };
}
