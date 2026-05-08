import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'profit' | 'loss'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date' | 'pnl' | 'volume'>('date');
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let result = [...trades];
    if (filter === 'buy') result = result.filter((t) => t.side === 'buy');
    if (filter === 'sell') result = result.filter((t) => t.side === 'sell');
    if (filter === 'profit') result = result.filter((t) => (t.pnl_realized || 0) > 0);
    if (filter === 'loss') result = result.filter((t) => (t.pnl_realized || 0) < 0);
    if (search)
      result = result.filter((t) => (t.symbol || '').toLowerCase().includes(search.toLowerCase()));

    if (sort === 'pnl') result.sort((a, b) => (b.pnl_realized || 0) - (a.pnl_realized || 0));
    if (sort === 'volume') result.sort((a, b) => (b.value_usd || 0) - (a.value_usd || 0));

    return result;
  }, [trades, filter, search, sort]);

  const displayTrades = compact ? filtered.slice(0, 5) : filtered;

  const rowVirtualizer = useVirtualizer({
    count: displayTrades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const totalPnl = filtered.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);

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
              <>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSort('date')}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                      sort === 'date'
                        ? 'bg-accent-green text-surface'
                        : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
                    )}
                  >
                    По дате
                  </button>
                  <button
                    onClick={() => setSort('pnl')}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                      sort === 'pnl'
                        ? 'bg-accent-green text-surface'
                        : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
                    )}
                  >
                    По P&L
                  </button>
                  <button
                    onClick={() => setSort('volume')}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                      sort === 'volume'
                        ? 'bg-accent-green text-surface'
                        : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
                    )}
                  >
                    По объёму
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Поиск по символу..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-surface-elevated border border-surface-border rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-green/30 w-36"
                />
              </>
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
      ) : compact ? (
        <div className="space-y-2">
          {displayTrades.map((trade: any, i: number) => {
            const pnl = trade.pnl_realized || 0;
            return (
              <div
                key={trade.id || i}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-overlay"
              >
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
            );
          })}
        </div>
      ) : (
        <div ref={parentRef} style={{ height: '600px', overflowY: 'auto' }}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const trade = displayTrades[virtualRow.index];
              const pnl = trade.pnl_realized || 0;
              return (
                <div
                  key={trade.id || virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-4 py-3 rounded-xl hover:bg-surface-overlay border-b border-surface-border/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
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
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Кол-во</p>
                        <p className="text-sm font-mono">{trade.amount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Цена</p>
                        <p className="text-sm font-mono">{formatUSD(trade.price)}</p>
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
                  </div>
                  <div className="mt-2">
                    <TagManager tradeId={trade.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
