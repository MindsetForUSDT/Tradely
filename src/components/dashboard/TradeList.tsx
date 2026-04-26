// ============================================================
// TradeumDiary — Список сделок
// Полная версия — отдельная страница, компактная — виджет
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatUSD, formatDate, shortenAddress, cn } from '@/lib/utils';
import type { Trade } from '@/types';

interface TradeListProps {
  trades: Trade[];
  isLoading?: boolean;
  compact?: boolean;
}

export function TradeList({ trades, isLoading = false, compact = false }: TradeListProps) {
  const [showAll, setShowAll] = useState(false);

  const displayTrades = compact && !showAll ? trades.slice(0, 5) : trades;

  if (isLoading) {
    return (
      <Card padding={compact ? 'md' : 'lg'}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface-border rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-border rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card padding={compact ? 'md' : 'lg'}>
        <div className="flex flex-col items-center justify-center py-8 text-text-muted">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-50">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm">Сделок пока нет</p>
          <p className="text-xs mt-1">Добавьте кошелёк для импорта истории</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={compact ? 'md' : 'lg'}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {compact ? 'Последние сделки' : 'История сделок'}
        </h3>
        {compact && trades.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-accent-green hover:text-accent-green-dim transition-colors"
          >
            {showAll ? 'Скрыть' : 'Все сделки →'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {displayTrades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={compact ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl transition-colors duration-200',
                'hover:bg-surface-overlay',
                !compact && 'border-b border-surface-border/30 last:border-0'
              )}
            >
              {/* Левая часть */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Индикатор buy/sell */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    trade.is_buy
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-accent-red/10 text-accent-red'
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    {trade.is_buy ? (
                      <>
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </>
                    ) : (
                      <>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </>
                    )}
                  </svg>
                </div>

                {/* Детали сделки */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {trade.token_in} → {trade.token_out}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{formatDate(trade.timestamp)}</span>
                    <span>•</span>
                    <span className="font-mono">{shortenAddress(trade.transaction_hash)}</span>
                  </div>
                </div>
              </div>

              {/* Правая часть — сумма */}
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm font-semibold font-mono">
                  {formatUSD(trade.value_usd)}
                </p>
                <p className={cn(
                  'text-xs',
                  trade.is_buy ? 'text-accent-green' : 'text-accent-red'
                )}>
                  {trade.is_buy ? 'Покупка' : 'Продажа'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Кнопка "Загрузить ещё" для полной версии */}
      {!compact && trades.length >= 20 && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm">
            Загрузить ещё
          </Button>
        </div>
      )}
    </Card>
  );
}