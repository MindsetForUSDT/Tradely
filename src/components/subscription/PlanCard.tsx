// ============================================================
// TradeumDiary — Карточка тарифа
// Анимированная, с подсветкой популярного плана
// ============================================================

import { cn } from '@/lib/utils';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  isPopular: boolean;
  action: React.ReactNode;
}

export function PlanCard({
  title,
  price,
  period,
  description,
  features,
  isPopular,
  action,
}: PlanCardProps) {
  return (
    <div className="relative group h-full">
      {/* Свечение для популярного плана */}
      {isPopular && (
        <div className="absolute -inset-px bg-gradient-to-b from-accent-green/30 via-accent-green/5 to-transparent rounded-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
      )}

      <div
        className={cn(
          'relative h-full glass-card p-6 md:p-8 flex flex-col',
          isPopular && 'border-accent-green/20'
        )}
      >
        {/* Бейдж "Популярный" */}
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-4 py-1.5 rounded-full bg-accent-green text-surface text-xs font-semibold tracking-wide">
              Популярный выбор
            </span>
          </div>
        )}

        {/* Заголовок */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>

        {/* Цена */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">{price}</span>
            <span className="text-sm text-text-muted">{period}</span>
          </div>
        </div>

        {/* Список возможностей */}
        <ul className="space-y-3 mb-8 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              {feature.included ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent-green shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-text-muted shrink-0 mt-0.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
              <span
                className={cn(
                  'text-sm',
                  feature.included ? 'text-text-primary' : 'text-text-muted'
                )}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Кнопка действия */}
        <div className="mt-auto">{action}</div>
      </div>
    </div>
  );
}