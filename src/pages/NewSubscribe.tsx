import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AppProviders';
import { GlowButton } from '@/components/ui/GlowButton';
import { Icon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export function NewSubscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | null>(null);

  if (user?.subscription_tier === 'pro') return <Navigate to="/dashboard" replace />;

  const handlePlanClick = (planId: 'free' | 'pro') => {
    if (!user) {
      localStorage.setItem('selectedPlan', planId);
      navigate('/register');
      return;
    }

    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }

    setSelectedPlan(planId);
    setShowPeriodModal(true);
  };

  const handlePeriodSelect = (period: 'month' | 'year') => {
    localStorage.setItem('selectedPlan', selectedPlan || 'pro');
    localStorage.setItem('selectedPeriod', period);
    setShowPeriodModal(false);
    navigate('/payment');
  };

  const plans = [
    {
      id: 'free' as const,
      name: 'FREE',
      price: '0',
      period: 'навсегда',
      description: 'Для начинающих трейдеров',
      color: 'cyan' as const,
      popular: false,
      features: [
        { text: 'До 5 кошельков', included: true },
        { text: 'Последние 30 дней истории', included: true },
        { text: 'Базовая аналитика P&L', included: true },
        { text: 'Экспорт в CSV', included: true },
        { text: 'Ежедневные отчёты', included: true },
        { text: 'Приоритетная поддержка', included: false },
        { text: 'AI инсайты', included: false },
        { text: 'Безлимитная история', included: false },
      ],
      cta: user ? 'Перейти в дашборд' : 'Начать бесплатно',
      onClick: () => handlePlanClick('free'),
    },
    {
      id: 'pro' as const,
      name: 'PRO',
      price: '499',
      period: '₽ / месяц',
      description: 'Для профессиональных трейдеров',
      color: 'magenta' as const,
      popular: true,
      features: [
        { text: 'Безлимитные кошельки', included: true },
        { text: 'Полная история сделок', included: true },
        { text: 'Продвинутая аналитика', included: true },
        { text: 'AI торговые инсайты', included: true },
        { text: 'Экспорт в Excel, PDF, CSV', included: true },
        { text: 'Приоритетная поддержка 24/7', included: true },
        { text: 'Налоговые отчёты', included: true },
        { text: 'Кастомные дашборды', included: true },
      ],
      cta: user ? 'Оформить подписку' : 'Начать бесплатно',
      onClick: () => handlePlanClick('pro'),
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 relative overflow-hidden">
      {/* Фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-950 via-cyber-900 to-cyber-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-neon-magenta/10 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-magenta/10 border border-neon-magenta/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
            <span className="text-xs font-semibold text-neon-magenta uppercase tracking-wider">
              Инвестируйте в свой рост
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Выберите свой{' '}
            <span className="bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-yellow bg-clip-text text-transparent">
              уровень
            </span>
            <br />
            трейдинг-аналитики
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Начните с бесплатного тарифа и переходите на PRO когда будете готовы к профессиональным
            инструментам
          </p>
        </motion.div>

        {/* Тарифы */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={cn(
                'relative rounded-2xl border p-1 transition-all duration-300',
                plan.popular
                  ? 'bg-gradient-to-br from-neon-magenta/30 via-neon-cyan/20 to-neon-magenta/30 scale-105'
                  : 'bg-cyber-800/50 border-cyber-700/50'
              )}
            >
              {/* Для POPULAR плана - бейдж */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-neon-magenta to-neon-magenta-dim text-white text-xs font-bold uppercase tracking-wider">
                  Самый популярный
                </div>
              )}

              <div className="bg-cyber-900/95 backdrop-blur-xl rounded-xl p-6 h-full">
                {/* Название */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  {plan.popular && <Icon name="pro" size={24} className="text-neon-magenta" />}
                </div>

                {/* Цена */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white font-mono">{plan.price}</span>
                    <span className="text-text-muted">{plan.period}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-2">{plan.description}</p>
                </div>

                {/* Преимущества */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          feature.included
                            ? plan.color === 'magenta'
                              ? 'bg-neon-magenta/20 text-neon-magenta'
                              : 'bg-neon-cyan/20 text-neon-cyan'
                            : 'bg-cyber-800 text-cyber-600'
                        )}
                      >
                        {feature.included ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M3 6h6M6 3v6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          feature.included ? 'text-text-secondary' : 'text-cyber-600'
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Кнопка */}
                <GlowButton
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full"
                  onClick={plan.onClick}
                >
                  {plan.cta}
                </GlowButton>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Гарантии */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {(
            [
              { icon: 'shield' as const, title: 'Безопасно', desc: 'Ваши данные зашифрованы' },
              { icon: 'pro' as const, title: 'Поддержка 24/7', desc: 'Ответим в течение часа' },
              {
                icon: 'chart' as const,
                title: 'Отмена в любой момент',
                desc: 'Никаких долгосрочных обязательств',
              },
            ] as const
          ).map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl bg-cyber-800/30 border border-cyber-700/30"
            >
              <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                <Icon name={item.icon} size={18} className="text-neon-cyan" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* FAQ teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-text-muted">
            Есть вопросы?{' '}
            <Link to="/" className="text-neon-cyan font-medium hover:underline">
              Свяжитесь с нами
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Period Selection Modal */}
      <AnimatePresence>
        {showPeriodModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPeriodModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-md bg-cyber-900 border border-cyber-700 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Выберите период</h3>
                  <button
                    onClick={() => setShowPeriodModal(false)}
                    className="p-2 rounded-lg hover:bg-cyber-800 transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <Icon name="close" size={20} className="text-text-muted" />
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handlePeriodSelect('month')}
                    className="w-full p-4 rounded-xl bg-cyber-800/80 border-2 border-cyber-600 hover:border-neon-cyan/70 hover:bg-cyber-800 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Ежемесячно</p>
                        <p className="text-sm text-text-muted">499 ₽ / месяц</p>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-cyber-500 group-hover:border-neon-cyan flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handlePeriodSelect('year')}
                    className="w-full p-4 rounded-xl bg-gradient-to-r from-neon-magenta/20 to-neon-cyan/20 border-2 border-neon-magenta/50 hover:border-neon-magenta/70 transition-all text-left group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-neon-magenta/30 text-neon-magenta text-[10px] font-bold uppercase">
                      Экономия 20%
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <p className="font-semibold text-white">Ежегодно</p>
                        <p className="text-sm text-text-muted">
                          <span className="line-through text-cyber-500 mr-1">5 988 ₽</span>
                          <span className="text-neon-cyan font-semibold">4 790 ₽ / год</span>
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-neon-magenta/70 group-hover:border-neon-magenta flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-neon-magenta opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>
                </div>

                <p className="text-xs text-text-muted text-center mt-4">
                  Можно отменить в любой момент. Без скрытых платежей.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
