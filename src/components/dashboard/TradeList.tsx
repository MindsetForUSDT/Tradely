import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSD, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TagManager } from './TagManager';
import type { Trade } from '@/types';

interface TradeListProps {
  trades: Trade[];
  isLoading?: boolean;
  compact?: boolean;
}

export function TradeList({ trades = [], isLoading = false, compact = false }: TradeListProps) {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'profit' | 'loss'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...trades];
    if (filter === 'buy') result = result.filter((t) => t.side === 'buy');
    if (filter === 'sell') result = result.filter((t) => t.side === 'sell');
    if (filter === 'profit') result = result.filter((t) => ((t as any).pnl_realized || 0) > 0);
    if (filter === 'loss') result = result.filter((t) => ((t as any).pnl_realized || 0) < 0);
    if (search)
      result = result.filter((t) => (t.symbol || '').toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [trades, filter, search]);

  const display = compact ? filtered.slice(0, 5) : filtered;
  const totalPnl = filtered.reduce((s, t: any) => s + (t.pnl_realized || 0), 0);

  if (isLoading)
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-border rounded-lg" />
          ))}
        </div>
      </Card>
    );

  return (
    <Card padding="md">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {compact ? 'Последние сделки' : 'История сделок'}
          </h3>
          {!compact && (
            <input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface-elevated border border-surface-border rounded-lg text-white w-36"
            />
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'buy', 'sell', 'profit', 'loss'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 text-[11px] rounded-lg font-medium',
                filter === f
                  ? 'bg-accent-green text-surface'
                  : 'bg-surface-overlay text-text-secondary'
              )}
            >
              {f === 'all'
                ? 'Все'
                : f === 'buy'
                  ? 'Покупки'
                  : f === 'sell'
                    ? 'Продажи'
                    : f === 'profit'
                      ? 'Прибыль +'
                      : 'Убыток −'}
            </button>
          ))}
        </div>
        {!compact && (
          <div className="flex gap-4 text-xs text-text-muted">
            <span>
              Сделок: <strong>{filtered.length}</strong>
            </span>
            <span>
              P&L:{' '}
              <strong className={totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                {formatUSD(totalPnl)}
              </strong>
            </span>
          </div>
        )}
      </div>
      {!display.length ? (
        <div className="text-center py-8 text-text-muted text-sm">Нет сделок</div>
      ) : (
        <div className="space-y-2">
          {display.map((trade: any, i: number) => {
            const pnl = trade.pnl_realized || 0;
            return (
              <div
                key={trade.id || i}
                className="p-4 rounded-xl hover:bg-surface-overlay border-b border-surface-border/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                        trade.side === 'buy'
                          ? 'bg-accent-green/10 text-accent-green'
                          : 'bg-accent-red/10 text-accent-red'
                      )}
                    >
                      {trade.side === 'buy' ? 'BUY' : 'SELL'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{trade.symbol}</p>
                      <p className="text-[11px] text-text-muted">{formatDate(trade.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono">{formatUSD(trade.value_usd)}</p>
                    <p
                      className={cn(
                        'text-[11px]',
                        pnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                      )}
                    >
                      {pnl >= 0 ? '+' : ''}
                      {formatUSD(pnl)}
                    </p>
                  </div>
                </div>
                {!compact && (
                  <div className="mt-2">
                    <TagManager tradeId={trade.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
