// ============================================================
// TradeumDiary — Страница 404
// Минималистичная, в стиле приложения
// ============================================================

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        {/* Графический элемент */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-accent-green/5 rounded-full animate-glow-pulse" />
          <div className="absolute inset-4 bg-accent-green/10 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-gradient">404</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Страница не найдена</h1>
        <p className="text-text-muted mb-8 max-w-md mx-auto">
          Возможно, она была удалена или вы перешли по неверной ссылке.
          Вернитесь на главную и продолжите анализировать сделки.
        </p>

        <Link to="/">
          <Button variant="primary" size="lg">
            На главную
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}