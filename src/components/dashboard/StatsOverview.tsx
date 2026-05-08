import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { WalletIcon, ChartIcon, TradesIcon } from '@/components/ui/Icons';
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
      value: balance,
      format: (v: number) => formatUSD(v),
      icon: <WalletIcon />,
      color: 'text-text-primary',
      bg: 'bg-surface-overlay',
    },
    {
      label: 'P&L за сегодня',
      value: pnl,
      format: (v: number) => `${v >= 0 ? '+' : ''}${formatUSD(v)}`,
      icon: <ChartIcon />,
      color: pnl >= 0 ? 'text-accent-green' : 'text-accent-red',
      bg: pnl >= 0 ? 'bg-accent-green/5' : 'bg-accent-red/5',
    },
    {
      label: 'Сделок сегодня',
      value: trades,
      format: (v: number) => v.toString(),
      icon: <TradesIcon />,
      color: 'text-text-primary',
      bg: 'bg-surface-overlay',
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted uppercase">{item.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bg)}>
                <span className={item.color}>{item.icon}</span>
              </div>
            </div>
            <div className={cn('text-2xl font-bold font-mono', item.color)}>
              <AnimatedCounter value={item.value} formatter={item.format} />
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
