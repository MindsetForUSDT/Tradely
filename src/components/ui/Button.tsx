import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  primary:
    'bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-hud-strong',
  secondary:
    'bg-surface-overlay border border-surface-border text-text-secondary hover:border-neon-cyan/30 hover:text-neon-cyan hover:shadow-hud',
  outline:
    'bg-transparent border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan/50',
  ghost: 'bg-transparent text-text-secondary hover:text-neon-cyan hover:bg-surface-overlay/50',
  danger:
    'bg-neon-red/10 border border-neon-red/30 text-neon-red hover:bg-neon-red/20 hover:border-neon-red/50',
};

const sizeMap: Record<ButtonSize, string> = {
  sm: 'text-[10px] px-3 py-1.5 gap-1.5 rounded',
  md: 'text-xs px-5 py-2.5 gap-2 rounded',
  lg: 'text-sm px-8 py-3.5 gap-2.5 rounded',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono uppercase tracking-wider transition-all duration-200',
          'focus-visible:outline-2 focus-visible:outline-neon-cyan',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'active:scale-[0.98] hover:scale-[1.02]',
          variantMap[variant],
          sizeMap[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
