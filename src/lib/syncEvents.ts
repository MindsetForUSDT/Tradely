export const SYNC_COMPLETED_EVENT = 'tradeum:sync-completed';
export const ACTIVE_SYNC_POLL_MS = 2_500;
export const IDLE_SYNC_POLL_MS = 30_000;

export interface ComparableWalletSync {
  id: string;
  processing_status: string;
  last_synced_at?: string;
}

export function getWalletPollInterval(wallets: ComparableWalletSync[]) {
  return wallets.some((wallet) => ['pending', 'processing'].includes(wallet.processing_status))
    ? ACTIVE_SYNC_POLL_MS
    : IDLE_SYNC_POLL_MS;
}

export function findCompletedWalletSyncs(
  previous: ComparableWalletSync[] | null,
  current: ComparableWalletSync[]
) {
  if (!previous) return [];
  const previousById = new Map(previous.map((wallet) => [wallet.id, wallet]));

  return current
    .filter((wallet) => {
      const before = previousById.get(wallet.id);
      if (!before || !wallet.last_synced_at) return false;
      return (
        before.last_synced_at !== wallet.last_synced_at && wallet.processing_status === 'completed'
      );
    })
    .map((wallet) => wallet.id);
}

export function dispatchCompletedWalletSyncs(walletIds: string[]) {
  if (!walletIds.length || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SYNC_COMPLETED_EVENT, {
      detail: { walletIds },
    })
  );
}
