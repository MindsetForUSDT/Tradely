// ============================================================
// TradeumDiary — Страница выбора подписки
// Сравнение FREE и PRO с анимированными карточками
// ============================================================

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanCard } from '@/components/subscription/PlanCard';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Navigate } from 'react-router-dom';

export function Subscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Если уже PRO — в дашборд
  if (user?.subscription_tier === 'pro') {
    return <Navigate to="/dashboard" replace />;
  }

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-green/5 border border-accent-green/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-glow-pulse" />
            <span className="text-xs font-medium text-accent-green tracking-wide uppercase">
              Тарифы
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Выберите свой уровень
            <br />
            <span className="text-gradient">трейдинг-аналитики</span>
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto">
            Начните бесплатно или получите полный доступ к продвинутой аналитике,
            неограниченной истории и автоматическому расчёту P&L.
          </p>
        </motion.div>

        {/* Карточки тарифов */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto"
        >
          {/* FREE */}
          <motion.div variants={itemVariants}>
            <PlanCard
              title="FREE"
              price="0"
              period="навсегда"
              description="Базовые возможности для начинающих трейдеров"
              features={[
                { text: 'До 3 кошельков', included: true },
                { text: 'История за 7 дней', included: true },
                { text: 'Базовый график объёмов', included: true },
                { text: 'Дневная аналитика', included: false },
                { text: 'Расчёт P&L', included: false },
                { text: 'Неограниченная история', included: false },
                { text: 'Экспорт отчётов', included: false },
                { text: 'Приоритетная поддержка', included: false },
              ]}
              isPopular={false}
              action={
                user ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled
                  >
                    Текущий план
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    Начать бесплатно
                  </Button>
                )
              }
            />
          </motion.div>

          {/* PRO */}
          <motion.div variants={itemVariants}>
            <PlanCard
              title="PRO"
              price="500"
              period="₽ / месяц"
              description="Полный доступ для профессиональных трейдеров"
              features={[
                { text: 'Неограниченное число кошельков', included: true },
                { text: 'Полная история сделок', included: true },
                { text: 'Продвинутые графики', included: true },
                { text: 'Дневная аналитика', included: true },
                { text: 'Расчёт P&L в реальном времени', included: true },
                { text: 'Неограниченная история', included: true },
                { text: 'Экспорт CSV / PDF', included: true },
                { text: 'Приоритетная поддержка 24/7', included: true },
              ]}
              isPopular={true}
              action={
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(user ? '/payment' : '/auth')}
                >
                  {user ? 'Попробовать PRO' : 'Начать бесплатно'}
                </Button>
              }
            />
          </motion.div>
        </motion.div>

        {/* Гарантия */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-text-muted">
            🔒 Безопасная оплата через YooKassa. Отмена в любой момент.
          </p>
        </motion.div>
      </div>
    </div>
  );
}