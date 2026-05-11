import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ReactNode } from 'react';

interface DataCardProps {
  label: string;
  tooltip?: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  color?: string;
  accent?: 'green' | 'red' | 'cyan' | 'magenta' | 'yellow' | 'none';
  delay?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const accentMap = {
  green: 'border-neon-green/30 bg-neon-green/5 hover:border-neon-green/50',
  red: 'border-accent-red/30 bg-accent-red/5 hover:border-accent-red/50',
  cyan: 'border-neon-cyan/30 bg-neon-cyan/5 hover:border-neon-cyan/50',
  magenta: 'border-neon-magenta/30 bg-neon-magenta/5 hover:border-neon-magenta/50',
  yellow: 'border-neon-yellow/30 bg-neon-yellow/5 hover:border-neon-yellow/50',
  none: 'border-cyber-700/50 hover:border-neon-cyan/30',
};

const trendIcon = {
  up: '📈',
  down: '📉',
  flat: '➡',
};

export function DataCard({
  label,
  tooltip,
  value,
  subValue,
  icon,
  color = 'text-white',
  accent = 'none',
  delay = 0,
  trend,
}: DataCardProps) {
  const trendValue = trend?.value ?? 0;
  const isPositive = trend?.isPositive ?? true;
  const trendIconChar = isPositive ? trendIcon.up : trendIcon.down;
  const trendColor = isPositive ? 'text-neon-green' : 'text-accent-red';

  return (
    <motion.div
      className={cn(
        'glass-card p-5 border-2 transition-all duration-300',
        accentMap[accent],
        'group'
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: delay * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              'text-text-muted group-hover:text-neon-cyan transition-colors'
            )}
          >
            {label}
          </span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {icon && (
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-cyber-900/80 border border-cyber-700/50',
              'group-hover:border-neon-cyan/40 group-hover:bg-neon-cyan/5',
              'transition-all duration-300'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={cn('text-3xl font-bold font-mono tracking-tight break-all', color)}>
            {value}
          </p>
          {subValue && <span className="text-xs text-text-muted font-mono">{subValue}</span>}
        </div>

        {/* Тренд */}
        {trend && (
          <div className={cn('inline-flex items-center gap-1 text-xs font-medium', trendColor)}>
            <span>{trendIconChar}</span>
            <span>{Math.abs(trendValue).toFixed(1)}%</span>
            <span className="text-text-muted">за 24ч</span>
          </div>
        )}
      </div>

      {/* Декоративное свечение */}
      <div
        className={cn(
          'absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100',
          'transition-opacity duration-500 pointer-events-none',
          accent === 'green' && 'bg-gradient-to-r from-neon-green/10 to-transparent',
          accent === 'red' && 'bg-gradient-to-r from-accent-red/10 to-transparent',
          accent === 'cyan' && 'bg-gradient-to-r from-neon-cyan/10 to-transparent',
          accent === 'magenta' && 'bg-gradient-to-r from-neon-magenta/10 to-transparent',
          accent === 'yellow' && 'bg-gradient-to-r from-neon-yellow/10 to-transparent'
        )}
      />
    </motion.div>
  );
}
