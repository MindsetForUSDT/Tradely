import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ReactNode } from 'react';

interface DataCardProps {
  label: string;
  tooltip?: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  accent?: 'green' | 'red' | 'cyan' | 'none';
  delay?: number;
}

const accentMap = {
  green: 'border-accent-green/20 bg-accent-green/5',
  red: 'border-accent-red/20 bg-accent-red/5',
  cyan: 'border-neon-cyan/20 bg-neon-cyan/5',
  none: '',
};

export function DataCard({
  label,
  tooltip,
  value,
  icon,
  color = 'text-white',
  accent = 'none',
  delay = 0,
}: DataCardProps) {
  return (
    <motion.div
      className={cn('glass-card p-4 border', accentMap[accent])}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -2, borderColor: 'rgba(0, 245, 255, 0.2)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-cyber-800 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      <p className={cn('text-2xl font-bold font-mono tracking-tight', color)}>{value}</p>
    </motion.div>
  );
}
