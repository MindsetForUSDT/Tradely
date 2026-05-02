import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { formatUSD, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function TradeList({
  trades = [],
  isLoading = false,
  compact = false,
}: {
  trades: any[];
  isLoading?: boolean;
  compact?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayTrades = compact && !showAll ? trades.slice(0, 5) : trades;

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface-border rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-border rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (!trades.length) {
    return (
      <Card padding="md">
        <div className="text-center py-8 text-text-muted">Сделок пока нет</div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{compact ? 'Последние сделки' : 'История сделок'}</h3>
        {compact && trades.length > 5 && (
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-accent-green">
            {showAll ? 'Скрыть' : 'Все сделки →'}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {displayTrades.map((trade: any, i: number) => (
            <motion.div
              key={trade.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-overlay border-b border-surface-border/30 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                    trade.side === 'buy'
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-accent-red/10 text-accent-red'
                  )}
                >
                  {trade.side === 'buy' ? 'BUY' : 'SELL'}
                </div>
                <div>
                  <p className="text-sm font-medium">{trade.symbol}</p>
                  <p className="text-xs text-text-muted">{formatDate(trade.timestamp)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono">{formatUSD(trade.value_usd || 0)}</p>
                <p className="text-xs text-text-muted">
                  {trade.amount} x {formatUSD(trade.price)}
                </p>
                <p
                  className={cn(
                    'text-xs font-medium',
                    (trade.pnl_realized || 0) >= 0 ? 'text-accent-green' : 'text-accent-red'
                  )}
                >
                  {(trade.pnl_realized || 0) >= 0 ? '+' : ''}
                  {formatUSD(trade.pnl_realized || 0)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}
