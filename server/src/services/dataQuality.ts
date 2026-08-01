export type DataQualityStatus = 'verified' | 'needs_review' | 'empty' | 'syncing' | 'failed';

export interface WalletQualityInput {
  processingStatus: string;
  totalTrades: number;
  finalTrades: number;
  incompleteTrades: number;
  lastTradeAt: Date | null;
  lastSyncedAt: Date | null;
  settings: string | null;
}

export interface WalletQualityCheck {
  id: 'connection' | 'final_trades' | 'completeness' | 'freshness';
  status: 'passed' | 'warning' | 'pending';
  label: string;
  detail: string;
}

export interface WalletDataQuality {
  status: DataQualityStatus;
  total_trades: number;
  final_trades: number;
  incomplete_trades: number;
  last_trade_at: string | null;
  last_sync_imported: number | null;
  checks: WalletQualityCheck[];
}

interface SyncSettings {
  lastSync?: {
    completedAt?: string;
    importedTrades?: number;
  };
}

function readLastSyncImported(settingsValue: string | null) {
  try {
    const settings = settingsValue ? (JSON.parse(settingsValue) as SyncSettings) : {};
    const value = settings.lastSync?.importedTrades;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;
  } catch {
    return null;
  }
}

function pluralizeTrades(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${value} сделок`;
  if (mod10 === 1) return `${value} сделка`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} сделки`;
  return `${value} сделок`;
}

export function buildWalletDataQuality(input: WalletQualityInput): WalletDataQuality {
  const totalTrades = Math.max(0, input.totalTrades);
  const finalTrades = Math.max(0, Math.min(input.finalTrades, totalTrades));
  const incompleteTrades = Math.max(0, Math.min(input.incompleteTrades, totalTrades));
  const isSyncing = ['pending', 'processing'].includes(input.processingStatus);
  const isFailed = input.processingStatus === 'failed';

  let status: DataQualityStatus;
  if (isFailed) status = 'failed';
  else if (isSyncing) status = 'syncing';
  else if (totalTrades === 0) status = 'empty';
  else if (finalTrades !== totalTrades || incompleteTrades > 0) status = 'needs_review';
  else status = 'verified';

  const checks: WalletQualityCheck[] = [
    {
      id: 'connection',
      status: isFailed ? 'warning' : isSyncing ? 'pending' : 'passed',
      label: 'Связь с источником',
      detail: isFailed
        ? 'Последний запрос завершился ошибкой'
        : isSyncing
          ? 'Биржа передаёт историю'
          : 'Read-only источник отвечает',
    },
    {
      id: 'final_trades',
      status: isSyncing
        ? 'pending'
        : totalTrades > 0 && finalTrades === totalTrades
          ? 'passed'
          : 'warning',
      label: 'Финальные сделки',
      detail: isSyncing
        ? 'Итог станет доступен после импорта'
        : totalTrades === 0
          ? 'Закрытые сделки пока не найдены'
          : `${pluralizeTrades(finalTrades)} из ${totalTrades} готовы к аналитике`,
    },
    {
      id: 'completeness',
      status: isSyncing
        ? 'pending'
        : incompleteTrades === 0 && totalTrades > 0
          ? 'passed'
          : 'warning',
      label: 'Полнота расчётов',
      detail: isSyncing
        ? 'Проверим цены, объём и экономику сделки'
        : incompleteTrades > 0
          ? `${pluralizeTrades(incompleteTrades)} требуют проверки полей`
          : totalTrades > 0
            ? 'Обязательные поля заполнены'
            : 'Нет данных для проверки',
    },
    {
      id: 'freshness',
      status: isSyncing ? 'pending' : input.lastSyncedAt ? 'passed' : 'warning',
      label: 'Свежесть данных',
      detail: isSyncing
        ? 'Фиксируем время после завершения'
        : input.lastSyncedAt
          ? `Последний успешный импорт: ${input.lastSyncedAt.toISOString()}`
          : 'Успешная синхронизация ещё не завершалась',
    },
  ];

  return {
    status,
    total_trades: totalTrades,
    final_trades: finalTrades,
    incomplete_trades: incompleteTrades,
    last_trade_at: input.lastTradeAt?.toISOString() || null,
    last_sync_imported: readLastSyncImported(input.settings),
    checks,
  };
}
