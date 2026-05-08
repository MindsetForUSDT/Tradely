import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ManualTradeFormProps {
  trade?: any;
  onSave: (trade: any) => void;
  onCancel: () => void;
}

export function ManualTradeForm({ trade, onSave, onCancel }: ManualTradeFormProps) {
  const [symbol, setSymbol] = useState(trade?.symbol || '');
  const [side, setSide] = useState(trade?.side || 'buy');
  const [amount, setAmount] = useState(trade?.amount || '');
  const [price, setPrice] = useState(trade?.price || '');
  const [commission, setCommission] = useState(trade?.commission || '0');
  const [notes, setNotes] = useState(trade?.notes || '');
  const [strategy, setStrategy] = useState(trade?.strategy_tag || '');
  const [timeframe, setTimeframe] = useState(trade?.timeframe || '');

  const handleSave = () => {
    const amt = parseFloat(amount) || 0;
    const prc = parseFloat(price) || 0;
    onSave({
      ...trade,
      symbol: symbol.toUpperCase(),
      side,
      amount: amt,
      price: prc,
      value_usd: amt * prc,
      commission: parseFloat(commission) || 0,
      notes,
      strategy_tag: strategy,
      timeframe,
      timestamp: trade?.timestamp || new Date().toISOString(),
    });
  };

  return (
    <Card padding="md" className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-text-muted block mb-1">Инструмент</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="ETH/USDT"
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Тип</span>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value)}
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          >
            <option value="buy">Покупка</option>
            <option value="sell">Продажа</option>
          </select>
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Количество</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="any"
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Цена</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="any"
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Комиссия</span>
          <input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            type="number"
            step="any"
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Таймфрейм</span>
          <input
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            placeholder="1H"
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          />
        </div>
        <div className="col-span-2">
          <span className="text-xs text-text-muted block mb-1">Стратегия</span>
          <input
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            placeholder="Тренд / Контр-тренд / Скальпинг"
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
          />
        </div>
        <div className="col-span-2">
          <span className="text-xs text-text-muted block mb-1">Заметки</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          {trade ? 'Обновить' : 'Добавить сделку'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
      </div>
    </Card>
  );
}
