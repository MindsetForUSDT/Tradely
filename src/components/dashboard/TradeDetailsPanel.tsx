import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ChartLine,
  CheckCircle,
  Clock,
  Info,
  NotePencil,
  Target,
  X,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { SourceLogo, resolveSourceBrand } from '@/components/brand/SourceLogo';
import { api } from '@/lib/api';
import {
  calculateTradeBreakdown,
  formatDuration,
  formatSignedUSD,
  numeric,
} from '@/lib/tradeAnalytics';
import { formatUSD } from '@/lib/utils';
import type { Trade } from '@/types';

interface TradeDetailsPanelProps {
  trade: Trade;
  onClose: () => void;
  onTradeUpdate?: (trade: Trade) => void;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function TradeDetailsPanel({ trade, onClose, onTradeUpdate }: TradeDetailsPanelProps) {
  const breakdown = calculateTradeBreakdown(trade);
  const { meta } = breakdown;
  const [strategy, setStrategy] = useState(String(meta.strategy || ''));
  const [mistake, setMistake] = useState(String(meta.mistake || ''));
  const [emotion, setEmotion] = useState(String(meta.emotion || ''));
  const [planScore, setPlanScore] = useState(numeric(meta.planScore, 0));
  const [stopLoss, setStopLoss] = useState(meta.stopLoss ? String(meta.stopLoss) : '');
  const [notes, setNotes] = useState(String(meta.notes || trade.notes || ''));
  const [saving, setSaving] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const saveContext = async () => {
    const context = {
      strategy: strategy.trim() || null,
      mistake: mistake || null,
      emotion: emotion || null,
      planScore,
      stopLoss: numeric(stopLoss) > 0 ? numeric(stopLoss) : null,
      notes: notes.trim() || null,
    };
    setSaving(true);
    try {
      const updatedTrade = await api.patch<Trade>(`/trades/${trade.id}`, context);
      onTradeUpdate?.(updatedTrade);
      toast.success('Контекст сделки сохранён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить контекст');
    } finally {
      setSaving(false);
    }
  };

  const quantityUnit = trade.symbol
    .replace(/USDT$|USDC$|USD$/i, '')
    .split('/')[0]
    .trim();
  const marketLabel =
    meta.marketType === 'linear'
      ? 'Linear'
      : meta.marketType === 'spot'
        ? 'Spot'
        : meta.marketType === 'manual'
          ? 'Вручную'
          : 'Сделка';
  const updatedBreakdown = calculateTradeBreakdown({
    ...trade,
    raw_data: JSON.stringify({
      ...meta,
      stopLoss: numeric(stopLoss) > 0 ? numeric(stopLoss) : undefined,
    }),
  });

  return (
    <motion.aside
      className="premium-trade-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`Детали сделки ${trade.symbol}`}
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 48 }}
      transition={{ type: 'spring', stiffness: 360, damping: 36 }}
    >
      <header className="premium-trade-head">
        <div>
          <span>Сделка</span>
          <h2>{trade.symbol}</h2>
          <div>
            <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={20} />
            <strong>{trade.exchange || 'Источник'}</strong>
            <i />
            <em className={breakdown.direction}>
              {breakdown.direction === 'long' ? 'Long' : 'Short'}
            </em>
            <em>{marketLabel}</em>
            <em>Завершена</em>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть детали сделки" autoFocus>
          <X size={20} />
        </button>
      </header>

      <section className="premium-result-panel">
        <div className="premium-net-result">
          <span>
            Чистый P&amp;L
            <button
              type="button"
              onClick={() => setFormulaOpen((value) => !value)}
              aria-label="Пояснение расчёта P&L"
            >
              <Info size={15} />
            </button>
          </span>
          <strong className={breakdown.netPnl >= 0 ? 'positive' : 'negative'}>
            {formatSignedUSD(breakdown.netPnl)}
          </strong>
          <small className={breakdown.returnPercent >= 0 ? 'positive' : 'negative'}>
            {breakdown.returnPercent >= 0 ? '+' : ''}
            {breakdown.returnPercent.toFixed(2)}% от объёма
          </small>
        </div>
        <dl className="premium-pnl-formula">
          <div>
            <dt>Валовый результат</dt>
            <dd className={breakdown.grossPnl >= 0 ? 'positive' : 'negative'}>
              {formatSignedUSD(breakdown.grossPnl)}
            </dd>
          </div>
          <div>
            <dt>Торговые комиссии</dt>
            <dd>{formatSignedUSD(-breakdown.fees)}</dd>
          </div>
          <div>
            <dt>Funding / корректировки</dt>
            <dd className={breakdown.fundingAndAdjustments >= 0 ? 'positive' : 'negative'}>
              {formatSignedUSD(breakdown.fundingAndAdjustments)}
            </dd>
          </div>
          <div className="total">
            <dt>Чистый результат</dt>
            <dd className={breakdown.netPnl >= 0 ? 'positive' : 'negative'}>
              {formatSignedUSD(breakdown.netPnl)}
            </dd>
          </div>
        </dl>
        {formulaOpen ? (
          <p className="premium-formula-note">
            <Info size={16} />
            Валовый P&amp;L — движение цены с учётом направления. Чистый P&amp;L — сумма после
            комиссий, funding и биржевых корректировок.
          </p>
        ) : null}
      </section>

