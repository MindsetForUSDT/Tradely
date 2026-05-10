import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const paddingMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, padding = 'md', interactive = false, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn('glass-card', paddingMap[padding], onClick && 'cursor-pointer', className)}
        whileHover={interactive ? { scale: 1.01, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
