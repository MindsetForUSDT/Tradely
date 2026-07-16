import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { StrategyComparison } from '@/components/dashboard/StrategyComparison';
import { WeekdayPerformanceChart } from '@/components/dashboard/WeekdayPerformanceChart';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';

export function ProAnalytics() {
  const { subscriptionTier } = useAuth();
  const { trades, pnlData, isLoading } = useTradesOptimized({ limit: 5000, daysAgo: 90 });

  const metrics = useMemo(() => {
    const winners = trades.filter((trade) => (trade.pnl_realized || 0) > 0);
    const losers = trades.filter((trade) => (trade.pnl_realized || 0) < 0);
    const grossWin = winners.reduce((sum, trade) => sum + (trade.pnl_realized || 0), 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + (trade.pnl_realized || 0), 0));
    const totalPnl = grossWin - grossLoss;
    return {
      totalPnl,
      winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
      averageTrade: trades.length ? totalPnl / trades.length : 0,
    };
  }, [trades]);

  const weekdayPerformance = useMemo(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return days.map((day, dayIndex) => {
      const matching = trades.filter((trade) => {
        const index = new Date(trade.timestamp).getDay();
        return (index === 0 ? 6 : index - 1) === dayIndex;
      });
      return {
        day,
        profit: matching.reduce((sum, trade) => sum + (trade.pnl_realized || 0), 0),
        trades: matching.length,
      };
    });
  }, [trades]);

  if (subscriptionTier !== 'pro') {
    return (
      <section className="pro-v2-page">
        <header className="pro-v2-heading">
          <span>PRO-аналитика</span>
          <h1>Увидьте систему за отдельными сделками</h1>
          <p>Серии, слабые сетапы, поведение риска и устойчивость результата — в одном разборе.</p>
        </header>
        <div className="pro-v2-paywall">
          <div>
            <p>Доступно на PRO + AI</p>
            <h2>Расширьте дневник до аналитической системы</h2>
            <span>
              Платные функции открываются явно: базовый журнал остаётся доступным на Free.
            </span>
            <Link to="/subscribe">
              Сравнить тарифы <b>↗</b>
            </Link>
          </div>
          <div className="pro-v2-feature-grid">
            {[
              [
                '01',
                'Серии и перекосы',
                'Находите моменты, когда качество решений начинает снижаться.',
              ],
              [
                '02',
                'Слабые сетапы',
                'Сравнивайте ожидание, win rate и риск по торговым сценариям.',
              ],
              [
                '03',
                'Качество риска',
                'Отделяйте преимущество стратегии от случайного изменения размера позиции.',
              ],
              ['04', 'AI-контекст', 'Получайте разбор, основанный на сделках и ваших заметках.'],
            ].map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <Icon name="pro" size={18} />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) return <div className="workspace-loading">Собираем аналитику…</div>;

  if (!trades.length) {
    return (
      <section className="pro-v2-page">
        <header className="pro-v2-heading">
          <span>PRO-аналитика</span>
          <h1>Аналитика готова к вашим данным</h1>
          <p>PRO активирован. Подключите источник или импортируйте историю, чтобы начать расчёт.</p>
        </header>
        <div className="pro-v2-empty">
          <Icon name="chart" size={28} />
          <p>Минимум шума, никаких подставных цифр</p>
          <h2>Добавьте первые сделки</h2>
          <span>После синхронизации здесь появятся серии, сетапы и метрики риска.</span>
          <Link to="/dashboard/wallets">Подключить источник</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pro-v2-page">
      <header className="pro-v2-heading pro-v2-heading-row">
        <div>
          <span>PRO-аналитика · 90 дней</span>
          <h1>Картина вашей торговли</h1>
          <p>Метрики рассчитаны по {trades.length} реальным сделкам.</p>
        </div>
        <Link to="/dashboard/trades">Открыть сделки ↗</Link>
      </header>
      <div className="pro-v2-metrics">
        <article>
          <span>Чистый P&amp;L</span>
          <strong>{formatUSD(metrics.totalPnl)}</strong>
          <small>за выбранный период</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{metrics.winRate.toFixed(1)}%</strong>
          <small>прибыльных сделок</small>
        </article>
        <article>
          <span>Profit factor</span>
          <strong>
            {Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
          </strong>
          <small>отношение прибыли к убытку</small>
        </article>
        <article>
          <span>Средняя сделка</span>
          <strong>{formatUSD(metrics.averageTrade)}</strong>
          <small>на одну сделку</small>
        </article>
      </div>
      <div className="pro-v2-chart-grid">
        <PnLChart data={pnlData} />
        <EquityCurveChart data={pnlData} />
      </div>
      <div className="pro-v2-chart-grid">
        <WeekdayPerformanceChart data={weekdayPerformance} />
        <StrategyComparison />
      </div>
    </section>
  );
}
