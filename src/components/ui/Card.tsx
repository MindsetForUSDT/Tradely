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
  default: 'bg-[#0d0f11] border-[#2b2d32]',
  glass: 'bg-[#0d0f11]/90 backdrop-blur-xl border-[#2b2d32]',
  elevated: 'bg-[#111316] border-[#34373c] shadow-lg shadow-black/30',
  gradient: 'bg-[#101215] border-[#303238]',
};

const glowMap = {
  cyan: 'hover:border-[#62656b]',
  magenta: 'hover:border-[#62656b]',
  green: 'hover:border-[#62656b]',
  yellow: 'hover:border-[#62656b]',
  red: 'hover:border-[#62656b]',
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
          'relative rounded-lg border transition-all duration-200',
          variantMap[variant],
          noPadding ? 'p-0' : paddingMap[padding],
          (hover || interactive) && cn(glowMap[glowColor], 'cursor-pointer'),
          interactive && 'active:scale-[0.99]',
          'overflow-hidden',
          hover && 'group',
          className
        )}
        {...props}
      >
        {/* Фоновый градиент для variant=gradient */}
        {variant === 'gradient' && <div className="absolute inset-0 bg-white/[0.01]" />}

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
