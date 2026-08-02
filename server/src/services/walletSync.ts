import { prisma } from '../db.js';
import type { Prisma } from '@prisma/client';
import { decrypt } from './crypto.js';
import { getBybitBalance, importTradesFromExchange, saveTrades } from './tradeImport.js';

interface SyncSettings {
  autoSync?: boolean;
  syncInterval?: number;
  initialBalance?: number;
  currentBalance?: number;
  balanceUpdatedAt?: string;
  [key: string]: unknown;
}

interface SchedulableWallet {
  id: string;
  settings: string | null;
  last_synced_at: Date | null;
  processing_status: string;
  user?: {
    subscription_tier: string;
    subscription_expires_at: Date | null;
  };
}

interface WalletSyncSchedulerDependencies {
  findWallets?: () => Promise<SchedulableWallet[]>;
  sync?: (walletId: string) => Promise<number>;
}

export interface WalletSyncState {
  enabled: boolean;
  interval_minutes: number;
  next_sync_at: string | null;
  is_due: boolean;
}

export const DEFAULT_SYNC_INTERVAL_MINUTES = 60;
const MIN_SYNC_INTERVAL_MINUTES = 5;
const activeWalletSyncs = new Set<string>();

interface WalletSyncRequestDependencies {
  updateMany?: (args: Prisma.WalletUpdateManyArgs) => Promise<{ count: number }>;
  sync?: (walletId: string) => Promise<number>;
  onBackgroundError?: (error: unknown) => void;
}

export interface WalletSyncRequestResult {
  started: boolean;
  processing_status: 'processing';
}

function readSettings(value: string | null): SyncSettings {
  try {
    return value ? (JSON.parse(value) as SyncSettings) : {};
  } catch {
    return {};
  }
}

export function getWalletSyncState(
  settingsValue: string | null,
  lastSyncedAt: Date | null,
  now = Date.now(),
  minimumIntervalMinutes = MIN_SYNC_INTERVAL_MINUTES
): WalletSyncState {
  const settings = readSettings(settingsValue);
  const enabled = settings.autoSync !== false;
  const requestedInterval = Number(settings.syncInterval || DEFAULT_SYNC_INTERVAL_MINUTES);
  const intervalMinutes = Number.isFinite(requestedInterval)
    ? Math.max(MIN_SYNC_INTERVAL_MINUTES, minimumIntervalMinutes, requestedInterval)
    : DEFAULT_SYNC_INTERVAL_MINUTES;
  const nextSyncAt = lastSyncedAt
    ? new Date(lastSyncedAt.getTime() + intervalMinutes * 60_000)
    : null;

  return {
    enabled,
    interval_minutes: intervalMinutes,
    next_sync_at: nextSyncAt?.toISOString() || null,
    is_due: enabled && (!nextSyncAt || nextSyncAt.getTime() <= now),
  };
}

