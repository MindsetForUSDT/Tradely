export type DataQualityStatus = 'verified' | 'needs_review' | 'empty' | 'syncing' | 'failed';

export interface DataQualityCheck {
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
  checks: DataQualityCheck[];
}

const presentations: Record<
  DataQualityStatus,
  { label: string; headline: string; tone: string; action: string }
> = {
  verified: {
    label: 'Проверено',
    headline: 'Данные готовы к аналитике',
    tone: 'verified',
    action: 'Открыть сделки',
  },
  needs_review: {
    label: 'Требует проверки',
    headline: 'Часть данных неполная',
    tone: 'warning',
    action: 'Проверить сделки',
  },
  empty: {
    label: 'Нет закрытых сделок',
    headline: 'Импорт завершён без сделок',
    tone: 'empty',
    action: 'Открыть журнал',
  },
  syncing: {
    label: 'Проверяем данные',
    headline: 'Импорт ещё выполняется',
    tone: 'processing',
    action: 'Открыть журнал',
  },
  failed: {
    label: 'Импорт прерван',
    headline: 'Источник требует внимания',
    tone: 'failed',
    action: 'Проверить журнал',
  },
};

export function getDataQualityPresentation(status: DataQualityStatus) {
  return presentations[status];
}

export function formatDataMoment(value: string | null | undefined) {
  if (!value) return 'Нет данных';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Нет данных';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
