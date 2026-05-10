import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  title?: string;
  subtitle?: string;
}

export function Section({ children, className = '', id, title, subtitle }: SectionProps) {
  return (
    <motion.section
      id={id}
      className={`py-20 md:py-32 px-4 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="max-w-6xl mx-auto">
        {title && (
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
              {title}
            </h2>
            {subtitle && <p className="text-text-secondary max-w-xl mx-auto text-lg">{subtitle}</p>}
          </motion.div>
        )}
        {children}
      </div>
    </motion.section>
  );
}
