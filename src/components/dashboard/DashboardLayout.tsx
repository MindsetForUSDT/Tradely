// ============================================================
// TradeumDiary — Основной Layout дашборда
// Композиция всех виджетов: статистика, графики, сделки
// ============================================================

import { useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { StatsOverview } from './StatsOverview';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { WeekdayPerformanceChart } from './WeekdayPerformanceChart';
import { TradeList } from './TradeList';
import { useTrades } from '@/hooks/useTrades';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStore } from '@/store/useStore';

// Компонент-обёртка для скролл-анимаций
function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardLayout() {
  const { trades, pnlData, tokenVolumes, weekdayPerformance, totalVolume, totalTrades, isLoading: tradesLoading } = useTrades({ limit: 100, daysAgo: 30 });
  const { todayAnalytics, isLoading: analyticsLoading } = useAnalytics();
  const setStats = useStore((s) => s.setStats);

  // Обновляем глобальное состояние статистики
  useEffect(() => {
    setStats({
      totalBalance: totalVolume,
      dailyPnl: todayAnalytics?.realized_pnl_usd ?? 0,
      dailyTrades: todayAnalytics?.total_trades ?? totalTrades,
      isLoading: tradesLoading || analyticsLoading,
    });
  }, [totalVolume, todayAnalytics, totalTrades, tradesLoading, analyticsLoading, setStats]);

  const isLoading = tradesLoading || analyticsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      {/* Верхняя панель статистики */}
      <AnimatedSection>
        <StatsOverview
          balance={totalVolume}
          pnl={todayAnalytics?.realized_pnl_usd ?? 0}
          trades={todayAnalytics?.total_trades ?? totalTrades}
          isLoading={isLoading}
        />
      </AnimatedSection>

      {/* Графики — сетка 2 колонки на десктопе */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedSection delay={0.1}>
          <PnLChart data={pnlData} isLoading={isLoading} />
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <VolumeByTokenChart data={tokenVolumes} isLoading={isLoading} />
        </AnimatedSection>
      </div>

      {/* График по дням недели + последние сделки */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedSection delay={0.3}>
          <WeekdayPerformanceChart data={weekdayPerformance} isLoading={isLoading} />
        </AnimatedSection>

        <AnimatedSection delay={0.4}>
          {/* Мини-список последних сделок */}
          <TradeList trades={trades.slice(0, 5)} isLoading={isLoading} compact />
        </AnimatedSection>
      </div>
    </div>
  );
}