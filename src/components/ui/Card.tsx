// ============================================================
// TradeumDiary — Компонент карточки
// Glass-эффект, варианты с градиентной рамкой
// ============================================================

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Добавить эффект свечения при наведении */
  glow?: boolean;
  /** Цвет свечения */
  glowColor?: 'green' | 'red' | 'none';
  /** Отступы */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const glowStyles = {
  green: 'hover:shadow-glow-green hover:border-accent-green/30',
  red: 'hover:shadow-glow-red hover:border-accent-red/30',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { glow = false, glowColor = 'none', padding = 'md', className, children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card',
          'transition-all duration-300 ease-out',
          glow && glowStyles[glowColor],
          paddingStyles[padding],
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