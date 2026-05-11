// hooks/useWallets.ts — РЕАЛЬНАЯ СИНХРОНИЗАЦИЯ
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserIdFromCache } from '@/lib/auth';

interface SyncStatus {
  walletId: string;
  progress: number;
  status: 'idle' | 'queued' | 'processing' | 'syncing' | 'completed' | 'failed';
  error?: string;
  tradesFound?: number;
}

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  chain_id: number;
  label?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at?: string;
  last_processed_block?: number;
  error_message?: string;
  added_at: string;
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [error, setError] = useState<string | null>(null);

  // Загрузка кошельков
  const loadWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const uid = getUserIdFromCache();
      if (!uid) {
        setWallets([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', uid)
        .order('added_at', { ascending: false });

      if (fetchError) throw fetchError;

      const walletData = data || [];
      setWallets(walletData);

      // Восстанавливаем статусы синхронизации
      const statusMap: Record<string, SyncStatus> = {};
      walletData.forEach((w) => {
        statusMap[w.id] = {
          walletId: w.id,
          progress: w.processing_status === 'completed' ? 100 : 0,
          status: mapDbStatus(w.processing_status),
          error: w.error_message,
        };
      });
      setSyncStatuses(statusMap);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки кошельков');
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Подписка на изменения в реальном времени
  useEffect(() => {
    loadWallets();

    const uid = getUserIdFromCache();
    if (!uid) return;

    const channel = supabase
      .channel('wallets-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const updated = payload.new as Wallet;
          setWallets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
          setSyncStatuses((prev) => ({
            ...prev,
            [updated.id]: {
              walletId: updated.id,
              progress:
                updated.processing_status === 'completed' ? 100 : prev[updated.id]?.progress || 0,
              status: mapDbStatus(updated.processing_status),
              error: updated.error_message,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadWallets]);

  // Запуск реальной синхронизации
  const startSync = useCallback(
    async (walletId: string) => {
      setSyncStatuses((prev) => ({
        ...prev,
        [walletId]: { walletId, progress: 0, status: 'queued' },
      }));

      try {
        // Обновляем статус на pending
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ processing_status: 'pending' })
          .eq('id', walletId);

        if (updateError) throw updateError;

        // Вызываем Edge Function
        const { data, error: fnError } = await supabase.functions.invoke('fetch-trade-history', {
          body: { walletId, priority: 'high' },
        });

        if (fnError) {
          const msg = fnError.message || String(fnError);
          if (msg.includes('Failed to fetch') || msg.includes('Edge Function')) {
            throw new Error('Сервер синхронизации временно недоступен. Попробуйте позже.');
          }
          throw fnError;
        }

        setSyncStatuses((prev) => ({
          ...prev,
          [walletId]: {
            walletId,
            progress: 100,
            status: 'completed',
            tradesFound: data?.imported || 0,
          },
        }));
      } catch (e: any) {
        setSyncStatuses((prev) => ({
          ...prev,
          [walletId]: {
            walletId,
            progress: 0,
            status: 'failed',
            error: e.message || 'Sync failed',
          },
        }));

        await supabase
          .from('wallets')
          .update({
            processing_status: 'failed',
            error_message: e.message,
          })
          .eq('id', walletId);
      }

      await loadWallets();
    },
    [loadWallets]
  );

  // Массовая синхронизация
  const syncAll = useCallback(async () => {
    const pending = wallets.filter(
      (w) => w.processing_status === 'pending' || w.processing_status === 'failed'
    );
    for (const wallet of pending) {
      await startSync(wallet.id);
    }
  }, [wallets, startSync]);

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
    syncAll,
  };
}

// Хелпер маппинга статусов
function mapDbStatus(dbStatus: string): SyncStatus['status'] {
  switch (dbStatus) {
    case 'pending':
      return 'queued';
    case 'processing':
      return 'syncing';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'idle';
  }
}
