import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({ value, decimals = 2, duration = 800, className, formatter }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const animationFrame = useRef<number>();

  useEffect(() => {
    if (prevValue.current === value) return;
    const startValue = prevValue.current;
    const diff = value - startValue;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * eased);
      if (progress < 1) animationFrame.current = requestAnimationFrame(animate);
      else prevValue.current = value;
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => { if (animationFrame.current) cancelAnimationFrame(animationFrame.current); };
  }, [value, duration]);

  const formatted = formatter ? formatter(displayValue) : displayValue.toFixed(decimals);

  return <span className={cn('counter-value', className)}>{formatted}</span>;
}