import { Link } from 'react-router-dom';
import { SlideIn } from '@/components/ui/SlideIn';
import { Icon } from '@/components/ui/Icons';
import { GlowButton } from '@/components/ui/GlowButton';
import { useAuth } from '@/hooks/useAuth';

const FEATURES = [
  {
    id: 'wallet-import',
    icon: 'wallet' as const,
    title: 'Подключение кошелька',
    shortDesc:
      'Добавьте любой EVM или Solana кошелек и получите полную историю всех ваших сделок автоматически.',
    description:
      'Поддержка Ethereum, BSC, Polygon, Arbitrum, Optimism, Base и Solana. Автоматический импорт всех транзакций из блокчейна без ручного ввода.',
    benefits: [
      { icon: 'shield' as const, text: 'Никаких приватных ключей — только публичные адреса' },
      { icon: 'chart' as const, text: 'Автоматический расчёт P&L по каждой сделке' },
      { icon: 'trades' as const, text: 'Поддержка DEX и CEX бирж' },
    ],
    color: '#6366f1',
  },
  {
    id: 'analytics',
    icon: 'chart' as const,
    title: 'Глубокая аналитика',
    shortDesc:
      'P&L в реальном времени, equity curve, распределение прибыли по дням, анализ торговых стратегий.',
    description:
      'Продвинутая аналитика включает кривую капитала, тепловую карту активности, анализ по дням недели и многое другое.',
    benefits: [
      { icon: 'chart' as const, text: 'Equity Curve с просадками в реальном времени' },
      { icon: 'trades' as const, text: 'Тепловая карта активности по дням и часам' },
      { icon: 'shield' as const, text: 'Sharpe Ratio, Win Rate, Max Drawdown' },
    ],
    color: '#10b981',
  },
  {
    id: 'journal',
    icon: 'journal' as const,
    title: 'Торговый журнал',
    shortDesc:
      'Добавляйте заметки к сделкам, тегируйте стратегии, анализируйте свои ошибки и успехи.',
    description:
      'Ведите детальный журнал каждой сделки. Добавляйте теги стратегий, эмоциональное состояние, скриншоты графиков.',
    benefits: [
      { icon: 'journal' as const, text: 'Тегирование стратегий и эмоций' },
      { icon: 'chart' as const, text: 'Анализ эффективности по стратегиям' },
      { icon: 'shield' as const, text: 'Поиск и фильтрация по любым параметрам' },
    ],
    color: '#ec4899',
  },
  {
    id: 'reports',
    icon: 'export-csv' as const,
    title: 'Экспорт отчётов',
    shortDesc:
      'Выгружайте данные в CSV, Excel или PDF. Готовые отчёты для налоговой и личного аудита.',
    description:
      'Формируйте налоговые отчёты за любой период. Экспортируйте в форматы CSV, Excel, PDF с полной детализацией.',
    benefits: [
      { icon: 'export-csv' as const, text: 'CSV, Excel, PDF экспорт' },
      { icon: 'chart' as const, text: 'Налоговые отчёты с расчётом налоговой базы' },
      { icon: 'shield' as const, text: 'Фильтрация по датам и типам сделок' },
    ],
    color: '#8b5cf6',
  },
  {
    id: 'security',
    icon: 'shield' as const,
    title: 'Безопасность',
    shortDesc: 'Чтение только публичных данных. Никаких приватных ключей. Ваши данные шифруются.',
    description:
      'Мы не запрашиваем приватные ключи. Все данные шифруются на стороне клиента. Ваши API ключи хранятся в зашифрованном виде.',
    benefits: [
      { icon: 'shield' as const, text: 'Zero-knowledge: мы не знаем ваши ключи' },
      { icon: 'chart' as const, text: 'AES-256 шифрование данных' },
      { icon: 'trades' as const, text: 'GDPR compliant — полное удаление данных' },
    ],
    color: '#06b6d4',
  },
  {
    id: 'ai-insights',
    icon: 'pro' as const,
    title: 'AI Инсайты',
    shortDesc: 'Искусственный интеллект анализирует ваши сделки и даёт персональные рекомендации.',
    description:
      'AI анализирует паттерны в вашей торговле, находит слабые места и предлагает конкретные шаги для улучшения результатов.',
    benefits: [
      { icon: 'chart' as const, text: 'Анализ паттернов прибыльных сделок' },
      { icon: 'trades' as const, text: 'Предупреждения о рискованных паттернах' },
      { icon: 'shield' as const, text: 'Персональные рекомендации по риск-менеджменту' },
    ],
    color: '#f59e0b',
  },
];

export function Features() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 relative overflow-hidden">
      {/* Фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-950 via-cyber-900 to-cyber-950" />
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-neon-magenta/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-8">
          <Link to="/" className="hover:text-neon-cyan transition-colors">
            Главная
          </Link>
          <span>/</span>
          <span className="text-text-secondary">Возможности</span>
        </nav>

        {/* Header */}
        <SlideIn direction="down" delay={0.1}>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                Всё для профессионального трейдинга
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Всё необходимое для{' '}
              <span className="bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-yellow bg-clip-text text-transparent">
                профессионального трейдинга
              </span>
            </h1>

            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              От автоматического импорта сделок до продвинутой аналитики. Один инструмент для
              полного цикла торговли.
            </p>
          </div>
        </SlideIn>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <SlideIn
              key={feature.id}
              direction={index % 2 === 0 ? 'left' : 'right'}
              delay={0.2 + index * 0.1}
            >
              <div className="relative h-full group">
                <div className="relative h-full rounded-2xl border border-cyber-700/50 bg-cyber-900/60 backdrop-blur-xl p-8 transition-all duration-300 hover:border-neon-cyan/30 hover:bg-cyber-800/80 hover:shadow-2xl hover:shadow-neon-cyan/5">
                  {/* Градиентное свечение при ховере */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at top right, ${feature.color}15, transparent 60%)`,
                    }}
                  />

                  <div className="relative z-10">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`,
                        border: `1px solid ${feature.color}30`,
                      }}
                    >
                      <Icon name={feature.icon} size={28} className="text-white" />
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                    <p className="text-text-secondary leading-relaxed text-sm mb-4">
                      {feature.shortDesc}
                    </p>

                    <ul className="space-y-2 mb-6">
                      {feature.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                          <Icon
                            name={b.icon}
                            size={14}
                            className="text-neon-cyan mt-0.5 shrink-0"
                          />
                          {b.text}
                        </li>
                      ))}
                    </ul>

                    <Link to={user ? '/dashboard' : '/register'}>
                      <GlowButton variant="outline" size="sm" className="w-full">
                        {user ? 'Попробовать' : 'Начать бесплатно'} →
                      </GlowButton>
                    </Link>
                  </div>
                </div>
              </div>
            </SlideIn>
          ))}
        </div>

        {/* CTA */}
        <SlideIn direction="up" delay={0.6}>
          <div className="text-center mt-16">
            <div className="inline-flex flex-col items-center gap-4">
              <p className="text-text-muted">Готовы начать?</p>
              <Link to={user ? '/dashboard' : '/register'}>
                <GlowButton size="lg">
                  <Icon name="wallet-add" size={20} />
                  {user ? 'Перейти в дашборд' : 'Начать бесплатно'}
                </GlowButton>
              </Link>
            </div>
          </div>
        </SlideIn>
      </div>
    </div>
  );
}
