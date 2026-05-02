import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Card } from '@/components/ui/Card';

const features = [
  {
    title: 'Автоматический импорт',
    description: 'Подключите кошелёк и система сама загрузит всю историю сделок из блокчейна.',
  },
  {
    title: 'Глубокая аналитика',
    description: 'Графики P&L, объёмы по токенам, прибыль по дням недели — всё в реальном времени.',
  },
  {
    title: 'Дневная сводка',
    description: 'Каждое утро получайте полный отчёт: P&L, win rate, лучшие и худшие сделки.',
  },
  {
    title: 'Расчёт P&L',
    description: 'Автоматический расчёт прибыли и убытка по каждой сделке и за период.',
  },
  {
    title: 'Экспорт отчётов',
    description: 'Выгружайте данные в CSV или PDF для налоговой или личного аудита.',
  },
  {
    title: 'Безопасность данных',
    description: 'Адреса кошельков шифруются. Данные доступны только вам.',
  },
];

export function FeaturesSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <section id="features" ref={ref} className="py-20 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Всё, что нужно <span className="text-gradient">трейдеру</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Один инструмент для полного цикла: от импорта сделок до продвинутой аналитики.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`scroll-reveal ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <Card padding="lg" className="h-full group">
                <div className="w-10 h-10 rounded-xl bg-accent-green/10 text-accent-green flex items-center justify-center mb-4 group-hover:bg-accent-green/20 transition-colors">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
