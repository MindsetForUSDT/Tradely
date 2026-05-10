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
        glow="cyan"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-text-primary">ИМПОРТ СДЕЛОК</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-neon-cyan transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="font-mono text-xs text-text-secondary">
          Подключите API ключ биржи (Read-only)
        </p>

        <div className="grid grid-cols-3 gap-2">
          {EXCHANGES.map((e) => (
            <button
              key={e.value}
              onClick={() => setExchange(e.value)}
              className={`p-3 text-center text-xs font-mono uppercase tracking-wider transition-all border ${
                exchange === e.value
                  ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-hud'
                  : 'border-surface-border bg-surface-overlay text-text-secondary hover:border-neon-cyan/30'
              }`}
            >
              <Icon name={e.icon} size={22} className="mx-auto mb-1" />
              {e.label}
            </button>
          ))}
        </div>

        <div>
          <span className="hud-text block mb-1">API_KEY</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Введите API ключ"
            className="hud-input"
          />
        </div>
        <div>
          <span className="hud-text block mb-1">API_SECRET</span>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Введите секретный ключ"
            className="hud-input"
          />
        </div>

        <div className="p-3 border border-neon-cyan/20 bg-neon-cyan/5">
          <p className="font-mono text-[10px] text-neon-cyan uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="shield" size={12} /> [ READ-ONLY ]
          </p>
          <p className="text-text-secondary text-[11px] mt-1">
            Ключ только для чтения. Средства в безопасности.
          </p>
        </div>

        {importing && (
          <div className="w-full bg-surface-border h-1.5 overflow-hidden">
            <div
              className="bg-neon-cyan h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleImport} isLoading={importing} className="flex-1">
            [ ИМПОРТИРОВАТЬ ]
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            [ ОТМЕНА ]
          </Button>
        </div>
      </Card>
    </div>
  );
}
