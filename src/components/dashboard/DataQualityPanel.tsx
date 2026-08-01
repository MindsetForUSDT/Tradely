import {
  ArrowClockwise,
  ArrowRight,
  CheckCircle,
  Clock,
  Database,
  WarningCircle,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import {
  formatDataMoment,
  getDataQualityPresentation,
  type WalletDataQuality,
} from '@/lib/dataQuality';

interface QualitySource {
  id: string;
  label?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at?: string;
  error_message?: string;
  data_quality?: WalletDataQuality;
}

interface DataQualityPanelProps {
  sources: QualitySource[];
  syncingWalletId: string | null;
  onSync: (walletId: string) => void;
}

function CheckIcon({ status }: { status: 'passed' | 'warning' | 'pending' }) {
  if (status === 'passed') return <CheckCircle size={17} weight="fill" />;
  if (status === 'warning') return <WarningCircle size={17} weight="fill" />;
  return <Clock size={17} />;
}

export function DataQualityPanel({ sources, syncingWalletId, onSync }: DataQualityPanelProps) {
  if (!sources.length) return null;

  return (
    <section className="data-quality-panel" aria-labelledby="data-quality-title">
      <header>
        <div>
          <small>Контроль импорта</small>
          <h2 id="data-quality-title">Качество данных</h2>
          <p>Отчёт строится по фактически сохранённым финальным сделкам.</p>
        </div>
        <Database size={21} />
      </header>

      <div className="data-quality-sources">
        {sources.map((source) => {
          const quality = source.data_quality;
          const presentation = getDataQualityPresentation(
            quality?.status ||
              (source.processing_status === 'failed'
                ? 'failed'
                : source.processing_status === 'completed'
                  ? 'empty'
                  : 'syncing')
          );
          const syncing =
            ['pending', 'processing'].includes(source.processing_status) ||
            syncingWalletId === source.id;

          return (
            <article className={`data-quality-source ${presentation.tone}`} key={source.id}>
              <div className="data-quality-summary">
                <span className={`data-quality-status ${presentation.tone}`}>
                  <i /> {presentation.label}
                </span>
                <div>
                  <small>{source.label || 'Bybit'}</small>
                  <h3>{presentation.headline}</h3>
                  <p>
                    {source.error_message ||
                      (quality?.status === 'verified'
                        ? 'Все импортированные записи прошли базовую проверку полноты.'
                        : 'Tradeum не скрывает незавершённые и неполные данные из отчёта.')}
                  </p>
                </div>

                <dl>
                  <div>
                    <dt>Готово</dt>
                    <dd>{quality ? `${quality.final_trades} / ${quality.total_trades}` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Требуют проверки</dt>
                    <dd>{quality?.incomplete_trades ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Последний импорт</dt>
                    <dd>{quality?.last_sync_imported ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Последняя сделка</dt>
                    <dd>{formatDataMoment(quality?.last_trade_at)}</dd>
                  </div>
                </dl>
              </div>

              <div className="data-quality-checks" aria-label="Проверки качества">
                {quality?.checks?.length ? (
                  quality.checks.map((check) => (
                    <div className={check.status} key={check.id}>
                      <span>
                        <CheckIcon status={check.status} />
                      </span>
                      <div>
                        <strong>{check.label}</strong>
                        <small>
                          {check.id === 'freshness' && check.status === 'passed'
                            ? `Обновлено ${formatDataMoment(source.last_synced_at)}`
                            : check.detail}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pending">
                    <span>
                      <Clock size={17} />
                    </span>
                    <div>
                      <strong>Формируем отчёт</strong>
                      <small>Дождитесь ответа обновлённого API.</small>
                    </div>
                  </div>
                )}
              </div>

              <footer>
                <span>
                  Отчёт не изменяет биржевые данные и не создаёт оценок на основе догадок.
                </span>
                <div>
                  <button type="button" onClick={() => onSync(source.id)} disabled={syncing}>
                    <ArrowClockwise size={16} className={syncing ? 'spin' : ''} />
                    {syncing ? 'Обновляем' : 'Повторить проверку'}
                  </button>
                  <Link to="/dashboard/trades">
                    {presentation.action} <ArrowRight size={15} />
                  </Link>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
