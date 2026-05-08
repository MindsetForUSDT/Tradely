import { useAIInsights } from '@/hooks/useAIInsights';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function AIInsights() {
  const insights = useAIInsights(90);

  if (!insights.length) {
    return (
      <Card padding="md">
        <h3 className="text-sm font-semibold mb-2">🤖 AI-Инсайты</h3>
        <p className="text-sm text-text-muted">
          Недостаточно данных для анализа. Нужно минимум 5 сделок.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-4">🤖 AI-Инсайты</h3>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={cn(
              'p-3 rounded-xl text-sm leading-relaxed',
              insight.type === 'warning'
                ? 'bg-accent-red/5 border border-accent-red/20 text-accent-red'
                : insight.type === 'success'
                  ? 'bg-accent-green/5 border border-accent-green/20 text-accent-green'
                  : 'bg-surface-overlay border border-surface-border text-text-secondary'
            )}
          >
            <span className="mr-2">
              {insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : 'ℹ️'}
            </span>
            {insight.message}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-muted mt-4">
        Инсайты основаны на локальном анализе ваших сделок. Данные не покидают ваш браузер.
      </p>
    </Card>
  );
}
