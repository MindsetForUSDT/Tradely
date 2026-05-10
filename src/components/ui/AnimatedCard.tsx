import { motion, type Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { springHover } from '@/lib/animations';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  glow?: boolean;
  delay?: number;
  onClick?: () => void;
}

const paddingMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: delay * 0.08,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
};

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, padding = 'md', glow = false, delay = 0, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        custom={delay}
        className={cn(
          'glass-card',
          paddingMap[padding],
          glow && 'border-accent-green/30 shadow-glow-green hover:shadow-glow-green',
          onClick && 'cursor-pointer',
          className
        )}
        {...springHover}
        onClick={onClick}
        role="article"
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';
