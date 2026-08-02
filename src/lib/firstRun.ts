import type { WalletDataQuality } from '@/lib/dataQuality';

export type FirstRunStage = 'connect' | 'syncing' | 'failed' | 'review' | 'empty' | 'ready';

export interface FirstRunSource {
  id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  data_quality?: WalletDataQuality;
}

export interface FirstRunState {
  stage: FirstRunStage;
  activeStep: number;
  title: string;
  detail: string;
  action: 'connect' | 'wait' | 'sync' | 'review' | 'report';
  sourceId?: string;
}

export function getFirstRunState(sources: FirstRunSource[]): FirstRunState {
  if (!sources.length) {
    return {
      stage: 'connect',
      activeStep: 0,
      title: 'Подключите первый источник',
      detail: 'Нужен read-only ключ Bybit без прав торговли и вывода средств.',
      action: 'connect',
    };
  }

  const failed = sources.find((source) => source.processing_status === 'failed');
  if (failed) {
    return {
      stage: 'failed',
      activeStep: 1,
      title: 'Импорт остановлен',
      detail: failed.error_message || 'Последний запрос к Bybit завершился с ошибкой.',
      action: 'sync',
      sourceId: failed.id,
    };
  }

  const syncing = sources.find((source) =>
    ['pending', 'processing'].includes(source.processing_status)
  );
  if (syncing) {
    return {
      stage: 'syncing',
      activeStep: 1,
      title: 'Первый импорт выполняется',
      detail: 'Tradeum получает историю и собирает исполнения в финальные сделки.',
      action: 'wait',
      sourceId: syncing.id,
    };
  }

  const review = sources.find((source) => source.data_quality?.status === 'needs_review');
  if (review) {
    return {
      stage: 'review',
      activeStep: 2,
      title: 'Проверьте неполные сделки',
      detail: `${review.data_quality?.incomplete_trades || 0} записей нельзя считать подтверждёнными без проверки.`,
      action: 'review',
      sourceId: review.id,
    };
  }

  const ready = sources.find(
    (source) =>
      source.data_quality?.status === 'verified' && (source.data_quality?.final_trades || 0) > 0
  );
  if (ready) {
    return {
      stage: 'ready',
      activeStep: 3,
      title: 'Первый отчёт готов',
      detail: `${ready.data_quality?.final_trades || 0} финальных сделок прошли проверку качества.`,
      action: 'report',
      sourceId: ready.id,
    };
  }

  const completed = sources.find((source) => source.processing_status === 'completed');
  return {
    stage: 'empty',
    activeStep: 2,
    title: 'Закрытые сделки не найдены',
    detail: 'Проверьте дату начала импорта и наличие завершённых сделок в Bybit.',
    action: 'sync',
    sourceId: completed?.id || sources[0]?.id,
  };
}
