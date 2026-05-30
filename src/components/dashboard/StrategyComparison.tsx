import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';
import { calculateProfitFactor, calculateExpectancy, calculateStreakAnalysis } from '@/lib/metrics';
import { cn } from '@/lib/utils';

export function StrategyComparison() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());

  const strategies = useMemo(() => {
    const tags = new Set<string>();
    trades.forEach((t: any) => {
      if (t.strategy_tag) tags.add(t.strategy_tag);
    });
    return Array.from(tags);
  }, [trades]);

  const strategyStats = useMemo(() => {
    return strategies
      .map((strategy) => {
        const sTrades = trades.filter((t: any) => t.strategy_tag === strategy);
        const winners = sTrades.filter((t: any) => (t.pnl_realized || 0) > 0);
        sTrades.filter((t: any) => (t.pnl_realized || 0) < 0);
        const totalPnl = sTrades.reduce((s, t: any) => s + (t.pnl_realized || 0), 0);
        const winRate = sTrades.length ? (winners.length / sTrades.length) * 100 : 0;
        const profitFactor = calculateProfitFactor(sTrades);
        const expectancy = calculateExpectancy(sTrades);
        const { maxWinStreak, maxLossStreak } = calculateStreakAnalysis(sTrades);
        return {
          strategy,
          trades: sTrades.length,
          winRate,
          totalPnl,
          profitFactor,
          expectancy,
          maxWinStreak,
          maxLossStreak,
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

  const headers = [
    { label: 'Стратегия', tooltip: 'Название стратегии из тегов сделок.' },
    { label: 'Сделок', tooltip: 'Количество сделок по этой стратегии.' },
    { label: 'Win Rate', tooltip: 'Процент прибыльных сделок.' },
    { label: 'P&L', tooltip: 'Суммарная прибыль/убыток.' },
    { label: 'Profit Factor', tooltip: 'Отношение прибыли к убыткам.' },
    { label: 'Expectancy', tooltip: 'Ожидаемая прибыль на сделку.' },
    { label: 'Max Win', tooltip: 'Максимальная серия прибыльных сделок.' },
    { label: 'Max Loss', tooltip: 'Максимальная серия убыточных сделок.' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold">Сравнение стратегий</h2>
        <p className="text-sm text-text-muted mt-1">Выберите стратегии для сравнения</p>
      </div>
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
          <p className="text-text-muted text-sm">Нет сделок с тегами стратегий.</p>
        )}
      </div>
      {selectedStrategies.size > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-text-muted text-xs">
                {headers.map((h) => (
                  <th key={h.label} className="text-right py-3 px-4">
                    <span className="flex items-center justify-end gap-0.5">
                      {h.label}
                      <Tooltip content={h.tooltip} />
                    </span>
                  </th>
                ))}
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
