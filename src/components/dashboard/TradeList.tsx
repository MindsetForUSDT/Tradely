import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { formatUSD, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
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
    let r = [...trades];
    if (filter === 'buy') r = r.filter((t) => t.side === 'buy');
    if (filter === 'sell') r = r.filter((t) => t.side === 'sell');
    if (filter === 'profit') r = r.filter((t) => (t as any).pnl_realized > 0);
    if (filter === 'loss') r = r.filter((t) => (t as any).pnl_realized < 0);
    if (search) r = r.filter((t) => (t.symbol || '').toLowerCase().includes(search.toLowerCase()));
    return r;
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
              className="input-field w-36"
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
        <StaggerContainer className="space-y-2" staggerDelay={0.03}>
          {display.map((trade: any, i: number) => {
            const pnl = trade.pnl_realized || 0;
            return (
              <ScrollReveal key={trade.id || i} delay={i * 0.02} direction="up">
                <Card interactive padding="sm" className="flex items-center justify-between">
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
                </Card>
              </ScrollReveal>
            );
          })}
        </StaggerContainer>
      )}
    </Card>
  );
}
