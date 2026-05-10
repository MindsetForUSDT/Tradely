import type { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const springHover = {
  whileHover: {
    scale: 1.02,
    y: -4,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  whileTap: {
    scale: 0.98,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
};
