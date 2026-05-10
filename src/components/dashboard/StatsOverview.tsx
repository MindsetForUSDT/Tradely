import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { WalletIcon, ChartIcon, TradesIcon } from '@/components/ui/Icons';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn, formatUSD } from '@/lib/utils';

interface StatsOverviewProps {
  balance: number;
  pnl: number;
  trades: number;
  isLoading?: boolean;
}

export function StatsOverview({ balance, pnl, trades, isLoading = false }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} padding="md">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-20 bg-surface-border" />
              <div className="h-7 w-32 bg-surface-border" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'ОБЩИЙ БАЛАНС',
      tooltip: 'Сумма объёмов всех сделок в USD.',
      value: balance,
      format: (v: number) => formatUSD(v),
      icon: <WalletIcon />,
      color: 'text-text-primary',
      bg: 'bg-surface-elevated',
    },
    {
      label: 'P&L ЗА СЕГОДНЯ',
      tooltip: 'Реализованная прибыль/убыток за сегодня.',
      value: pnl,
      format: (v: number) => `${v >= 0 ? '+' : ''}${formatUSD(v)}`,
      icon: <ChartIcon />,
      color: pnl >= 0 ? 'text-neon-green' : 'text-neon-red',
      bg: pnl >= 0 ? 'bg-neon-green/5' : 'bg-neon-red/5',
    },
    {
      label: 'СДЕЛОК СЕГОДНЯ',
      tooltip: 'Количество сделок за сегодня.',
      value: trades,
      format: (v: number) => v.toString(),
      icon: <TradesIcon />,
      color: 'text-text-primary',
      bg: 'bg-surface-elevated',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <Card
          key={item.label}
          interactive
          glow={i === 1 ? (pnl >= 0 ? 'green' : 'red') : 'none'}
          padding="md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="hud-text flex items-center gap-1">
              {item.label}
              <Tooltip content={item.tooltip} />
            </span>
            <div
              className={cn(
                'w-8 h-8 flex items-center justify-center border border-surface-border',
                item.bg
              )}
            >
              <span className={item.color}>{item.icon}</span>
            </div>
          </div>
          <div className={cn('text-2xl font-bold font-mono tracking-tight', item.color)}>
            <AnimatedCounter value={item.value} formatter={item.format} duration={800} />
          </div>
        </Card>
      ))}
    </div>
  );
}
