import { Card } from '@/components/ui/Card';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Icon } from '@/components/ui/Icons';

const features = [
  {
    icon: 'wallet' as const,
    title: 'Автоматический импорт',
    desc: 'Подключите кошелёк и система сама загрузит всю историю сделок из блокчейна.',
  },
  {
    icon: 'chart' as const,
    title: 'Глубокая аналитика',
    desc: 'Графики P&L, объёмы по токенам, прибыль по дням недели — всё в реальном времени.',
  },
  {
    icon: 'trades' as const,
    title: 'Дневная сводка',
    desc: 'Каждое утро получайте полный отчёт: P&L, win rate, лучшие и худшие сделки.',
  },
  {
    icon: 'journal' as const,
    title: 'Расчёт P&L',
    desc: 'Автоматический расчёт прибыли и убытка по каждой сделке и за период.',
  },
  {
    icon: 'export-csv' as const,
    title: 'Экспорт отчётов',
    desc: 'Выгружайте данные в CSV или PDF для налоговой или личного аудита.',
  },
  {
    icon: 'shield' as const,
    title: 'Безопасность данных',
    desc: 'Адреса кошельков шифруются. Данные доступны только вам. Никаких секретных ключей.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Всё, что нужно <span className="text-gradient">трейдеру</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Один инструмент для полного цикла: от импорта сделок до продвинутой аналитики.
          </p>
        </ScrollReveal>
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <Card interactive padding="lg" className="h-full">
                <div className="w-10 h-10 rounded-xl bg-accent-green/10 text-accent-green flex items-center justify-center mb-4">
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </Card>
            </ScrollReveal>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
