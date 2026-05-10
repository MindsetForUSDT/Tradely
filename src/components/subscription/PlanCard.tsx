import { Card } from '@/components/ui/Card';
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
      {isPopular && (
        <div className="absolute -inset-px bg-gradient-to-b from-accent-green/30 via-accent-green/5 to-transparent rounded-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
      )}
      <Card
        variant="glass"
        padding="lg"
        className={cn('h-full flex flex-col relative', isPopular && 'border-accent-green/20')}
      >
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-4 py-1.5 rounded-full bg-accent-green text-surface text-xs font-semibold">
              Популярный выбор
            </span>
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        <div className="mb-6">
          <span className="text-4xl font-extrabold">{price}</span>
          <span className="text-sm text-text-muted ml-1">{period}</span>
        </div>
        <ul className="space-y-3 mb-8 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={cn(
                  'text-lg mt-0.5',
                  f.included ? 'text-accent-green' : 'text-text-muted'
                )}
              >
                {f.included ? '✓' : '✗'}
              </span>
              <span className={cn('text-sm', f.included ? 'text-text-primary' : 'text-text-muted')}>
                {f.text}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto">{action}</div>
      </Card>
    </div>
  );
}
