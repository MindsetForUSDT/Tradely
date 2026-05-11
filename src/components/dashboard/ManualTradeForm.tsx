import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ManualTradeFormProps {
  trade?: any;
  onSave: (trade: any) => void;
  onCancel: () => void;
}

interface FormErrors {
  symbol?: string;
  amount?: string;
  price?: string;
}

export function ManualTradeForm({ trade, onSave, onCancel }: ManualTradeFormProps) {
  const [symbol, setSymbol] = useState(trade?.symbol || '');
  const [side, setSide] = useState(trade?.side || 'buy');
  const [amount, setAmount] = useState(trade?.amount?.toString() || '');
  const [price, setPrice] = useState(trade?.price?.toString() || '');
  const [commission, setCommission] = useState(trade?.commission?.toString() || '0');
  const [notes, setNotes] = useState(trade?.notes || '');
  const [strategy, setStrategy] = useState(trade?.strategy_tag || '');
  const [timeframe, setTimeframe] = useState(trade?.timeframe || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Валидация полей в реальном времени
  useEffect(() => {
    validateForm();
  }, [symbol, amount, price]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Валидация символа
    if (!symbol.trim()) {
      newErrors.symbol = 'Введите символ инструмента';
      isValid = false;
    } else if (!/^[A-Z0-9/]{2,20}$/i.test(symbol)) {
      newErrors.symbol = 'Некорректный формат (например, ETH/USDT)';
      isValid = false;
    }

    // Валидация количества
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt)) {
      newErrors.amount = 'Введите количество';
      isValid = false;
    } else if (amt <= 0) {
      newErrors.amount = 'Количество должно быть больше 0';
      isValid = false;
    } else if (amt > 1_000_000_000) {
      newErrors.amount = 'Слишком большое значение';
      isValid = false;
    }

    // Валидация цены
    const prc = parseFloat(price);
    if (!price || isNaN(prc)) {
      newErrors.price = 'Введите цену';
      isValid = false;
    } else if (prc <= 0) {
      newErrors.price = 'Цена должна быть больше 0';
      isValid = false;
    } else if (prc > 1_000_000_000) {
      newErrors.price = 'Слишком большое значение';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Проверьте введенные данные');
      return;
    }

    setIsSubmitting(true);

    const amt = parseFloat(amount) || 0;
    const prc = parseFloat(price) || 0;
    const comm = parseFloat(commission) || 0;

    // Проверка на реалистичность данных
    const valueUsd = amt * prc;
    if (valueUsd > 10_000_000) {
      toast.error('⚠️ Очень крупная сделка. Проверьте данные.');
    }

    onSave({
      ...trade,
      symbol: symbol.toUpperCase().trim(),
      side,
      amount: amt,
      price: prc,
      value_usd: valueUsd,
      commission: comm,
      notes: notes.trim(),
      strategy_tag: strategy.trim(),
      timeframe: timeframe.trim(),
      timestamp: trade?.timestamp || new Date().toISOString(),
    });

    setIsSubmitting(false);
  };

  const InputField = ({
    label,
    error,
    children,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <span className="text-xs text-text-muted block mb-1.5">{label}</span>
      {children}
      {error && (
        <p className="text-xs text-accent-red mt-1.5 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );

  return (
    <Card padding="lg" className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Инструмент" error={errors.symbol}>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="ETH/USDT"
            className={cn(
              'input-field',
              errors.symbol && 'border-accent-red focus:border-accent-red'
            )}
            aria-invalid={!!errors.symbol}
            aria-describedby={errors.symbol ? 'symbol-error' : undefined}
          />
        </InputField>

        <InputField label="Тип">
          <select value={side} onChange={(e) => setSide(e.target.value)} className="input-field">
            <option value="buy">🟢 Покупка</option>
            <option value="sell">🔴 Продажа</option>
          </select>
        </InputField>

        <InputField label="Количество" error={errors.amount}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="1.5"
            className={cn(
              'input-field',
              errors.amount && 'border-accent-red focus:border-accent-red'
            )}
            aria-invalid={!!errors.amount}
          />
        </InputField>

        <InputField label="Цена" error={errors.price}>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="2500.50"
            className={cn(
              'input-field',
              errors.price && 'border-accent-red focus:border-accent-red'
            )}
            aria-invalid={!!errors.price}
          />
        </InputField>

        <InputField label="Комиссия ($)">
          <input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="0.50"
            className="input-field"
          />
        </InputField>

        <InputField label="Таймфрейм">
          <input
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value.toUpperCase())}
            placeholder="1H, 4H, 1D"
            className="input-field"
          />
        </InputField>

        <div className="md:col-span-2">
          <InputField label="Стратегия">
            <input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="Тренд / Контр-тренд / Скальпинг"
              className="input-field"
            />
          </InputField>
        </div>

        <div className="md:col-span-2">
          <InputField label="Заметки">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Причины входа, эмоции, наблюдения..."
              className="input-field resize-none"
            />
          </InputField>
        </div>
      </div>

      {/* Preview суммы */}
      {amount && price && !isNaN(parseFloat(amount)) && !isNaN(parseFloat(price)) && (
        <div className="bg-cyber-800/50 rounded-lg p-4 border border-cyber-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Объём сделки:</span>
            <span className="text-white font-mono font-semibold">
              $
              {(parseFloat(amount) * parseFloat(price)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSave}
          className="flex-1"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {trade ? '💾 Обновить сделку' : '➕ Добавить сделку'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
          Отмена
        </Button>
      </div>
    </Card>
  );
}
