import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  Clock,
  Info,
  PlugsConnected,
  ShieldCheck,
  Sparkle,
  Target,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SourceLogo, resolveSourceBrand } from '@/components/brand/SourceLogo';
import { TradeDetailsPanel } from '@/components/dashboard/TradeDetailsPanel';
import { useAuth } from '@/hooks/useAuth';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useWallets } from '@/hooks/useWallets';
import {
  calculateTradeBreakdown,
  formatSignedUSD,
  numeric,
  parseTradeMeta,
} from '@/lib/tradeAnalytics';
import { formatUSD } from '@/lib/utils';
import type { Trade } from '@/types';

type RangeDays = 7 | 30 | 90;

const ranges: RangeDays[] = [7, 30, 90];
const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function readWalletBalance(settingsValue: unknown) {
  try {
    const settings = typeof settingsValue === 'string' ? JSON.parse(settingsValue) : settingsValue;
    if (!settings || typeof settings !== 'object') return { value: 0, available: false };
    if ('currentBalance' in settings) {
      return { value: numeric(settings.currentBalance), available: true };
    }
    if ('initialBalance' in settings) {
      return { value: numeric(settings.initialBalance), available: true };
    }
    return { value: 0, available: false };
  } catch {
    return { value: 0, available: false };
  }
}

function formatTradeDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function DashboardTooltip({
  active,
  payload,
  label,
  hasCapital,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  hasCapital: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="premium-chart-tooltip">
      <span>{label}</span>
      <strong>{formatSignedUSD(payload[0]?.value || 0)}</strong>
      <small>{hasCapital ? 'Капитал на эту дату' : 'Накопленный чистый P&L'}</small>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <article className="premium-metric">
      <span>
        {label} <Info size={13} />
      </span>
      <strong className={tone || ''}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function DashboardLayout() {
  const [range, setRange] = useState<RangeDays>(30);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const { user } = useAuth();
  const { wallets, isLoading: walletsLoading, error: walletsError } = useWallets();
  const {
    trades,
    isLoading: tradesLoading,
    error: tradesError,
    optimisticUpdate,
  } = useTradesOptimized({
    limit: 500,
    daysAgo: range,
  });

  const summary = useMemo(() => {
    const breakdowns = trades.map(calculateTradeBreakdown);
    const balanceState = wallets.reduce(
      (result, wallet) => {
        const walletBalance = readWalletBalance(wallet.settings);
        return {
          value: result.value + walletBalance.value,
          available: result.available || walletBalance.available,
        };
      },
      { value: 0, available: false }
    );

    let grossPnl = 0;
    let fees = 0;
    let adjustments = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    let peak = balanceState.available ? balanceState.value : 0;
    let equity = balanceState.available
      ? balanceState.value - breakdowns.reduce((sum, item) => sum + item.netPnl, 0)
      : 0;
    peak = equity;
    let maxDrawdownAmount = 0;

    const chronological = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const chartData = chronological.map((trade) => {
      const item = calculateTradeBreakdown(trade);
      equity += item.netPnl;
      peak = Math.max(peak, equity);
      maxDrawdownAmount = Math.max(maxDrawdownAmount, peak - equity);
      return {
        date: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(
          new Date(trade.timestamp)
        ),
        value: equity,
      };
    });

    breakdowns.forEach((item) => {
      grossPnl += item.grossPnl;
      fees += item.fees;
      adjustments += item.fundingAndAdjustments;
      if (item.netPnl > 0) {
        wins += 1;
        grossProfit += item.netPnl;
      } else if (item.netPnl < 0) {
        grossLoss += Math.abs(item.netPnl);
      }
    });

    const netPnl = breakdowns.reduce((sum, item) => sum + item.netPnl, 0);
    const openingCapital = balanceState.available ? balanceState.value - netPnl : 0;
    const maxDrawdownPercent = openingCapital > 0 ? (maxDrawdownAmount / openingCapital) * 100 : 0;

    const hourly = new Map<number, { pnl: number; count: number }>();
    const weekdays = new Map<number, { pnl: number; count: number }>();
    trades.forEach((trade) => {
      const pnl = calculateTradeBreakdown(trade).netPnl;
      const date = new Date(trade.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      const hourValue = hourly.get(hour) || { pnl: 0, count: 0 };
      const dayValue = weekdays.get(day) || { pnl: 0, count: 0 };
      hourValue.pnl += pnl;
      hourValue.count += 1;
      dayValue.pnl += pnl;
      dayValue.count += 1;
      hourly.set(hour, hourValue);
      weekdays.set(day, dayValue);
    });

    const bestHour = [...hourly.entries()]
      .filter(([, value]) => value.count >= 2)
      .sort((a, b) => b[1].pnl / b[1].count - a[1].pnl / a[1].count)[0];
    const weakestDay = [...weekdays.entries()]
      .filter(([, value]) => value.count >= 2)
      .sort((a, b) => a[1].pnl - b[1].pnl)[0];

    const contextCount = trades.filter((trade) => {
      const meta = parseTradeMeta(trade.raw_data);
      return Boolean(meta.notes || meta.strategy || meta.planScore !== undefined);
    }).length;

    let streak = 0;
    for (let index = chronological.length - 1; index >= 0; index -= 1) {
      const pnl = calculateTradeBreakdown(chronological[index]).netPnl;
      if (pnl >= 0) break;
      streak += 1;
    }

    return {
      capital: balanceState.value,
      hasCapital: balanceState.available,
      netPnl,
      grossPnl,
      fees,
      adjustments,
      pnlPercent: openingCapital > 0 ? (netPnl / openingCapital) * 100 : 0,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
      expectancy: trades.length ? netPnl / trades.length : 0,
      maxDrawdownAmount,
      maxDrawdownPercent,
      chartData,
      contextCount,
      contextCoverage: trades.length ? (contextCount / trades.length) * 100 : 0,
      bestHour,
      weakestDay,
      lossStreak: streak,
    };
  }, [trades, wallets]);

  const recentTrades = trades.slice(0, 6);
  const syncError = walletsError || tradesError;
  const firstName = (user?.username || 'Трейдер').trim().split(/\s+/)[0];
  const chartTone = '#cbb79f';

  const insights = [
    {
      icon: summary.fees > 0 ? WarningCircle : CheckCircle,
      title:
        summary.fees > 0 && Math.abs(summary.grossPnl) > 0
          ? `Комиссии: ${((summary.fees / Math.abs(summary.grossPnl)) * 100).toFixed(0)}% валового движения`
          : 'Комиссионная нагрузка пока не выявлена',
      copy: `${formatSignedUSD(-summary.fees)} комиссий · ${formatSignedUSD(summary.grossPnl)} валового P&L`,
      tone: summary.fees > Math.abs(summary.grossPnl) * 0.25 ? 'negative' : 'neutral',
    },
    {
      icon: Clock,
      title: summary.bestHour
        ? `Лучшее окно: ${String(summary.bestHour[0]).padStart(2, '0')}:00–${String(
            (summary.bestHour[0] + 1) % 24
          ).padStart(2, '0')}:00`
        : 'Нужно больше сделок для анализа времени',
      copy: summary.bestHour
        ? `${summary.bestHour[1].count} сделок · ${formatSignedUSD(summary.bestHour[1].pnl)}`
        : 'Минимум две сделки в одном часовом окне',
      tone: 'positive',
    },
    {
      icon: Target,
      title:
        summary.contextCoverage >= 70
          ? 'Контекст решений заполнен хорошо'
          : `Контекст есть у ${summary.contextCount} из ${trades.length} сделок`,
      copy: summary.weakestDay
        ? `Слабый день: ${weekdayNames[summary.weakestDay[0]]} · ${formatSignedUSD(summary.weakestDay[1].pnl)}`
        : 'Добавляйте сетап, ошибку и оценку плана',
      tone: summary.contextCoverage >= 70 ? 'positive' : 'neutral',
    },
  ] as const;

  return (
    <div className="premium-dashboard">
      <motion.header
        className="premium-dashboard-head"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1>Обзор</h1>
          <p>{firstName}, здесь результат отделён от комиссий, риска и качества решений.</p>
        </div>
        <div className="premium-range-control" aria-label="Период аналитики">
          {ranges.map((value) => (
            <button
              type="button"
              key={value}
              className={range === value ? 'active' : ''}
              onClick={() => setRange(value)}
            >
              {value}Д
            </button>
          ))}
          <span>
            <CalendarBlank size={17} />
          </span>
        </div>
      </motion.header>

      {syncError ? (
        <div className="premium-inline-alert">
          <WarningCircle size={17} />
          Часть данных временно недоступна. Показана последняя успешно загруженная версия.
        </div>
      ) : null}

      <section
        className={`premium-metric-rail ${tradesLoading || walletsLoading ? 'loading' : ''}`}
      >
        <Metric
          label="Капитал"
          value={summary.hasCapital ? formatUSD(summary.capital) : 'Нет данных'}
          detail="текущий equity"
        />
        <Metric
          label="Чистый P&L"
          value={formatSignedUSD(summary.netPnl)}
          detail={
            summary.hasCapital
              ? `${summary.pnlPercent >= 0 ? '+' : ''}${summary.pnlPercent.toFixed(2)}% за период`
              : 'за выбранный период'
          }
          tone={summary.netPnl >= 0 ? 'positive' : 'negative'}
        />
        <Metric
          label="Результат брутто"
          value={formatSignedUSD(summary.grossPnl)}
          detail="до комиссий и funding"
          tone={summary.grossPnl >= 0 ? 'positive' : 'negative'}
        />
        <Metric
          label="Комиссии"
          value={formatSignedUSD(-summary.fees)}
          detail="стоимость исполнений"
          tone={summary.fees > 0 ? 'negative' : undefined}
        />
        <Metric label="Сделки" value={String(trades.length)} detail="финальные записи" />
        <Metric
          label="Win rate"
          value={`${summary.winRate.toFixed(1)}%`}
          detail={`${trades.filter((trade) => numeric(trade.pnl_realized) > 0).length} прибыльных`}
        />
        <Metric
          label="Expectancy"
          value={formatSignedUSD(summary.expectancy)}
          detail="чистый результат / сделку"
          tone={summary.expectancy >= 0 ? 'positive' : 'negative'}
        />
        <Metric
          label="Макс. просадка"
          value={formatSignedUSD(-summary.maxDrawdownAmount)}
          detail={
            summary.hasCapital
              ? `${summary.maxDrawdownPercent.toFixed(2)}% от капитала`
              : 'по накопленному P&L'
          }
          tone={summary.maxDrawdownAmount > 0 ? 'negative' : undefined}
        />
        <Metric
          label="Дисциплина"
          value={`${summary.contextCoverage.toFixed(0)}%`}
          detail={`${summary.contextCount} сделок с контекстом`}
          tone={summary.contextCoverage >= 70 ? 'positive' : undefined}
        />
      </section>

      <motion.section
        className="premium-performance-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.04 }}
      >
        <div className="premium-hero-result">
          <span>
            Кривая капитала <Info size={14} />
          </span>
          <strong>
            {summary.hasCapital ? formatUSD(summary.capital) : formatSignedUSD(summary.netPnl)}
          </strong>
          <small className={summary.pnlPercent >= 0 ? 'positive' : 'negative'}>
            {summary.hasCapital
              ? `${formatSignedUSD(summary.netPnl)} · ${summary.pnlPercent >= 0 ? '+' : ''}${summary.pnlPercent.toFixed(2)}%`
              : 'Накопленный чистый P&L'}
          </small>
        </div>

        <div className="premium-hero-chart">
          {summary.chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={summary.chartData}
                margin={{ top: 18, right: 12, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="premiumEquityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTone} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={chartTone} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={34}
                  tick={{ fill: '#727780', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tick={{ fill: '#727780', fontSize: 10 }}
                  tickFormatter={(value: number) =>
                    `$${Intl.NumberFormat('en', { notation: 'compact' }).format(value)}`
                  }
                />
                <Tooltip
                  content={<DashboardTooltip hasCapital={summary.hasCapital} />}
                  cursor={{ stroke: '#8c929b', strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartTone}
                  strokeWidth={2}
                  fill="url(#premiumEquityFill)"
                  activeDot={{ r: 4, fill: chartTone, stroke: '#f5f5f2', strokeWidth: 2 }}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="premium-chart-empty">
              <Sparkle size={24} />
              <strong>Здесь появится ваша реальная кривая</strong>
              <span>Подключите Bybit — Tradeum импортирует только завершённые сделки.</span>
              <Link to="/dashboard/wallets">Подключить источник</Link>
            </div>
          )}
        </div>

        <dl className="premium-hero-breakdown">
          <div>
            <dt>Валовый результат</dt>
            <dd className={summary.grossPnl >= 0 ? 'positive' : 'negative'}>
              {formatSignedUSD(summary.grossPnl)}
            </dd>
          </div>
          <div>
            <dt>Комиссии</dt>
            <dd className="negative">{formatSignedUSD(-summary.fees)}</dd>
          </div>
          <div>
            <dt>Funding / корректировки</dt>
            <dd className={summary.adjustments >= 0 ? 'positive' : 'negative'}>
              {formatSignedUSD(summary.adjustments)}
            </dd>
          </div>
          <div>
            <dt>Текущий капитал</dt>
            <dd>{summary.hasCapital ? formatUSD(summary.capital) : 'Нет данных'}</dd>
          </div>
        </dl>
      </motion.section>

      <div className="premium-dashboard-grid">
        <section className="premium-trades-panel">
          <header>
            <div>
              <h2>Последние сделки</h2>
              <p>Net P&amp;L уже включает комиссии и биржевые корректировки.</p>
            </div>
            <Link to="/dashboard/trades">
              Смотреть все <CaretRight size={15} />
            </Link>
          </header>
          <div className="premium-trades-table">
            <div className="premium-trade-table-head">
              <span>Время</span>
              <span>Инструмент</span>
              <span>Позиция</span>
              <span>Вход</span>
              <span>Выход</span>
              <span>Net P&amp;L</span>
              <span />
            </div>
            {recentTrades.length ? (
              recentTrades.map((trade) => {
                const item = calculateTradeBreakdown(trade);
                return (
                  <button
                    type="button"
                    className="premium-trade-row"
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <span>{formatTradeDate(trade.timestamp)}</span>
                    <span>
                      <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={19} />
                      <strong>{trade.symbol}</strong>
                    </span>
                    <span className={item.direction}>
                      {item.direction === 'long' ? 'Long' : 'Short'}
                    </span>
                    <span>{formatUSD(item.entryPrice)}</span>
                    <span>{formatUSD(item.exitPrice)}</span>
                    <span className={item.netPnl >= 0 ? 'positive' : 'negative'}>
                      {formatSignedUSD(item.netPnl)}
                    </span>
                    <span>
                      <ArrowRight size={15} />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="premium-table-empty">
                <PlugsConnected size={22} />
                <strong>Сделок пока нет</strong>
                <span>Первая синхронизация заполнит таблицу автоматически.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="premium-insights-panel">
          <header>
            <div>
              <h2>Что требует внимания</h2>
              <p>Только выводы, которые можно подтвердить вашими данными.</p>
            </div>
            <Sparkle size={19} />
          </header>
          <div>
            {insights.map((insight) => {
              const InsightIcon = insight.icon;
              return (
                <article className={insight.tone} key={insight.title}>
                  <span>
                    <InsightIcon size={18} />
                  </span>
                  <div>
                    <strong>{insight.title}</strong>
                    <small>{insight.copy}</small>
                  </div>
                  <CaretRight size={15} />
                </article>
              );
            })}
          </div>
          {summary.lossStreak >= 2 ? (
            <Link to="/dashboard/risk">
              <ShieldCheck size={16} />
              Серия из {summary.lossStreak} убытков — проверьте дневной лимит
            </Link>
          ) : null}
        </aside>

        <aside className="premium-discipline-panel">
          <header>
            <div>
              <h2>Дисциплина</h2>
              <p>Контекст отличает удачу от повторяемого процесса.</p>
            </div>
            <Target size={20} />
          </header>
          <div className="premium-discipline-score">
            <strong>{summary.contextCoverage.toFixed(0)}%</strong>
            <span>
              <i style={{ width: `${summary.contextCoverage}%` }} />
            </span>
            <small>
              {summary.contextCount} из {trades.length} сделок имеют сетап, заметку или оценку плана
            </small>
          </div>
          <div className="premium-discipline-actions">
            <Link to="/dashboard/trades">
              <CheckCircle size={16} /> Добавить контекст
            </Link>
            <Link to="/goals">
              <Target size={16} /> Цели процесса
            </Link>
          </div>
        </aside>
      </div>

      <section className="premium-review-loop">
        <header>
          <span>Цикл улучшения</span>
          <h2>После сделки должно меняться правило, а не настроение</h2>
          <p>
            Tradeum отделяет результат от качества решения: сначала проверяет цифры, затем собирает
            контекст и только после достаточной выборки показывает паттерн.
          </p>
        </header>
        <div>
          {[
            ['01', 'Проверить данные', 'Вход, выход, размер, комиссии и net P&L.'],
            ['02', 'Добавить контекст', 'Сетап, ошибка, эмоция и соблюдение плана.'],
            ['03', 'Найти паттерн', 'Время, стратегия, серия, риск и стоимость ошибок.'],
            ['04', 'Изменить правило', 'Одна проверяемая корректировка в торговом плане.'],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedTrade ? (
          <>
            <motion.button
              type="button"
              className="premium-sheet-backdrop"
              aria-label="Закрыть детали сделки"
              onClick={() => setSelectedTrade(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <TradeDetailsPanel
              trade={selectedTrade}
              onClose={() => setSelectedTrade(null)}
              onTradeUpdate={(updatedTrade) => {
                optimisticUpdate(updatedTrade.id, updatedTrade);
                setSelectedTrade(updatedTrade);
              }}
            />
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
