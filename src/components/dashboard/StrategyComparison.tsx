import { useEffect, useMemo, useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';
import { calculateProfitFactor, calculateExpectancy, calculateStreakAnalysis } from '@/lib/metrics';

export function StrategyComparison() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());

  const strategies = useMemo(() => {
    const tags = new Set<string>();
    trades.forEach((t) => {
      if (t.strategy_tag) tags.add(t.strategy_tag);
    });
    return Array.from(tags);
  }, [trades]);

  useEffect(() => {
    if (strategies.length) {
      setSelectedStrategies((current) =>
        current.size ? current : new Set(strategies.slice(0, 3))
      );
    }
  }, [strategies]);

  const strategyStats = useMemo(() => {
    return strategies
      .map((strategy) => {
        const sTrades = trades.filter((t) => t.strategy_tag === strategy);
        const winners = sTrades.filter((t) => (t.pnl_realized || 0) > 0);
        const totalPnl = sTrades.reduce((sum, trade) => sum + (trade.pnl_realized || 0), 0);
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
    <section className="strategy-compare">
      <header>
        <div>
          <span>Сетапы</span>
          <h2>Сравнение стратегий</h2>
        </div>
        <small>Выбрано: {selectedStrategies.size}</small>
      </header>
      <div className="strategy-compare-filters">
        {strategies.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStrategy(s)}
            className={selectedStrategies.has(s) ? 'active' : ''}
          >
            {s}
            <i />
          </button>
        ))}
        {strategies.length === 0 && (
          <p>Добавьте теги стратегий к сделкам, чтобы сравнить сетапы.</p>
        )}
      </div>
      {selectedStrategies.size > 0 && (
        <div className="strategy-compare-table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h.label}>
                    <span>
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
                  <tr key={s.strategy}>
                    <td>{s.strategy}</td>
                    <td>{s.trades}</td>
                    <td>{s.winRate.toFixed(1)}%</td>
                    <td className={s.totalPnl >= 0 ? 'positive' : 'negative'}>
                      {formatUSD(s.totalPnl)}
                    </td>
                    <td>{s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)}</td>
                    <td>{formatUSD(s.expectancy)}</td>
                    <td>{s.maxWinStreak}</td>
                    <td>{s.maxLossStreak}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {strategyStats.length > 0 && (
        <footer>
          <span>Лучший результат</span>
          <strong>{strategyStats[0].strategy}</strong>
          <small>
            {formatUSD(strategyStats[0].totalPnl)} · {strategyStats[0].winRate.toFixed(1)}% win rate
          </small>
        </footer>
      )}
    </section>
  );
}
