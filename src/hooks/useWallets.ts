import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

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
  label?: string;
  settings?: string | Record<string, unknown>;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at?: string;
  last_processed_block?: number;
  error_message?: string;
  added_at: string;
  _count?: { trades: number };
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});

  const loadWallets = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!silent) setError(null);
    try {
      const data = await api.get<Wallet[]>('/wallets');
      setWallets(data);

      const statusMap: Record<string, SyncStatus> = {};
      data.forEach((w) => {
        statusMap[w.id] = {
          walletId: w.id,
          progress: w.processing_status === 'completed' ? 100 : 0,
          status: mapDbStatus(w.processing_status),
          error: w.error_message,
        };
      });
      setSyncStatuses(statusMap);
    } catch (e: unknown) {
      console.error('[useWallets] Error:', e);
      const message = e instanceof Error ? e.message : 'Ошибка загрузки кошельков';
      // Игнорируем ошибку "Profile not found" - просто нет кошельков
      if (message.includes('Profile not found')) {
        setWallets([]);
        setError(null);
      } else if (message.includes('401') || message.includes('403')) {
        // Неавторизован - не показываем ошибку
        setWallets([]);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (!wallets.some((wallet) => ['pending', 'processing'].includes(wallet.processing_status))) {
      return;
    }
    const timer = window.setInterval(() => void loadWallets(true), 2500);
    return () => window.clearInterval(timer);
  }, [loadWallets, wallets]);

  const startSync = useCallback(
    async (walletId: string) => {
      setSyncStatuses((prev) => ({
        ...prev,
        [walletId]: { walletId, progress: 0, status: 'queued' },
      }));

      try {
        await api.post(`/wallets/${walletId}/sync`, {});
        setSyncStatuses((prev) => ({
          ...prev,
          [walletId]: { walletId, progress: 45, status: 'syncing' },
        }));
        await loadWallets();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Ошибка синхронизации';
        setSyncStatuses((prev) => ({
          ...prev,
          [walletId]: { walletId, progress: 0, status: 'failed', error: message },
        }));
      }
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
