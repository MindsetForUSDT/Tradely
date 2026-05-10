import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  glowColor?: 'green' | 'red' | 'purple' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const glowStyles = {
  green: 'shadow-glow-green hover:shadow-glow-green-strong',
  red: 'shadow-glow-red hover:shadow-glow-red',
  purple: 'shadow-glow-purple hover:shadow-glow-purple',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      glow = false,
      glowColor = 'none',
      padding = 'md',
      hover = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card transition-all duration-300',
          glow && glowStyles[glowColor],
          paddingStyles[padding],
          hover && 'card-hover',
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
