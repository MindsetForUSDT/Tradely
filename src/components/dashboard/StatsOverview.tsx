// components/dashboard/StatsOverview.tsx
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { WalletIcon, ChartIcon, TradesIcon, Icon } from '@/components/ui/Icons';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProFeature } from '@/components/guards/ProFeature';
import { cn, formatUSD } from '@/lib/utils';

interface StatsOverviewProps {
  balance: number;
  pnl: number;
  trades: number;
  totalPnl: number;
  winRate: number;
  totalVolume: number;
  isLoading?: boolean;
  onTradesClick?: () => void;
}

export function StatsOverview({
  balance,
  pnl,
  trades,
  totalPnl,
  winRate,
  totalVolume,
  isLoading = false,
  onTradesClick,
}: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} padding="md">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-20 bg-surface-border rounded" />
              <div className="h-7 w-32 bg-surface-border rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Общий баланс',
      tooltip: 'Сумма балансов всех кошельков.',
      value: balance,
      format: (v: number) => formatUSD(v),
      icon: <WalletIcon size={18} className="text-text-secondary" />,
      color: 'text-text-primary',
      bg: 'bg-surface-overlay',
      pro: false,
    },
    {
      label: 'P&L сегодня',
      tooltip: 'Реализованная прибыль/убыток за последние 24 часа (только новые сделки).',
      value: pnl,
      format: (v: number) => `${v >= 0 ? '+' : ''}${formatUSD(v)}`,
      icon: <ChartIcon size={18} className={pnl >= 0 ? 'text-accent-green' : 'text-accent-red'} />,
      color: pnl >= 0 ? 'text-accent-green' : 'text-accent-red',
      bg: pnl >= 0 ? 'bg-accent-green/5' : 'bg-accent-red/5',
      pro: false,
    },
    {
      label: 'Сделок',
      tooltip: 'Нажмите чтобы посмотреть все сделки',
      value: trades,
      format: (v: number) => v.toString(),
      icon: <TradesIcon size={18} className="text-text-secondary" />,
      color: 'text-text-primary',
      bg: 'bg-surface-overlay',
      clickable: true,
      pro: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card
          key={item.label}
          interactive
          padding="md"
          className={cn(
            'cursor-pointer hover:ring-2 hover:ring-accent-primary/50 transition-all',
            item.clickable ? 'cursor-pointer' : 'cursor-default'
          )}
          onClick={item.clickable ? onTradesClick : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
              {item.label}
              <Tooltip content={item.tooltip} />
              {item.clickable && (
                <Icon name="chevron-down" size={12} className="text-text-muted rotate-45" />
              )}
            </span>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bg)}>
              <span className={item.color}>{item.icon}</span>
            </div>
          </div>
          <div className={cn('text-2xl font-bold font-mono tracking-tight', item.color)}>
            <AnimatedCounter value={item.value} formatter={item.format} duration={800} />
          </div>
        </Card>
      ))}

      {/* Pro метрики */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <ProFeature
          fallback={
            <Card padding="md" className="opacity-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
                  Общий P&L
                  <Tooltip content="Доступно только для Pro подписчиков" />
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center">
                  <Icon name="shield" size={16} className="text-text-muted" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-text-muted">***</div>
            </Card>
          }
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
                Общий P&L
                <Tooltip content="Суммарная прибыль/убыток по ВСЕМ сделкам." />
              </span>
              <ChartIcon
                size={18}
                className={totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}
              />
            </div>
            <div
              className={cn(
                'text-xl font-bold font-mono',
                totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
              )}
            >
              {totalPnl >= 0 ? '+' : ''}
              {formatUSD(totalPnl)}
            </div>
          </Card>
        </ProFeature>

        <ProFeature
          fallback={
            <Card padding="md" className="opacity-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
                  Win Rate
                  <Tooltip content="Доступно только для Pro подписчиков" />
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center">
                  <Icon name="shield" size={16} className="text-text-muted" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-text-muted">***</div>
            </Card>
          }
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
                Win Rate
                <Tooltip content="Процент прибыльных сделок от общего числа." />
              </span>
              <TradesIcon size={18} className="text-accent-purple" />
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">
              {winRate.toFixed(1)}%
            </div>
          </Card>
        </ProFeature>

        <ProFeature
          fallback={
            <Card padding="md" className="opacity-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
                  Общий объём
                  <Tooltip content="Доступно только для Pro подписчиков" />
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center">
                  <Icon name="shield" size={16} className="text-text-muted" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-text-muted">***</div>
            </Card>
          }
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted uppercase flex items-center gap-1">
                Общий объём
                <Tooltip content="Суммарный объём всех сделок в USD." />
              </span>
              <WalletIcon size={18} className="text-accent-blue" />
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">
              {formatUSD(totalVolume)}
            </div>
          </Card>
        </ProFeature>
      </div>
    </div>
  );
}
