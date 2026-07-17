import { prisma } from '../db.js';
import { decrypt } from './crypto.js';
import { importTradesFromExchange, saveTrades } from './tradeImport.js';

interface SyncSettings {
  autoSync?: boolean;
  syncInterval?: number;
}

function readSettings(value: string | null): SyncSettings {
  try {
    return value ? (JSON.parse(value) as SyncSettings) : {};
  } catch {
    return {};
  }
}

export async function syncWallet(walletId: string): Promise<number> {
  const claimed = await prisma.wallet.updateMany({
    where: { id: walletId, processing_status: { not: 'processing' } },
    data: { processing_status: 'processing', error_message: null },
  });
  if (!claimed.count) return 0;

  try {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Источник не найден');
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

    const trades = await importTradesFromExchange(
      wallet.cex_provider,
      credentials.apiKey,
      credentials.apiSecret,
      credentials.passphrase,
      wallet.import_from_date || undefined
    );
    const saved = await saveTrades(wallet.user_id, wallet.id, trades);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { processing_status: 'completed', last_synced_at: new Date(), error_message: null },
    });
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await prisma.wallet.update({
      where: { id: walletId },
      data: { processing_status: 'failed', error_message: message },
    });
    throw error;
  }
}

export async function syncDueWallets() {
  const wallets = await prisma.wallet.findMany({
    where: { cex_provider: { not: null }, processing_status: { not: 'processing' } },
  });
  const now = Date.now();
  const due = wallets.filter((wallet) => {
    const settings = readSettings(wallet.settings);
    if (settings.autoSync === false) return false;
    const intervalMinutes = Math.max(5, Number(settings.syncInterval || 60));
    return (
      !wallet.last_synced_at || now - wallet.last_synced_at.getTime() >= intervalMinutes * 60_000
    );
  });

  // Limit concurrent exchange requests; the next scheduler tick handles the remaining sources.
  await Promise.allSettled(due.slice(0, 3).map((wallet) => syncWallet(wallet.id)));
}
