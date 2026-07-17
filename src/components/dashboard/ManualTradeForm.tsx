import { FormEvent, useMemo, useState } from 'react';
import { ArrowsLeftRight, X } from '@phosphor-icons/react';

export interface ManualTradeInput {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price_usd: number;
  value_usd: number;
  fee_usd: number;
  status: 'closed';
  exchange: 'manual';
  import_source: 'manual';
  timestamp: string;
  raw_data: string;
}

interface ManualTradeFormProps {
  onSave: (trade: ManualTradeInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ManualTradeForm({ onSave, onCancel, isSubmitting = false }: ManualTradeFormProps) {
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');
  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const parsedAmount = Number(amount);
  const parsedPrice = Number(price);
  const parsedFee = Number(fee || 0);
  const valid =
    /^[A-Z0-9]{2,12}([/-][A-Z0-9]{2,12})?$/.test(symbol.trim().toUpperCase()) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0 &&
    Number.isFinite(parsedFee) &&
    parsedFee >= 0;
  const volume = useMemo(() => parsedAmount * parsedPrice || 0, [parsedAmount, parsedPrice]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || isSubmitting) return;
    void onSave({
      symbol: symbol.trim().toUpperCase(),
      side,
      amount: parsedAmount,
      price_usd: parsedPrice,
      value_usd: volume,
      fee_usd: parsedFee,
      status: 'closed',
      exchange: 'manual',
      import_source: 'manual',
      timestamp: new Date().toISOString(),
      raw_data: JSON.stringify({ strategy: strategy.trim(), notes: notes.trim() }),
    });
  };

  return (
    <form className="manual-trade-form-v3" onSubmit={submit}>
      <header>
        <span>
          <ArrowsLeftRight size={17} />
        </span>
        <div>
          <small>Опциональная запись</small>
          <h2>Добавить сделку вручную</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="Закрыть">
          <X size={18} />
        </button>
      </header>
      <p className="manual-trade-intro">
        Используйте только для сделок вне подключённых источников. Автоматический импорт продолжит
        работать независимо от этой записи.
      </p>
      <div className="manual-trade-fields">
        <label>
          Инструмент
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="BTC/USDT"
            aria-invalid={submitted && !symbol.trim()}
            autoFocus
          />
        </label>
        <label>
          Направление
          <select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')}>
            <option value="buy">Покупка</option>
            <option value="sell">Продажа</option>
          </select>
        </label>
        <label>
          Количество
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="0.10"
            aria-invalid={submitted && !(parsedAmount > 0)}
          />
        </label>
        <label>
          Цена, USD
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="63 400"
            aria-invalid={submitted && !(parsedPrice > 0)}
          />
        </label>
        <label>
          Комиссия, USD
          <input
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            type="number"
            step="any"
            min="0"
          />
        </label>
        <label>
          Стратегия
          <input
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            placeholder="Пробой диапазона"
          />
        </label>
        <label className="manual-trade-notes">
          Контекст
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Причина входа и важные наблюдения"
          />
        </label>
      </div>
      {submitted && !valid ? (
        <p className="manual-trade-error">Проверьте инструмент, количество, цену и комиссию.</p>
      ) : null}
      <footer>
        <span>
          Объём сделки{' '}
          <strong>${volume.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
        </span>
        <div>
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем…' : 'Добавить'}
          </button>
        </div>
      </footer>
    </form>
  );
}
