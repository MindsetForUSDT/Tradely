import { FormEvent, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowsLeftRight, Info, X } from '@phosphor-icons/react';
import { formatSignedUSD } from '@/lib/tradeAnalytics';

export interface ManualTradeInput {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  entry_price: number;
  exit_price: number;
  fee_usd: number;
  opened_at: string;
  closed_at: string;
  stop_loss?: number;
  strategy?: string;
  notes?: string;
  plan_score?: number;
}

interface ManualTradeFormProps {
  onSave: (trade: ManualTradeInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function toLocalInputValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ManualTradeForm({ onSave, onCancel, isSubmitting = false }: ManualTradeFormProps) {
  const now = useMemo(() => new Date(), []);
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [fee, setFee] = useState('0');
  const [stopLoss, setStopLoss] = useState('');
  const [openedAt, setOpenedAt] = useState(
    toLocalInputValue(new Date(now.getTime() - 60 * 60_000))
  );
  const [closedAt, setClosedAt] = useState(toLocalInputValue(now));
  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [planScore, setPlanScore] = useState('8');
  const [submitted, setSubmitted] = useState(false);

  const parsedAmount = Number(amount);
  const parsedEntry = Number(entryPrice);
  const parsedExit = Number(exitPrice);
  const parsedFee = Number(fee || 0);
  const parsedStop = Number(stopLoss || 0);
  const parsedPlanScore = Number(planScore);
  const multiplier = side === 'buy' ? 1 : -1;
  const grossPnl =
    Number.isFinite(parsedAmount) && Number.isFinite(parsedEntry) && Number.isFinite(parsedExit)
      ? (parsedExit - parsedEntry) * parsedAmount * multiplier
      : 0;
  const netPnl = grossPnl - (Number.isFinite(parsedFee) ? parsedFee : 0);
  const volume = parsedAmount * parsedEntry || 0;
  const valid =
    /^[A-Z0-9]{2,12}([/-][A-Z0-9]{2,12})?$/.test(symbol.trim().toUpperCase()) &&
    parsedAmount > 0 &&
    parsedEntry > 0 &&
    parsedExit > 0 &&
    parsedFee >= 0 &&
    Boolean(openedAt) &&
    Boolean(closedAt) &&
    new Date(closedAt) >= new Date(openedAt) &&
    parsedPlanScore >= 0 &&
    parsedPlanScore <= 10;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || isSubmitting) return;
    void onSave({
      symbol: symbol.trim().toUpperCase(),
      side,
      amount: parsedAmount,
      entry_price: parsedEntry,
      exit_price: parsedExit,
      fee_usd: parsedFee,
      opened_at: new Date(openedAt).toISOString(),
      closed_at: new Date(closedAt).toISOString(),
      stop_loss: parsedStop > 0 ? parsedStop : undefined,
      strategy: strategy.trim() || undefined,
      notes: notes.trim() || undefined,
      plan_score: parsedPlanScore,
    });
  };

  return (
    <form className="manual-trade-form-v4" onSubmit={submit}>
      <header>
        <span>
          <ArrowsLeftRight size={18} />
        </span>
        <div>
          <small>Сделка вне автоимпорта</small>
          <h2>Добавить завершённую сделку</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="Закрыть">
          <X size={19} />
        </button>
      </header>

      <div className="manual-v4-direction" aria-label="Направление сделки">
        <button
          type="button"
          className={side === 'buy' ? 'active long' : ''}
          onClick={() => setSide('buy')}
        >
          <ArrowUp size={16} /> Long
        </button>
        <button
          type="button"
          className={side === 'sell' ? 'active short' : ''}
          onClick={() => setSide('sell')}
        >
          <ArrowDown size={16} /> Short
        </button>
      </div>

      <div className="manual-trade-fields">
        <label>
          Инструмент
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="BTCUSDT"
            aria-invalid={submitted && !symbol.trim()}
            autoFocus
          />
        </label>
        <label>
          Количество
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="0,10"
            aria-invalid={submitted && !(parsedAmount > 0)}
          />
        </label>
        <label>
          Цена входа
          <input
            value={entryPrice}
            onChange={(event) => setEntryPrice(event.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="63 400"
            aria-invalid={submitted && !(parsedEntry > 0)}
          />
        </label>
        <label>
          Цена выхода
          <input
            value={exitPrice}
            onChange={(event) => setExitPrice(event.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="64 120"
            aria-invalid={submitted && !(parsedExit > 0)}
          />
        </label>
        <label>
          Открыта
          <input
            value={openedAt}
            onChange={(event) => setOpenedAt(event.target.value)}
            type="datetime-local"
          />
        </label>
        <label>
          Закрыта
          <input
            value={closedAt}
            onChange={(event) => setClosedAt(event.target.value)}
            type="datetime-local"
            aria-invalid={submitted && new Date(closedAt) < new Date(openedAt)}
          />
        </label>
        <label>
          Комиссии, USD
          <input
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            type="number"
            step="any"
            min="0"
          />
        </label>
        <label>
          Стоп в плане
          <input
            value={stopLoss}
            onChange={(event) => setStopLoss(event.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="Не указан"
          />
        </label>
        <label>
          Сетап
          <input
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            placeholder="Пробой диапазона"
          />
        </label>
        <label>
          Соблюдение плана · {planScore}/10
          <input
            value={planScore}
            onChange={(event) => setPlanScore(event.target.value)}
            type="range"
            min="0"
            max="10"
            step="1"
          />
        </label>
        <label className="manual-trade-notes">
          Контекст решения
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Почему вошли, что ожидали и что сделали бы иначе"
          />
        </label>
      </div>

      <section className="manual-v4-preview" aria-label="Предварительный расчёт">
        <div>
          <span>Объём</span>
          <strong>${volume.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
        </div>
        <div>
          <span>Валовый результат</span>
          <strong className={grossPnl >= 0 ? 'positive' : 'negative'}>
            {formatSignedUSD(grossPnl)}
          </strong>
        </div>
        <div>
          <span>Комиссии</span>
          <strong>{formatSignedUSD(-parsedFee)}</strong>
        </div>
        <div>
          <span>Чистый P&amp;L</span>
          <strong className={netPnl >= 0 ? 'positive' : 'negative'}>
            {formatSignedUSD(netPnl)}
          </strong>
        </div>
      </section>

      <p className="manual-v4-note">
        <Info size={15} />
        Сервер повторно рассчитывает P&amp;L по входу, выходу, направлению и комиссиям.
      </p>

      {submitted && !valid ? (
        <p className="manual-trade-error">Проверьте инструмент, цены, время и числовые поля.</p>
      ) : null}

      <footer>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем…' : 'Добавить сделку'}
        </button>
      </footer>
    </form>
  );
}
