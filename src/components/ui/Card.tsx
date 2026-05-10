import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', hover = false, interactive = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card',
          paddingMap[padding],
          (hover || interactive) &&
            'hover:border-accent-green/30 hover:shadow-glow-green transition-all duration-300 cursor-pointer',
          interactive && 'active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
