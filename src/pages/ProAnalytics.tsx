import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { useTradesOptimized as useTrades } from '@/hooks/useTradesOptimized';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { VolumeByTokenChart } from '@/components/dashboard/VolumeByTokenChart';
import { WeekdayPerformanceChart } from '@/components/dashboard/WeekdayPerformanceChart';
import { formatUSD } from '@/lib/utils';

export function ProAnalytics() {
  const { pnlData, tokenVolumes, weekdayPerformance, totalVolume } = useTrades({
    limit: 500,
    daysAgo: 90,
  });
  const { analytics } = useAnalytics(90);

  const winRate =
    analytics.length > 0
      ? ((analytics.filter((a) => a.realized_pnl_usd > 0).length / analytics.length) * 100).toFixed(
          1
        )
      : '0';

  const bestDay =
    analytics.length > 0
      ? analytics.reduce((best, a) => (a.realized_pnl_usd > best.realized_pnl_usd ? a : best))
      : null;

  const worstDay =
    analytics.length > 0
      ? analytics.reduce((worst, a) => (a.realized_pnl_usd < worst.realized_pnl_usd ? a : worst))
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">PRO-аналитика</h1>
        <p className="text-text-muted text-sm">Расширенная статистика за 90 дней</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-accent-green' },
          { label: 'Общий объём', value: formatUSD(totalVolume), color: 'text-text-primary' },
          {
            label: 'Лучший день',
            value: bestDay ? formatUSD(bestDay.realized_pnl_usd) : '—',
            color: 'text-accent-green',
          },
          {
            label: 'Худший день',
            value: worstDay ? formatUSD(worstDay.realized_pnl_usd) : '—',
            color: 'text-accent-red',
          },
        ].map((m) => (
          <Card key={m.label} padding="md">
            <p className="text-xs text-text-muted mb-1">{m.label}</p>
            <p className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PnLChart data={pnlData} />
        <VolumeByTokenChart data={tokenVolumes} />
      </div>

      <WeekdayPerformanceChart data={weekdayPerformance} />

      <Card padding="md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Экспорт данных</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-xs rounded-lg bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors">
              CSV
            </button>
            <button className="px-4 py-2 text-xs rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors">
              PDF
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
