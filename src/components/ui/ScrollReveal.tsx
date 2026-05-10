import { motion, type Variants } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  once?: boolean;
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  once = true,
}: ScrollRevealProps) {
  const getOffset = () => {
    switch (direction) {
      case 'up':
        return { y: 24 };
      case 'down':
        return { y: -24 };
      case 'left':
        return { x: 24 };
      case 'right':
        return { x: -24 };
    }
  };

  const offset = getOffset();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...(offset as { x?: number; y?: number }),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