      <section className="premium-trade-section premium-trade-facts">
        <header>
          <span>Детали сделки</span>
        </header>
        <dl>
          <div>
            <dt>Цена входа</dt>
            <dd>{formatUSD(breakdown.entryPrice)}</dd>
          </div>
          <div>
            <dt>Открыта</dt>
            <dd>{formatDateTime(String(meta.openedAt || trade.timestamp))}</dd>
          </div>
          <div>
            <dt>Цена выхода</dt>
            <dd>{formatUSD(breakdown.exitPrice)}</dd>
          </div>
          <div>
            <dt>Закрыта</dt>
            <dd>{formatDateTime(String(meta.closedAt || trade.timestamp))}</dd>
          </div>
          <div>
            <dt>Количество</dt>
            <dd>
              {breakdown.amount.toLocaleString('ru-RU', { maximumFractionDigits: 8 })}{' '}
              {quantityUnit}
            </dd>
          </div>
          <div>
            <dt>В позиции</dt>
            <dd>{formatDuration(breakdown.durationMinutes)}</dd>
          </div>
          <div>
            <dt>Объём</dt>
            <dd>{formatUSD(breakdown.volume)}</dd>
          </div>
          <div>
            <dt>Плечо</dt>
            <dd>{meta.leverage ? `${meta.leverage}×` : 'Нет данных'}</dd>
          </div>
        </dl>
      </section>

      <section className="premium-execution-strip">
        <div>
          <span>Вход</span>
          <strong>{formatUSD(breakdown.entryPrice)}</strong>
        </div>
        <span className={breakdown.netPnl >= 0 ? 'positive' : 'negative'}>
          <i />
          <ArrowRight size={18} />
          <i />
        </span>
        <div>
          <span>Выход</span>
          <strong>{formatUSD(breakdown.exitPrice)}</strong>
        </div>
      </section>

      <section className="premium-trade-section premium-trade-analysis">
        <header>
          <span>Качество исполнения</span>
        </header>
        <article>
          <span>
            <ChartLine size={18} />
          </span>
          <div>
            <strong>MAE / MFE</strong>
            <small>
              {meta.mae !== undefined && meta.mfe !== undefined
                ? `MAE ${formatSignedUSD(numeric(meta.mae))} · MFE ${formatSignedUSD(numeric(meta.mfe))}`
                : 'Нужны внутрисделочные котировки — Tradeum не подставляет выдуманные значения.'}
            </small>
          </div>
          <em>{meta.mae !== undefined ? 'Рассчитано' : 'Нет данных'}</em>
        </article>
        <article>
          <span>
            <Target size={18} />
          </span>
          <div>
            <strong>R-multiple</strong>
            <small>
              {updatedBreakdown.rMultiple === null
                ? 'Добавьте исходный стоп, чтобы сравнивать результат с принятым риском.'
                : `${updatedBreakdown.rMultiple.toFixed(2)}R по чистому результату.`}
            </small>
          </div>
          <em>
            {updatedBreakdown.rMultiple === null
              ? 'Нет стопа'
              : `${updatedBreakdown.rMultiple.toFixed(2)}R`}
          </em>
        </article>
      </section>

      <section className="premium-trade-section premium-context-editor">
        <header>
          <span>Контекст решения</span>
          <NotePencil size={18} />
        </header>
        <div className="premium-context-grid">
          <label>
            Сетап
            <input
              value={strategy}
              onChange={(event) => setStrategy(event.target.value)}
              placeholder="Например, пробой диапазона"
            />
          </label>
          <label>
            Ошибка
            <select value={mistake} onChange={(event) => setMistake(event.target.value)}>
              <option value="">Не отмечена</option>
              <option value="early-entry">Ранний вход</option>
              <option value="late-exit">Поздний выход</option>
              <option value="oversize">Завышенный риск</option>
              <option value="revenge">Revenge trading</option>
              <option value="no-plan">Сделка без плана</option>
            </select>
          </label>
          <label>
            Эмоция
            <select value={emotion} onChange={(event) => setEmotion(event.target.value)}>
              <option value="">Не отмечена</option>
              <option value="calm">Спокойствие</option>
              <option value="fear">Страх</option>
              <option value="fomo">FOMO</option>
              <option value="greed">Жадность</option>
              <option value="anger">Злость</option>
            </select>
          </label>
          <label>
            Исходный стоп
            <input
              type="number"
              min="0"
              step="any"
              value={stopLoss}
              onChange={(event) => setStopLoss(event.target.value)}
              placeholder="Не указан"
            />
          </label>
          <label className="premium-plan-score">
            Соблюдение плана
            <span>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={planScore}
                onChange={(event) => setPlanScore(Number(event.target.value))}
              />
              <strong>{planScore}/10</strong>
            </span>
          </label>
          <label className="premium-context-notes">
            Заметка
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Почему вошли, что ожидали и что сделали бы иначе?"
            />
          </label>
        </div>
        <button type="button" onClick={saveContext} disabled={saving}>
          {saving ? <Clock size={17} /> : <CheckCircle size={17} />}
          {saving ? 'Сохраняем…' : 'Сохранить контекст'}
        </button>
      </section>

      <Link className="premium-open-journal" to="/dashboard/trades" onClick={onClose}>
        <BookOpen size={18} />
        Открыть в журнале
        <ArrowRight size={17} />
      </Link>
    </motion.aside>
  );
}
