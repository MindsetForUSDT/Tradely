import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GlowButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type GlowButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlowButtonVariant;
  size?: GlowButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  magnetic?: boolean;
}

const variantMap: Record<GlowButtonVariant, string> = {
  primary:
    'bg-accent-green text-black font-semibold shadow-glow-green hover:shadow-glow-green hover:bg-accent-green-dim',
  secondary:
    'bg-cyber-900 text-white border border-cyber-700 hover:border-neon-cyan/50 hover:shadow-hud',
  outline:
    'bg-transparent text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/10 hover:border-neon-cyan/50',
  ghost: 'bg-transparent text-text-secondary hover:text-white hover:bg-cyber-800',
};

const sizeMap: Record<GlowButtonSize, string> = {
  sm: 'text-xs px-4 py-2 rounded-lg gap-1.5',
  md: 'text-sm px-6 py-3 rounded-xl gap-2',
  lg: 'text-base px-8 py-4 rounded-xl gap-2.5',
};

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
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
      magnetic = false,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-300',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantMap[variant],
          sizeMap[size],
          className
        )}
        disabled={disabled || isLoading}
        whileHover={
          magnetic
            ? { scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 25 } }
            : { scale: 1.02 }
        }
        whileTap={{ scale: 0.97 }}
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
      </motion.button>
    );
  }
);

GlowButton.displayName = 'GlowButton';
