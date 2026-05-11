import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type GlowButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type GlowButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlowButtonVariant;
  size?: GlowButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glowColor?: 'cyan' | 'magenta' | 'green' | 'yellow';
}

const variantMap: Record<GlowButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-neon-cyan to-neon-cyan-dim text-cyber-950 font-bold shadow-glow-cyan hover:shadow-glow-cyan-lg',
  secondary:
    'bg-cyber-800 text-white border border-cyber-600 hover:border-neon-cyan/50 hover:bg-cyber-750',
  outline:
    'bg-transparent text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/10 hover:border-neon-cyan/70',
  ghost: 'bg-transparent text-text-secondary hover:text-white hover:bg-cyber-800/50',
  danger:
    'bg-gradient-to-r from-accent-red to-accent-red-dim text-white font-semibold shadow-glow-red',
};

const sizeMap: Record<GlowButtonSize, string> = {
  sm: 'text-xs px-4 py-2 rounded-xl gap-1.5',
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
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center font-semibold transition-all duration-300',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          'hover:scale-[1.02] active:scale-[0.98]',
          'overflow-hidden group',
          variantMap[variant],
          sizeMap[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Глич-эффект для primary variant */}
        {variant === 'primary' && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-neon-magenta/0 via-neon-magenta/20 to-neon-magenta/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/30 to-neon-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 delay-100" />
          </>
        )}

        {/* Блик при наведении */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
        </div>

        {/* Контент с тенью */}
        <span className="relative z-10 flex items-center gap-1.5">
          {isLoading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-30"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <>
              {leftIcon && (
                <span className="shrink-0 transition-transform group-hover:scale-110">
                  {leftIcon}
                </span>
              )}
              {children}
              {rightIcon && (
                <span className="shrink-0 transition-transform group-hover:translate-x-1">
                  {rightIcon}
                </span>
              )}
            </>
          )}
        </span>
      </button>
    );
  }
);

GlowButton.displayName = 'GlowButton';
