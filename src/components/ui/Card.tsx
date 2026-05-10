import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  glow?: boolean;
  glowColor?: 'green' | 'red' | 'purple' | 'blue';
  children: React.ReactNode;
}

const paddingMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantMap: Record<CardVariant, string> = {
  default:
    'bg-surface-elevated/60 backdrop-blur-xl border border-surface-border/50 rounded-2xl shadow-card',
  glass: 'bg-surface-elevated/40 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-card',
  accent:
    'bg-surface-elevated/60 backdrop-blur-xl border border-accent-green/20 rounded-2xl shadow-glow-green',
};

const glowMap: Record<string, string> = {
  green: 'shadow-glow-green hover:shadow-glow-green-strong',
  red: 'shadow-glow-red',
  purple: 'shadow-glow-purple',
  blue: 'shadow-glow-purple',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      glow = false,
      glowColor = 'green',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          variantMap[variant],
          paddingMap[padding],
          glow && glowMap[glowColor],
          'transition-colors duration-300',
          className
        )}
        whileHover={
          interactive
            ? {
                scale: 1.02,
                y: -2,
                borderColor: 'rgba(0, 255, 163, 0.3)',
                transition: { duration: 0.2, ease: 'easeOut' },
              }
            : undefined
        }
        whileTap={interactive ? { scale: 0.98, transition: { duration: 0.1 } } : undefined}
        style={{ willChange: interactive ? 'transform' : 'auto' }}
        role="article"
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
