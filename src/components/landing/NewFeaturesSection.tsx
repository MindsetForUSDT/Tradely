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
      ref={(el) => {}}
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

        {/* CTA - минималистичный */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-20"
        >
          <div className="inline-flex flex-col items-center gap-4">
            <p className="text-gray-400">Готовы начать?</p>
            <button
              onClick={() =>
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
            >
              <Icon name="wallet-add" size={20} />
              Начать бесплатно
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
