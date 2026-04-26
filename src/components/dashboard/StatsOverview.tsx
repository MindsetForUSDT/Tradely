// ============================================================
// TradeumDiary — Верхняя панель статистики дашборда
// Общий баланс, P&L, количество сделок с анимированными счётчиками
// ============================================================

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { useStore } from '@/store/useStore';
import { cn, formatUSD } from '@/lib/utils';

interface StatsOverviewProps {
  balance: number;
  pnl: number;
  trades: number;
  isLoading?: boolean;
}

export function StatsOverview({ balance, pnl, trades, isLoading = false }: StatsOverviewProps) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const statsItems = [
    {
      label: 'Общий баланс',
      value: balance,
      format: (v: number) => formatUSD(v),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 010-4h14v4" />
          <path d="M3 5v14a2 2 0 002 2h16v-5" />
          <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
        </svg>
      ),
      color: 'text-text-primary',
      bgColor: 'bg-surface-overlay',
    },
    {
      label: 'P&L за сегодня',
      value: pnl,
      format: (v: number) => `${v >= 0 ? '+' : ''}${formatUSD(v)}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      color: pnl >= 0 ? 'text-accent-green' : 'text-accent-red',
      bgColor: pnl >= 0 ? 'bg-accent-green/5' : 'bg-accent-red/5',
    },
    {
      label: 'Сделок сегодня',
      value: trades,
      format: (v: number) => v.toString(),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ),
      color: 'text-text-primary',
      bgColor: 'bg-surface-overlay',
    },
  ];

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {statsItems.map((item, index) => (
        <motion.div key={item.label} variants={itemVariants}>
          <Card padding="md" glow glowColor={index === 1 ? (pnl >= 0 ? 'green' : 'red') : 'none'}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted tracking-wide uppercase">
                {item.label}
              </span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bgColor)}>
                <span className={item.color}>{item.icon}</span>
              </div>
            </div>
            <div className={cn('text-2xl font-bold font-mono tracking-tight', item.color)}>
              <AnimatedCounter
                value={item.value}
                formatter={item.format}
                duration={1000}
              />
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}