export async function syncWallet(walletId: string): Promise<number> {
  // `processing` lives in PostgreSQL, while the actual job lives in this process.
  // After an API restart the database may retain a stale processing flag. The
  // in-memory lease lets a new process safely resume it instead of leaving the
  // source stuck forever.
  if (activeWalletSyncs.has(walletId)) return 0;
  activeWalletSyncs.add(walletId);

  try {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Источник не найден');
    await prisma.wallet.update({
      where: { id: walletId },
      data: { processing_status: 'processing', error_message: null },
    });
    if (!wallet.cex_provider)
      throw new Error('Автоимпорт для этого типа источника ещё не подключён');
    if (!wallet.encrypted_credentials || !wallet.credentials_iv || !wallet.credentials_tag) {
      throw new Error('У источника отсутствуют API-ключи');
    }

    const credentials = JSON.parse(
      decrypt({
        encrypted: wallet.encrypted_credentials,
        iv: wallet.credentials_iv,
        tag: wallet.credentials_tag,
      })
    ) as { apiKey?: string; apiSecret?: string; passphrase?: string };

    if (!credentials.apiKey || !credentials.apiSecret) {
      throw new Error('Не удалось прочитать API-ключи источника');
    }

    const [trades, currentBalance] = await Promise.all([
      importTradesFromExchange(
        wallet.cex_provider,
        credentials.apiKey,
        credentials.apiSecret,
        credentials.passphrase,
        wallet.import_from_date || undefined
      ),
      wallet.cex_provider.toLowerCase() === 'bybit'
        ? getBybitBalance(credentials.apiKey, credentials.apiSecret)
        : Promise.resolve(0),
    ]);
    const saved = await saveTrades(wallet.user_id, wallet.id, trades);
    const settings = readSettings(wallet.settings);
    const completedAt = new Date();
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        processing_status: 'completed',
        last_synced_at: completedAt,
        error_message: null,
        settings: JSON.stringify({
          ...settings,
          currentBalance,
          balanceUpdatedAt: completedAt.toISOString(),
          lastSync: {
            completedAt: completedAt.toISOString(),
            importedTrades: saved,
          },
        }),
      },
    });
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await prisma.wallet.update({
      where: { id: walletId },
      data: { processing_status: 'failed', error_message: message },
    });
    throw error;
  } finally {
    activeWalletSyncs.delete(walletId);
  }
}

export async function requestWalletSync(
  walletId: string,
  userId: string,
  dependencies: WalletSyncRequestDependencies = {}
): Promise<WalletSyncRequestResult> {
  const updateMany =
    dependencies.updateMany ??
    ((args: Prisma.WalletUpdateManyArgs) => prisma.wallet.updateMany(args));
  const claim = await updateMany({
    where: {
      id: walletId,
      user_id: userId,
      processing_status: { not: 'processing' },
    },
    data: {
      processing_status: 'processing',
      error_message: null,
    },
  });

  if (claim.count === 0) {
    return { started: false, processing_status: 'processing' };
  }

  const runSync = dependencies.sync ?? syncWallet;
  void runSync(walletId).catch(
    dependencies.onBackgroundError ??
      ((error) => {
        console.error('[Wallets SYNC] Background error:', error);
      })
  );

  return { started: true, processing_status: 'processing' };
}

export async function syncDueWallets(dependencies: WalletSyncSchedulerDependencies = {}) {
  const findWallets =
    dependencies.findWallets ??
    (() =>
      prisma.wallet.findMany({
        where: { cex_provider: { not: null } },
        select: {
          id: true,
          settings: true,
          last_synced_at: true,
          processing_status: true,
          user: {
            select: { subscription_tier: true, subscription_expires_at: true },
          },
        },
      }));
  const runSync = dependencies.sync ?? syncWallet;
  const wallets = await findWallets();
  const now = Date.now();
  const due = wallets.filter((wallet) => {
    if (activeWalletSyncs.has(wallet.id)) return false;
    const isPro =
      wallet.user?.subscription_tier === 'pro' &&
      Boolean(
        wallet.user.subscription_expires_at && wallet.user.subscription_expires_at.getTime() > now
      );
    const minimumInterval = wallet.user ? (isPro ? 60 : 1_440) : MIN_SYNC_INTERVAL_MINUTES;
    const schedule = getWalletSyncState(
      wallet.settings,
      wallet.last_synced_at,
      now,
      minimumInterval
    );
    if (!schedule.enabled) return false;
    // A processing row without an in-memory lease belongs to an interrupted
    // process and should be resumed on the next scheduler tick.
    if (wallet.processing_status === 'processing') return true;
    return schedule.is_due;
  });

  // Limit concurrent exchange requests; the next scheduler tick handles the remaining sources.
  const selected = due.slice(0, 3);
  await Promise.allSettled(selected.map((wallet) => runSync(wallet.id)));
  return { due: due.length, started: selected.length };
}
