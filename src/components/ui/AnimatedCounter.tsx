import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({
  value,
  decimals = 2,
  duration = 800,
  className,
  formatter,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const animationFrame = useRef<number>(0);
  const mountedRef = useRef(true);
  const hiddenRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const handleVisibility = () => {
      hiddenRef.current = document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (prevValue.current === value) return;
    if (hiddenRef.current) {
      setDisplayValue(value);
      prevValue.current = value;
      return;
    }

    const startValue = prevValue.current;
    const diff = value - startValue;
    const startTime = performance.now();

    const animate = (now: number) => {
      if (!mountedRef.current) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * eased);
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [value, duration]);

  const formatted = formatter ? formatter(displayValue) : displayValue.toFixed(decimals);
  return <span className={cn('counter-value', className)}>{formatted}</span>;
}
