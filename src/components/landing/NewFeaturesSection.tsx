import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: 'wallet' as const,
    title: 'Подключение кошелька',
    desc: 'Добавьте любой EVM или Solana кошелек и получите полную историю всех ваших сделок автоматически.',
    color: 'cyan' as const,
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400&h=300&fit=crop',
  },
  {
    icon: 'chart' as const,
    title: 'Глубокая аналитика',
    desc: 'P&L в реальном времени, equity curve, распределение прибыли по дням, анализ торговых стратегий.',
    color: 'magenta' as const,
    image: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?w=400&h=300&fit=crop',
  },
  {
    icon: 'trades' as const,
    title: 'Автоматический импорт',
    desc: 'Система сама загрузит все сделки из блокчейна. Никакого ручного ввода — только точные данные.',
    color: 'green' as const,
    image: 'https://images.unsplash.com/photo-1642132652075-6fe3f9071295?w=400&h=300&fit=crop',
  },
  {
    icon: 'journal' as const,
    title: 'Торговый журнал',
    desc: 'Добавляйте заметки к сделкам, тегируйте стратегии, анализируйте свои ошибки и успехи.',
    color: 'yellow' as const,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
  },
  {
    icon: 'export-csv' as const,
    title: 'Экспорт отчётов',
    desc: 'Выгружайте данные в CSV, Excel или PDF. Готовые отчёты для налоговой и личного аудита.',
    color: 'cyan' as const,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
  },
  {
    icon: 'shield' as const,
    title: 'Безопасность',
    desc: 'Чтение только публичных данных. Никаких приватных ключей. Ваши данные шифруются.',
    color: 'magenta' as const,
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop',
  },
];

const colorMap: Record<string, string> = {
  cyan: 'from-neon-cyan/20 to-neon-cyan/5 border-neon-cyan/30 text-neon-cyan',
  magenta: 'from-neon-magenta/20 to-neon-magenta/5 border-neon-magenta/30 text-neon-magenta',
  green: 'from-neon-green/20 to-neon-green/5 border-neon-green/30 text-neon-green',
  yellow: 'from-neon-yellow/20 to-neon-yellow/5 border-neon-yellow/30 text-neon-yellow',
};

export function NewFeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 px-4 relative overflow-hidden">
      {/* Фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-950 via-cyber-900 to-cyber-950" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            <span className="text-xs font-semibold text-neon-cyan uppercase tracking-wider">
              Все инструменты в одном месте
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Всё, что нужно{' '}
            <span className="bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-yellow bg-clip-text text-transparent">
              современному
            </span>
            <br />
            трейдеру
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            От автоматического импорта сделок до продвинутой аналитики. Один инструмент для полного
            цикла торговли.
          </p>
        </motion.div>

        {/* Сетка фич */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div
                className={cn(
                  'relative h-full rounded-2xl border bg-gradient-to-br p-6 transition-all duration-500',
                  'hover:scale-[1.02] hover:shadow-2xl',
                  colorMap[feature.color]
                )}
              >
                {/* Градиентный фон при наведении */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Иконка */}
                <div className="relative z-10 w-12 h-12 rounded-xl bg-cyber-950/50 border border-current/20 flex items-center justify-center mb-4">
                  <Icon name={feature.icon} size={24} />
                </div>

                {/* Контент */}
                <h3 className="relative z-10 text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="relative z-10 text-sm text-text-secondary leading-relaxed">
                  {feature.desc}
                </p>

                {/* Изображение */}
                <div className="relative z-10 mt-4 rounded-lg overflow-hidden h-32 opacity-80 group-hover:opacity-100 transition-opacity">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-text-secondary mb-6">Попробуйте бесплатно и убедитесь сами</p>
          <button
            onClick={() =>
              document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyan-dim text-cyber-950 font-bold hover:scale-105 transition-transform"
          >
            <Icon name="wallet-add" size={20} />
            Начать сейчас
          </button>
        </motion.div>
      </div>
    </section>
  );
}
