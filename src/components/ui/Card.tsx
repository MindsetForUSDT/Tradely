import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'magenta' | 'green' | 'red' | 'none';
  interactive?: boolean;
  scanLine?: boolean;
}

const glowMap: Record<string, string> = {
  cyan: 'border-neon-cyan/20 shadow-hud',
  magenta: 'border-neon-magenta/20 shadow-magenta',
  green: 'border-neon-green/20',
  red: 'border-neon-red/20',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, glow = 'none', interactive = false, scanLine = false }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'terminal-card',
          glow !== 'none' && glowMap[glow],
          scanLine && 'scan-line-overlay',
          'transition-all duration-300',
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
        role="article"
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
