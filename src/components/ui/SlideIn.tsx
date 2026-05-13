// components/ui/SlideIn.tsx — Компонент анимации появления с боков при скролле
import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface SlideInProps {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
}

export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = 0.6,
  className = '',
  threshold = 0.1,
}: SlideInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  const getHiddenState = () => {
    const base: { opacity: number; x?: number; y?: number } = { opacity: 0 };
    switch (direction) {
      case 'left':
        return { ...base, x: -50 };
      case 'right':
        return { ...base, x: 50 };
      case 'up':
        return { ...base, y: 30 };
      case 'down':
        return { ...base, y: -30 };
      default:
        return base;
    }
  };

  const hiddenState = getHiddenState();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: hiddenState,
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            duration,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
