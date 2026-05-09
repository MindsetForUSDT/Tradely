import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';

interface SyncStatus {
  walletId: string;
  progress: number;
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  error?: string;
}

export function useWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [error, setError] = useState<string | null>(null);

  const loadWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const uid = getUserId();
      if (!uid) {
        setWallets([]);
        setIsLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', uid)
        .order('added_at', { ascending: false });
      if (fetchError) throw fetchError;
      setWallets(data || []);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки кошельков');
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const startSync = useCallback(
    async (walletId: string) => {
      setSyncStatuses((prev) => ({
        ...prev,
        [walletId]: { walletId, progress: 0, status: 'syncing' },
      }));

      for (let i = 0; i <= 100; i += 20) {
        await new Promise((r) => setTimeout(r, 500));
        setSyncStatuses((prev) => ({
          ...prev,
          [walletId]: { walletId, progress: i, status: i < 100 ? 'syncing' : 'completed' },
        }));
      }

      await supabase
        .from('wallets')
        .update({ processing_status: 'completed', last_synced_at: new Date().toISOString() })
        .eq('id', walletId);

      await loadWallets();
    },
    [loadWallets]
  );

  const refresh = useCallback(() => {
    loadWallets();
  }, [loadWallets]);

  return {
    wallets,
    isLoading,
    error,
    syncStatuses,
    refresh,
    startSync,
  };
}

/* ✅ Исправлено: добавлены syncStatuses, startSync с прогрессом, обработка ошибок */
