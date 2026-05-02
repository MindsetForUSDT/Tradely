import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSD, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TagManager } from './TagManager';

interface TradeListProps {
  trades: any[];
  isLoading?: boolean;
  compact?: boolean;
}

export function TradeList({ trades = [], isLoading = false, compact = false }: TradeListProps) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'profit' | 'loss'>('all');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const filtered = useMemo(() => {
    let result = [...trades];
    if (filter === 'buy') result = result.filter((t) => t.side === 'buy');
    if (filter === 'sell') result = result.filter((t) => t.side === 'sell');
    if (filter === 'profit') result = result.filter((t) => (t.pnl_realized || 0) > 0);
    if (filter === 'loss') result = result.filter((t) => (t.pnl_realized || 0) < 0);
    if (search)
      result = result.filter((t) => (t.symbol || '').toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [trades, filter, search]);

  const displayTrades = compact && !showAll ? filtered.slice(0, 5) : filtered;
  const totalPnl = filtered.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);
  const totalVolume = filtered.reduce((s: number, t: any) => s + (t.value_usd || 0), 0);

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

  return (
    <Card padding="md">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {compact ? 'Последние сделки' : 'История сделок'}
          </h3>
          <div className="flex items-center gap-2">
            {!compact && (
              <input
                type="text"
                placeholder="Поиск по символу..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 text-xs bg-surface-elevated border border-surface-border rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-green/30 w-36"
              />
            )}
            {compact && filtered.length > 5 && (
              <button onClick={() => setShowAll(!showAll)} className="text-xs text-accent-green">
                {showAll ? 'Скрыть' : 'Все →'}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'buy', 'sell', 'profit', 'loss'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 text-[11px] rounded-lg font-medium transition-colors',
                filter === f
                  ? 'bg-accent-green text-surface'
                  : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
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
              Сделок: <strong className="text-text-primary">{filtered.length}</strong>
            </span>
            <span>
              Объём: <strong className="text-text-primary">{formatUSD(totalVolume)}</strong>
            </span>
            <span>
              P&L:{' '}
              <strong className={totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                {totalPnl >= 0 ? '+' : ''}
                {formatUSD(totalPnl)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {!filtered.length ? (
        <div className="text-center py-8 text-text-muted text-sm">Сделок по фильтру нет</div>
      ) : (
        <div className="space-y-2">
          {displayTrades.map((trade: any, i: number) => {
            const pnl = trade.pnl_realized || 0;
            const isBuy = trade.side === 'buy';
            return (
              <div
                key={trade.id || i}
                className="p-4 rounded-xl hover:bg-surface-overlay transition-colors border-b border-surface-border/20 last:border-0"
              >
                <div className="flex items-center justify-between">
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
                  {!compact && (
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Кол-во</p>
                        <p className="text-sm font-mono">{trade.amount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Цена</p>
                        <p className="text-sm font-mono">{formatUSD(trade.price)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Объём</p>
                        <p className="text-sm font-mono text-text-secondary">
                          {formatUSD(trade.value_usd)}
                        </p>
                      </div>
                    </div>
                  )}
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
                {!compact && (
                  <div className="mt-2">
                    <TagManager
                      tradeId={trade.id}
                      existingTags={[]}
                      onTagsChange={() => setRefreshKey((k) => k + 1)}
                      key={refreshKey}
                    />
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
