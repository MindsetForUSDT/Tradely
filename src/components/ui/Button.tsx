import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  primary: 'hud-button-primary',
  secondary: 'hud-button',
  ghost:
    'bg-transparent text-text-secondary hover:text-neon-cyan hover:bg-surface-overlay/50 px-4 py-2 text-xs uppercase tracking-wider',
  danger:
    'bg-neon-red/10 border border-neon-red/30 text-neon-red hover:bg-neon-red/20 hover:border-neon-red/50 px-4 py-2 text-xs uppercase tracking-wider',
};

const sizeMap: Record<ButtonSize, string> = {
  sm: 'text-[10px] px-3 py-1.5 gap-1.5',
  md: 'text-xs px-5 py-2.5 gap-2',
  lg: 'text-sm px-8 py-3.5 gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading,
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
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono transition-all duration-200',
          'focus-visible:outline-2 focus-visible:outline-neon-cyan',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantMap[variant],
          sizeMap[size],
          className
        )}
        disabled={disabled || isLoading}
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
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
            {leftIcon} {children} {rightIcon}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
