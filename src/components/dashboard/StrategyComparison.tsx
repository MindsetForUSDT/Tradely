import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';
import { calculateProfitFactor, calculateExpectancy, calculateStreakAnalysis } from '@/lib/metrics';
import { cn } from '@/lib/utils';

export function StrategyComparison() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());

  // Извлекаем уникальные стратегии из сделок
  const strategies = useMemo(() => {
    const tags = new Set<string>();
    trades.forEach((t: any) => {
      if (t.strategy_tag) tags.add(t.strategy_tag);
    });
    return Array.from(tags);
  }, [trades]);

  // Статистика по каждой стратегии
  const strategyStats = useMemo(() => {
    return strategies
      .map((strategy) => {
        const strategyTrades = trades.filter((t: any) => t.strategy_tag === strategy);
        const winners = strategyTrades.filter((t: any) => (t.pnl_realized || 0) > 0);
        const losers = strategyTrades.filter((t: any) => (t.pnl_realized || 0) < 0);
        const totalPnl = strategyTrades.reduce((s, t: any) => s + (t.pnl_realized || 0), 0);
        const winRate = strategyTrades.length ? (winners.length / strategyTrades.length) * 100 : 0;
        const profitFactor = calculateProfitFactor(strategyTrades);
        const expectancy = calculateExpectancy(strategyTrades);
        const { maxWinStreak, maxLossStreak } = calculateStreakAnalysis(strategyTrades);

        return {
          strategy,
          trades: strategyTrades.length,
          winRate,
          totalPnl,
          profitFactor,
          expectancy,
          maxWinStreak,
          maxLossStreak,
          avgVolume: strategyTrades.length
            ? strategyTrades.reduce((s, t: any) => s + (t.value_usd || 0), 0) /
              strategyTrades.length
            : 0,
        };
      })
      .sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades, strategies]);

  const toggleStrategy = (s: string) => {
    const next = new Set(selectedStrategies);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelectedStrategies(next);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Сравнение стратегий</h2>
        <p className="text-sm text-text-muted mt-1">Выберите стратегии для сравнения</p>
      </div>

      {/* Выбор стратегий */}
      <div className="flex flex-wrap gap-2">
        {strategies.map((s) => (
          <button
            key={s}
            onClick={() => toggleStrategy(s)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              selectedStrategies.has(s)
                ? 'bg-accent-green text-surface'
                : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
            )}
          >
            {s}
            {selectedStrategies.has(s) && ' ✓'}
          </button>
        ))}
        {strategies.length === 0 && (
          <p className="text-text-muted text-sm">
            Нет сделок с тегами стратегий. Добавьте теги в журнале.
          </p>
        )}
      </div>

      {/* Таблица сравнения */}
      {selectedStrategies.size > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-text-muted text-xs">
                <th className="text-left py-3 px-4">Стратегия</th>
                <th className="text-right py-3 px-4">Сделок</th>
                <th className="text-right py-3 px-4">Win Rate</th>
                <th className="text-right py-3 px-4">P&L</th>
                <th className="text-right py-3 px-4">Profit Factor</th>
                <th className="text-right py-3 px-4">Expectancy</th>
                <th className="text-right py-3 px-4">Max Win Streak</th>
                <th className="text-right py-3 px-4">Max Loss Streak</th>
              </tr>
            </thead>
            <tbody>
              {strategyStats
                .filter((s) => selectedStrategies.has(s.strategy))
                .map((s) => (
                  <tr
                    key={s.strategy}
                    className="border-b border-surface-border/30 hover:bg-surface-overlay"
                  >
                    <td className="py-3 px-4 font-medium">{s.strategy}</td>
                    <td className="text-right py-3 px-4">{s.trades}</td>
                    <td className="text-right py-3 px-4">{s.winRate.toFixed(1)}%</td>
                    <td
                      className={cn(
                        'text-right py-3 px-4 font-mono',
                        s.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                      )}
                    >
                      {formatUSD(s.totalPnl)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">{formatUSD(s.expectancy)}</td>
                    <td className="text-right py-3 px-4 text-accent-green">{s.maxWinStreak}</td>
                    <td className="text-right py-3 px-4 text-accent-red">{s.maxLossStreak}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Итоговая карточка лучшей стратегии */}
      {strategyStats.length > 0 && (
        <Card padding="md" className="max-w-md">
          <h3 className="text-sm font-semibold mb-2">🏆 Лучшая стратегия</h3>
          <p className="text-lg font-bold text-accent-green">{strategyStats[0].strategy}</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-text-muted">
            <span>
              P&L:{' '}
              <strong className="text-text-primary">{formatUSD(strategyStats[0].totalPnl)}</strong>
            </span>
            <span>
              Win Rate:{' '}
              <strong className="text-text-primary">{strategyStats[0].winRate.toFixed(1)}%</strong>
            </span>
            <span>
              Сделок: <strong className="text-text-primary">{strategyStats[0].trades}</strong>
            </span>
            <span>
              Profit Factor:{' '}
              <strong className="text-text-primary">
                {strategyStats[0].profitFactor.toFixed(2)}
              </strong>
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
