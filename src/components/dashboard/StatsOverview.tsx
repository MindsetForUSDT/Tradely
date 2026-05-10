import { Card } from '@/components/ui/Card';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
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
  if (isLoading)
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

  const items = [
    {
      label: 'Общий баланс',
      tooltip: 'Сумма объёмов всех сделок в USD.',
      value: balance,
      format: (v: number) => formatUSD(v),
      icon: <WalletIcon />,
      color: 'text-text-primary',
      bg: 'bg-surface-overlay',
    },
    {
      label: 'P&L за сегодня',
      tooltip: 'Реализованная прибыль/убыток за сегодня.',
      value: pnl,
      format: (v: number) => `${v >= 0 ? '+' : ''}${formatUSD(v)}`,
      icon: <ChartIcon />,
      color: pnl >= 0 ? 'text-accent-green' : 'text-accent-red',
      bg: pnl >= 0 ? 'bg-accent-green/5' : 'bg-accent-red/5',
    },
    {
      label: 'Сделок сегодня',
      tooltip: 'Количество сделок за сегодня.',
      value: trades,
      format: (v: number) => v.toString(),
      icon: <TradesIcon />,
      color: 'text-text-primary',
      bg: 'bg-surface-overlay',
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <ScrollReveal key={item.label} delay={i * 0.08}>
          <Card
            interactive
            glow={i === 1 ? (pnl >= 0 ? 'green' : 'red') : 'none'}
            glowColor={pnl >= 0 ? 'green' : 'red'}
            padding="md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted uppercase flex items-center">
                {item.label}
                <Tooltip content={item.tooltip} />
              </span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bg)}>
                {item.icon}
              </div>
            </div>
            <div className={cn('text-2xl font-bold font-mono', item.color)}>
              <AnimatedCounter value={item.value} formatter={item.format} />
            </div>
          </Card>
        </ScrollReveal>
      ))}
    </StaggerContainer>
  );
}
