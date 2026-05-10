import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useImportTrades } from '@/hooks/useImportTrades';

interface ImportTradesModalProps {
  onClose: () => void;
}

type ExchangeType = 'binance' | 'bybit' | 'okx' | 'mt4' | 'mt5';

const EXCHANGES = [
  { value: 'binance' as ExchangeType, label: 'Binance', icon: 'binance' as const },
  { value: 'bybit' as ExchangeType, label: 'Bybit', icon: 'bybit' as const },
  { value: 'okx' as ExchangeType, label: 'OKX', icon: 'okx' as const },
  { value: 'mt4' as ExchangeType, label: 'MetaTrader 4', icon: 'journal' as const },
  { value: 'mt5' as ExchangeType, label: 'MetaTrader 5', icon: 'chart' as const },
];

export function ImportTradesModal({ onClose }: ImportTradesModalProps) {
  const [exchange, setExchange] = useState<ExchangeType>('binance');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const { importFromExchange, importing, progress } = useImportTrades();

  const handleImport = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) return;
    await importFromExchange(exchange, apiKey, apiSecret);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        padding="lg"
        className="max-w-md w-full mx-4 space-y-4"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Импорт сделок</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="text-sm text-text-muted">Подключите API ключ биржи (только чтение)</p>

        <div className="grid grid-cols-3 gap-2">
          {EXCHANGES.map((e) => (
            <button
              key={e.value}
              onClick={() => setExchange(e.value)}
              className={`p-3 text-center text-xs font-medium rounded-xl transition-all border ${
                exchange === e.value
                  ? 'border-accent-green bg-accent-green/5 text-accent-green'
                  : 'border-surface-border bg-surface-overlay text-text-secondary hover:border-accent-green/30'
              }`}
            >
              <Icon name={e.icon} size={22} className="mx-auto mb-1" />
              {e.label}
            </button>
          ))}
        </div>

        <div>
          <span className="text-xs text-text-muted block mb-1">API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Введите API ключ"
            className="input-field font-mono"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">API Secret</span>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Введите секретный ключ"
            className="input-field font-mono"
          />
        </div>

        <div className="p-3 rounded-xl bg-accent-green/5 border border-accent-green/20">
          <p className="text-accent-green text-xs font-semibold flex items-center gap-1.5">
            <Icon name="shield" size={12} /> Только чтение
          </p>
          <p className="text-text-secondary text-[11px] mt-1">
            Ключ только для чтения. Средства в безопасности.
          </p>
        </div>

        {importing && (
          <div className="w-full bg-surface-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent-green h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleImport} isLoading={importing} className="flex-1">
            Импортировать
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Отмена
          </Button>
        </div>
      </Card>
    </div>
  );
}
