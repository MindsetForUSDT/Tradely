import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: 'wallet' as const,
    title: 'Подключение кошелька',
    desc: 'Добавьте любой EVM или Solana кошелек и получите полную историю всех ваших сделок автоматически.',
    color: '#6366f1',
  },
  {
    icon: 'chart' as const,
    title: 'Глубокая аналитика',
    desc: 'P&L в реальном времени, equity curve, распределение прибыли по дням, анализ торговых стратегий.',
    color: '#10b981',
  },
  {
    icon: 'trades' as const,
    title: 'Автоматический импорт',
    desc: 'Система сама загрузит все сделки из блокчейна. Никакого ручного ввода — только точные данные.',
    color: '#f59e0b',
  },
  {
    icon: 'journal' as const,
    title: 'Торговый журнал',
    desc: 'Добавляйте заметки к сделкам, тегируйте стратегии, анализируйте свои ошибки и успехи.',
    color: '#ec4899',
  },
  {
    icon: 'export-csv' as const,
    title: 'Экспорт отчётов',
    desc: 'Выгружайте данные в CSV, Excel или PDF. Готовые отчёты для налоговой и личного аудита.',
    color: '#8b5cf6',
  },
  {
    icon: 'shield' as const,
    title: 'Безопасность',
    desc: 'Чтение только публичных данных. Никаких приватных ключей. Ваши данные шифруются.',
    color: '#06b6d4',
  },
];

export function NewFeaturesSection() {
  return (
    <section
      id="features"
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ref={(_el) => {}}
      className="py-24 md:py-32 px-4 relative overflow-hidden bg-gradient-to-b from-[#0a0a0f] via-[#0f0f14] to-[#0a0a0f]"
    >
      {/* Декоративные градиентные пятна */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Всё необходимое для{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
              профессионального
            </span>
            <br />
            трейдинга
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            От автоматического импорта сделок до продвинутой аналитики. Один инструмент для полного
            цикла торговли.
          </p>
        </motion.div>

        {/* Сетка фич - минималистичный дизайн */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div
                className={cn(
                  'relative h-full rounded-2xl bg-white/5 border border-white/10 p-8',
                  'transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50'
                )}
              >
                {/* Градиентное свечение при наведении */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at top right, ${feature.color}15, transparent 60%)`,
                  }}
                />

                {/* Иконка с градиентом */}
                <div
                  className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`,
                    border: `1px solid ${feature.color}30`,
                  }}
                >
                  <Icon name={feature.icon} size={28} />
                </div>

                {/* Контент */}
                <h3 className="relative z-10 text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="relative z-10 text-gray-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20"
        >
          {/* Logos */}
          <div className="text-center mb-12">
            <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider">
              Поддерживаемые сети и биржи
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
              {['Ethereum', 'BSC', 'Polygon', 'Solana', 'Arbitrum', 'Base'].map((name) => (
                <span key={name} className="text-sm text-gray-400 font-mono">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {[
              {
                name: 'Алексей К.',
                role: 'Day Trader',
                text: 'Сократил время на анализ сделок на 80%. Теперь вижу все паттерны сразу.',
              },
              {
                name: 'Мария С.',
                role: 'Crypto Investor',
                text: 'Наконец-то поняла, почему убыточные сделки повторяются. AI инсайты — must have.',
              },
              {
                name: 'Дмитрий В.',
                role: 'Swing Trader',
                text: 'Налоговые отчёты за 2 минуты вместо 2 дней. Окупает Pro подписку с первого месяца.',
              },
            ].map((t, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-6 text-left">
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="text-center">
            <p className="text-3xl font-bold text-white font-mono">500+</p>
            <p className="text-sm text-gray-500">трейдеров доверяют нам каждый день</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
