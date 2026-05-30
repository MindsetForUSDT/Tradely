// components/dashboard/TradeList.tsx
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { cn, formatUSD, formatDate, shortenAddress, pnlClass } from '@/lib/utils';
import type { Trade } from '@/types';

interface TradeListProps {
  trades: Trade[];
  isLoading?: boolean;
  onTradeClick?: (trade: Trade) => void;
}

const ROW_HEIGHT = 64;
const OVERSCAN = 10;

export function TradeList({ trades, isLoading = false, onTradeClick }: TradeListProps) {
  const [sortBy, setSortBy] = useState<'timestamp' | 'pnl' | 'value_usd'>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 });

  const filteredTrades = useMemo(() => {
    let result = [...trades];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (t) => t.symbol?.toLowerCase().includes(lower) || t.tx_hash?.toLowerCase().includes(lower)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'pnl':
          comparison = (a.pnl_realized || 0) - (b.pnl_realized || 0);
          break;
        case 'value_usd':
          comparison = (a.value_usd || 0) - (b.value_usd || 0);
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [trades, search, sortBy, sortDir]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(
      filteredTrades.length,
      Math.ceil((scrollTop + clientHeight) / ROW_HEIGHT) + OVERSCAN
    );

    setVisibleRange({ start, end });
  }, [filteredTrades.length]);

  useEffect(() => {
    handleScroll();
  }, [filteredTrades.length, handleScroll]);

  const visibleTrades = useMemo(
    () => filteredTrades.slice(visibleRange.start, visibleRange.end),
    [filteredTrades, visibleRange]
  );

  const totalHeight = filteredTrades.length * ROW_HEIGHT;
  const offsetY = visibleRange.start * ROW_HEIGHT;

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-border rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Сделки ({filteredTrades.length})</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Поиск по символу или хешу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-xs w-48"
          />

          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split('-');
              setSortBy(by as typeof sortBy);
              setSortDir(dir as typeof sortDir);
            }}
            className="px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-xs"
          >
            <option value="timestamp-desc">Новые</option>
            <option value="timestamp-asc">Старые</option>
            <option value="pnl-desc">P&L ↑</option>
            <option value="pnl-asc">P&L ↓</option>
            <option value="value_usd-desc">Объём ↑</option>
            <option value="value_usd-asc">Объём ↓</option>
          </select>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto rounded-xl"
        style={{ height: Math.min(600, Math.max(totalHeight, 200)), maxHeight: '70vh' }}
      >
        {filteredTrades.length > 0 ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleTrades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} onClick={() => onTradeClick?.(trade)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-text-muted">
            {search ? 'Сделки не найдены' : 'Нет сделок'}
          </div>
        )}
      </div>
    </Card>
  );
}

const TradeRow = ({ trade, onClick }: { trade: Trade; onClick?: () => void }) => {
  const priceValue = trade.price_usd || 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-overlay cursor-pointer transition-colors border-b border-surface-border/50 last:border-0"
      style={{ height: ROW_HEIGHT }}
    >
      <div className="w-24 flex-shrink-0">
        <p className="text-sm font-semibold truncate">{trade.symbol}</p>
        <span
          className={cn(
            'text-[10px] font-medium uppercase',
            trade.side === 'buy' ? 'text-accent-green' : 'text-accent-red'
          )}
        >
          {trade.side === 'buy' ? 'Покупка' : 'Продажа'}
        </span>
        {trade.exchange && (
          <span className="text-[9px] text-text-muted ml-1">({trade.exchange})</span>
        )}
      </div>

      <div className="w-24 text-right flex-shrink-0">
        <p className="text-xs font-mono">
          {parseFloat(trade.amount?.toString() || '0').toFixed(2)}
        </p>
        <p className="text-[10px] text-text-muted">{formatUSD(trade.value_usd || 0)}</p>
      </div>

      <div className="w-20 text-right flex-shrink-0">
        <p className="text-xs font-mono">{formatUSD(priceValue)}</p>
      </div>

      <div className="flex-1 text-right">
        <p className={cn('text-sm font-bold font-mono', pnlClass(trade.pnl_realized || 0))}>
          {formatUSD(trade.pnl_realized || 0)}
        </p>
        {trade.fee_usd && trade.fee_usd > 0 && (
          <p className="text-[10px] text-text-muted">Fee: {formatUSD(trade.fee_usd)}</p>
        )}
      </div>

      <div className="w-28 text-right flex-shrink-0">
        <p className="text-xs text-text-muted">{formatDate(trade.timestamp)}</p>
        <p className="text-[9px] text-text-muted">{trade.status}</p>
      </div>

      <div className="w-24 text-right flex-shrink-0">
        <p className="text-[10px] text-text-muted font-mono truncate" title={trade.tx_hash || ''}>
          {trade.tx_hash ? shortenAddress(trade.tx_hash, 6) : '—'}
        </p>
      </div>
    </div>
  );
};
