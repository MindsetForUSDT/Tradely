import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  glowColor?: 'green' | 'red' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glow = false, glowColor = 'none', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('glass-card transition-all duration-300 ease-out', paddingStyles[padding], className)} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';