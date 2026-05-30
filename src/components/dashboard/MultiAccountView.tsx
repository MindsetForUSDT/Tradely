import { Card } from '@/components/ui/Card';
import { useMultiAccounts } from '@/hooks/useMultiAccounts';
import { formatUSD } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function MultiAccountView() {
  const { accounts, selectedAccounts, toggleAccount, aggregated, maxAccounts } = useMultiAccounts();

  return (
    <Card padding="md" className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">📊 Сводка по кошелькам</h3>
        <span className="text-xs text-text-muted">
          {selectedAccounts.size}/{maxAccounts}
        </span>
      </div>

      {/* Выбор кошельков */}
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => toggleAccount(a.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              selectedAccounts.has(a.id)
                ? 'bg-accent-green text-surface'
                : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
            )}
          >
            {a.label || a.address.slice(0, 8)}
          </button>
        ))}
      </div>

      {/* Агрегированная статистика */}
      {aggregated && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-surface-overlay">
            <p className="text-xs text-text-muted">Объём</p>
            <p className="text-sm font-bold text-text-primary">
              {formatUSD(aggregated.totalVolume)}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-overlay">
            <p className="text-xs text-text-muted">Сделок</p>
            <p className="text-sm font-bold text-text-primary">{aggregated.totalTrades}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-overlay">
            <p className="text-xs text-text-muted">P&L</p>
            <p
              className={cn(
                'text-sm font-bold',
                aggregated.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
              )}
            >
              {formatUSD(aggregated.totalPnl)}
            </p>
          </div>
        </div>
      )}

      {/* Детали по кошелькам */}
      {aggregated?.byAccount?.map((acc) => (
        <div
          key={acc.walletId}
          className="flex items-center justify-between py-2 border-b border-surface-border/30 last:border-0 text-sm"
        >
          <span className="text-text-secondary">{acc.label}</span>
          <div className="flex gap-4 text-xs">
            <span className="text-text-muted">{acc.trades} сд</span>
            <span className={acc.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
              {formatUSD(acc.pnl)}
            </span>
          </div>
        </div>
      ))}

      {accounts.length === 0 && (
        <p className="text-sm text-text-muted text-center py-4">Нет кошельков для отображения</p>
      )}
    </Card>
  );
}
