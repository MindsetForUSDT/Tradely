import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import {
  dispatchCompletedWalletSyncs,
  findCompletedWalletSyncs,
  getWalletPollInterval,
} from '@/lib/syncEvents';

interface SyncStatus {
  walletId: string;
  progress: number;
  status: 'idle' | 'queued' | 'processing' | 'syncing' | 'completed' | 'failed';
  error?: string;
  tradesFound?: number;
}

export interface WalletSyncState {
  enabled: boolean;
  interval_minutes: number;
  next_sync_at: string | null;
  is_due: boolean;
}

export interface Wallet {
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
  sync_state?: WalletSyncState;
  _count?: { trades: number };
}

let activeWalletRequest: Promise<Wallet[]> | null = null;

function fetchWallets() {
  if (!activeWalletRequest) {
    activeWalletRequest = api.get<Wallet[]>('/wallets').finally(() => {
      activeWalletRequest = null;
    });
  }
  return activeWalletRequest;
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const previousWalletsRef = useRef<Wallet[] | null>(null);

  const loadWallets = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!silent) setError(null);
    try {
      const data = await fetchWallets();
      const completedWalletIds = findCompletedWalletSyncs(previousWalletsRef.current, data);
      previousWalletsRef.current = data;
      setWallets(data);
      setError(null);
      dispatchCompletedWalletSyncs(completedWalletIds);

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
    const timer = window.setInterval(() => void loadWallets(true), getWalletPollInterval(wallets));
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

  const refresh = useCallback(async () => {
    await loadWallets();
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
