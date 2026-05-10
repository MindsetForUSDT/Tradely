import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import type { ReactNode } from 'react';

interface DashboardShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function DashboardShell({ children, title, subtitle, actions }: DashboardShellProps) {
  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInUp} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">{title}</h1>
          {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </motion.div>
      {children}
    </motion.div>
  );
}
