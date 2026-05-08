import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useImportTrades } from '@/hooks/useImportTrades';

interface ImportTradesModalProps {
  onClose: () => void;
}

type ExchangeType = 'binance' | 'bybit' | 'okx' | 'mt4' | 'mt5';

const EXCHANGES: { value: ExchangeType; label: string; icon: string }[] = [
  { value: 'binance', label: 'Binance', icon: '🔶' },
  { value: 'bybit', label: 'Bybit', icon: '🔷' },
  { value: 'okx', label: 'OKX', icon: '🔵' },
  { value: 'mt4', label: 'MetaTrader 4', icon: '📊' },
  { value: 'mt5', label: 'MetaTrader 5', icon: '📈' },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <Card
        padding="lg"
        className="max-w-md w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">Импорт сделок</h3>
        <p className="text-sm text-text-muted">Подключите API ключ биржи (только чтение)</p>

        <div className="grid grid-cols-3 gap-2">
          {EXCHANGES.map((e) => (
            <button
              key={e.value}
              onClick={() => setExchange(e.value)}
              className={`px-3 py-2 rounded-xl text-center text-xs font-medium transition-colors ${exchange === e.value ? 'bg-accent-green/10 border border-accent-green text-accent-green' : 'bg-surface-overlay border border-surface-border text-text-secondary'}`}
            >
              <span className="text-lg block">{e.icon}</span>
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
            className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">API Secret</span>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Введите секретный ключ"
            className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono"
          />
        </div>

        <div className="p-3 rounded-xl bg-accent-green/5 border border-accent-green/20">
          <p className="text-accent-green text-xs font-semibold">🔒 Только чтение</p>
          <p className="text-text-secondary text-[11px] mt-1">
            Создайте ключ с правами Read-only. Ваши средства в безопасности.
          </p>
        </div>

        {importing && (
          <div className="w-full bg-surface-border rounded-full h-2">
            <div
              className="bg-accent-green h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleImport} isLoading={importing} className="flex-1">
            Импортировать
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Отмена
          </Button>
        </div>
      </Card>
    </div>
  );
}
