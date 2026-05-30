import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

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
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});

  const loadWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
    } catch (e: any) {
      console.error('[useWallets] Error:', e);
      // Игнорируем ошибку "Profile not found" - просто нет кошельков
      if (e.message?.includes('Profile not found')) {
        setWallets([]);
        setError(null);
      } else if (e.message?.includes('401') || e.message?.includes('403')) {
        // Неавторизован - не показываем ошибку
        setWallets([]);
        setError(null);
      } else {
        setError(e.message || 'Ошибка загрузки кошельков');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загружаем только при монтировании
  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const startSync = useCallback(async (walletId: string) => {
    setSyncStatuses((prev) => ({
      ...prev,
      [walletId]: { walletId, progress: 0, status: 'queued' },
    }));

    try {
      await api.post(`/wallets/${walletId}/sync`, {});
      setSyncStatuses((prev) => ({
        ...prev,
        [walletId]: { walletId, progress: 100, status: 'completed' },
      }));
    } catch (e: any) {
      setSyncStatuses((prev) => ({
        ...prev,
        [walletId]: { walletId, progress: 0, status: 'failed', error: e.message },
      }));
    }
  }, []);

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
