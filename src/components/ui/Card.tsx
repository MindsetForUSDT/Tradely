import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  padding?: CardPadding;
  glow?: 'cyan' | 'magenta' | 'green' | 'red' | 'none';
  interactive?: boolean;
  scanLine?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const paddingMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantMap: Record<CardVariant, string> = {
  default: 'bg-surface-overlay border border-surface-border',
  glass: 'bg-surface-overlay/60 backdrop-blur-xl border border-white/5',
  accent: 'bg-surface-overlay border border-neon-cyan/20 shadow-hud',
};

const glowMap: Record<string, string> = {
  cyan: 'border-neon-cyan/20 shadow-hud',
  magenta: 'border-neon-magenta/20 shadow-magenta',
  green: 'border-neon-green/20',
  red: 'border-neon-red/20',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = 'default',
      padding = 'md',
      glow = 'none',
      interactive = false,
      scanLine = false,
      onClick,
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'transition-all duration-300',
          variantMap[variant],
          paddingMap[padding],
          glow !== 'none' && glowMap[glow],
          scanLine && 'scan-line-overlay',
          onClick && 'cursor-pointer',
          className
        )}
        whileHover={
          interactive
            ? {
                borderColor: 'rgba(0, 245, 255, 0.4)',
                boxShadow: '0 0 0 1px rgba(0, 245, 255, 0.3), 0 0 30px rgba(0, 245, 255, 0.15)',
                y: -2,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        whileTap={interactive ? { scale: 0.99 } : undefined}
        onClick={onClick}
        role="article"
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
