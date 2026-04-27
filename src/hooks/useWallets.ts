import { useState, useEffect, useCallback } from 'react';
import { getUserId, getToken } from '@/lib/supabase';

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  label: string | null;
  processing_status: string;
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}&order=added_at.desc`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setWallets(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      // Не обнуляем wallets — показываем старые данные
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return { wallets, isLoading, error, refresh: fetchWallets };
}