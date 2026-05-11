import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
  variant?: 'default' | 'glass' | 'elevated' | 'gradient';
  glowColor?: 'cyan' | 'magenta' | 'green' | 'yellow' | 'red';
  noPadding?: boolean;
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

const variantMap = {
  default: 'bg-cyber-800/60 border-cyber-700/50',
  glass: 'bg-cyber-800/40 backdrop-blur-xl border-cyber-700/30',
  elevated: 'bg-cyber-900/80 border-cyber-600/50 shadow-lg',
  gradient: 'bg-gradient-to-br from-cyber-800/80 to-cyber-900/80 border-cyber-700/50',
};

const glowMap = {
  cyan: 'hover:border-neon-cyan/40 hover:shadow-neon-cyan',
  magenta: 'hover:border-neon-magenta/40 hover:shadow-neon-magenta',
  green: 'hover:border-neon-green/40 hover:shadow-neon-green',
  yellow: 'hover:border-neon-yellow/40 hover:shadow-neon-yellow',
  red: 'hover:border-accent-red/40 hover:shadow-neon-red',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      hover = false,
      interactive = false,
      variant = 'default',
      glowColor = 'cyan',
      noPadding,
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
          'relative rounded-2xl border transition-all duration-300',
          variantMap[variant],
          noPadding ? 'p-0' : paddingMap[padding],
          (hover || interactive) && cn(glowMap[glowColor], 'cursor-pointer'),
          interactive && 'active:scale-[0.99]',
          'overflow-hidden',
          // Градиентная обводка при наведении
          hover && 'group',
          hover &&
            'before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:pointer-events-none',
          hover &&
            'before:bg-gradient-to-br before:from-neon-cyan/20 before:via-neon-magenta/20 before:to-neon-cyan/20',
          hover &&
            'before:opacity-0 group-hover:opacity-100 before:transition-opacity before:duration-300',
          // Внутренний градиент при наведении
          hover &&
            'after:absolute after:inset-0 after:bg-gradient-to-br after:from-neon-cyan/5 after:via-transparent after:to-neon-magenta/5',
          hover &&
            'after:opacity-0 group-hover:opacity-100 after:transition-opacity after:duration-300',
          className
        )}
        {...props}
      >
        {/* Фоновый градиент для variant=gradient */}
        {variant === 'gradient' && (
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-magenta/5 opacity-50" />
        )}

        {/* Контент поверх фона */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Подкомпоненты для удобства
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between px-1 py-2 mb-4',
        'border-b border-cyber-700/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold text-white', className)} {...props}>
      {children}
    </h3>
  )
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-1 py-2', className)} {...props}>
      {children}
    </div>
  )
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between px-1 py-2 mt-4',
        'border-t border-cyber-700/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
