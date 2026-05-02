import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSD, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TradeListProps {
  trades: any[];
  isLoading?: boolean;
  compact?: boolean;
}

export function TradeList({ trades = [], isLoading = false, compact = false }: TradeListProps) {
  const [showAll, setShowAll] = useState(false);
  const displayTrades = compact && !showAll ? trades.slice(0, 5) : trades;

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-border rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (!trades.length) {
    return (
      <Card padding="md">
        <div className="text-center py-12 text-text-muted">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm">Сделок пока нет</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{compact ? 'Последние сделки' : 'История сделок'}</h3>
        {compact && trades.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-accent-green hover:text-accent-green-dim"
          >
            {showAll ? 'Скрыть' : 'Все →'}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {displayTrades.map((trade: any, i: number) => {
          const pnl = trade.pnl_realized || 0;
          const isBuy = trade.side === 'buy';
          return (
            <div
              key={trade.id || i}
              className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-overlay transition-colors group"
            >
              {/* Лево */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                    isBuy
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-accent-red/10 text-accent-red'
                  )}
                >
                  {isBuy ? 'BUY' : 'SELL'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{trade.symbol}</p>
                  <p className="text-[11px] text-text-muted">{formatDate(trade.timestamp)}</p>
                </div>
              </div>
              {/* Центр */}
              <div className="text-center hidden md:block">
                <p className="text-xs text-text-muted">Кол-во</p>
                <p className="text-sm font-mono">{trade.amount}</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-xs text-text-muted">Цена</p>
                <p className="text-sm font-mono">{formatUSD(trade.price)}</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-xs text-text-muted">Объём</p>
                <p className="text-sm font-mono text-text-secondary">
                  {formatUSD(trade.value_usd)}
                </p>
              </div>
              {/* Право — результат */}
              <div className="text-right">
                <p
                  className={cn(
                    'text-sm font-bold font-mono',
                    pnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                  )}
                >
                  {pnl >= 0 ? '+' : ''}
                  {formatUSD(pnl)}
                </p>
                <p
                  className={cn(
                    'text-[11px]',
                    pnl >= 0 ? 'text-accent-green/70' : 'text-accent-red/70'
                  )}
                >
                  {pnl >= 0 ? 'Прибыль' : 'Убыток'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
