import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowClockwise,
  ArrowRight,
  CalendarBlank,
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Database,
  Info,
  PlugsConnected,
  ShieldCheck,
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
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useWallets, type Wallet } from '@/hooks/useWallets';
import { calculateTradeBreakdown, formatSignedUSD, parseTradeMeta } from '@/lib/tradeAnalytics';
import { formatUSD, formatUSDPrice } from '@/lib/utils';
import type { Trade } from '@/types';
import '@/styles/dashboard-product-v5.css';

type RangeDays = 7 | 30 | 90;

const ranges: RangeDays[] = [7, 30, 90];
const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const chartTone = '#829bff';

function readWalletBalance(settingsValue: unknown) {
  try {
    const settings = typeof settingsValue === 'string' ? JSON.parse(settingsValue) : settingsValue;
    if (!settings || typeof settings !== 'object') return { value: 0, available: false };
    if ('currentBalance' in settings) {
      const value = Number(settings.currentBalance);
      return { value: Number.isFinite(value) ? value : 0, available: Number.isFinite(value) };
    }
    if ('initialBalance' in settings) {
      const value = Number(settings.initialBalance);
      return { value: Number.isFinite(value) ? value : 0, available: Number.isFinite(value) };
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

function latestSyncTime(wallets: Wallet[]) {
  const timestamps = wallets
    .map((wallet) => wallet.last_synced_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : null;
}

function formatFreshness(timestamp: number | null, now: number) {
  if (!timestamp) return 'первый импорт ещё не завершён';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatNextSync(wallets: Wallet[], now: number) {
  if (wallets.some((wallet) => ['pending', 'processing'].includes(wallet.processing_status))) {
    return 'после текущего импорта';
  }
  const nextTimestamps = wallets
    .filter((wallet) => wallet.sync_state?.enabled !== false)
    .map((wallet) => wallet.sync_state?.next_sync_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  if (!nextTimestamps.length) return 'в ближайшее время';
  const minutes = Math.max(0, Math.ceil((Math.min(...nextTimestamps) - now) / 60_000));
  if (minutes < 1) return 'в ближайшую минуту';
  if (minutes < 60) return `через ${minutes} мин`;
  const hours = Math.ceil(minutes / 60);
  return `через ${hours} ч`;
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
    <div className="dashboard-v5-tooltip">
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
    <article className="dashboard-v5-metric">
      <span>
        {label} <Info size={13} />
      </span>
      <strong className={tone || ''}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-v5-loading" aria-label="Загрузка обзора">
      <section>
        <span />
        <span />
        <span />
      </section>
      <div>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [range, setRange] = useState<RangeDays>(30);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { wallets, isLoading: walletsLoading, error: walletsError, startSync } = useWallets();
  const {
    trades,
    isLoading: tradesLoading,
    error: tradesError,
    optimisticUpdate,
  } = useTradesOptimized({
    limit: 500,
    daysAgo: range,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

    const netPnl = breakdowns.reduce((sum, item) => sum + item.netPnl, 0);
    const openingCapital = balanceState.available ? balanceState.value - netPnl : 0;
    let equity = openingCapital;
    let peak = equity;
    let maxDrawdownAmount = 0;
    let grossPnl = 0;
    let fees = 0;
    let adjustments = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    const dailyEquity = new Map<string, { date: string; value: number }>();

    const chronological = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    chronological.forEach((trade) => {
      const item = calculateTradeBreakdown(trade);
      equity += item.netPnl;
      peak = Math.max(peak, equity);
      maxDrawdownAmount = Math.max(maxDrawdownAmount, peak - equity);
      const date = new Date(trade.timestamp);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      dailyEquity.set(key, {
        date: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date),
        value: equity,
      });
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

    const maxDrawdownPercent = openingCapital > 0 ? (maxDrawdownAmount / openingCapital) * 100 : 0;
    const hourly = new Map<number, { pnl: number; count: number }>();
    const weekdays = new Map<number, { pnl: number; count: number }>();
    trades.forEach((trade) => {
      const pnl = calculateTradeBreakdown(trade).netPnl;
      const date = new Date(trade.timestamp);
      const hourValue = hourly.get(date.getHours()) || { pnl: 0, count: 0 };
      const dayValue = weekdays.get(date.getDay()) || { pnl: 0, count: 0 };
      hourValue.pnl += pnl;
      hourValue.count += 1;
      dayValue.pnl += pnl;
      dayValue.count += 1;
      hourly.set(date.getHours(), hourValue);
      weekdays.set(date.getDay(), dayValue);
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

    let lossStreak = 0;
    for (let index = chronological.length - 1; index >= 0; index -= 1) {
      if (calculateTradeBreakdown(chronological[index]).netPnl >= 0) break;
      lossStreak += 1;
    }

    return {
      capital: balanceState.value,
      hasCapital: balanceState.available,
      netPnl,
      grossPnl,
      fees,
      adjustments,
      feeShare: Math.abs(grossPnl) > 0 ? (fees / Math.abs(grossPnl)) * 100 : 0,
      pnlPercent: openingCapital > 0 ? (netPnl / openingCapital) * 100 : 0,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      wins,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
      expectancy: trades.length ? netPnl / trades.length : 0,
      maxDrawdownAmount,
      maxDrawdownPercent,
      chartData: [...dailyEquity.values()],
      contextCount,
      contextCoverage: trades.length ? (contextCount / trades.length) * 100 : 0,
      bestHour,
      weakestDay,
      lossStreak,
    };
  }, [trades, wallets]);

  const mainInsight = useMemo(() => {
    const confidence = trades.length >= 30 ? 'высокая' : trades.length >= 10 ? 'средняя' : 'ранняя';
    if (summary.fees > 0 && summary.feeShare >= 20) {
      return {
        title: `Комиссии забрали ${summary.feeShare.toFixed(0)}% валового результата`,
        copy: `${formatSignedUSD(-summary.fees)} комиссий при ${formatSignedUSD(summary.grossPnl)} валового P&L. Проверьте частоту входов и средний размер позиции.`,
        measure: Math.min(100, summary.feeShare),
        measureLabel: 'Доля комиссий',
        measureValue: `${summary.feeShare.toFixed(0)}%`,
        confidence,
        tone: 'negative',
      };
    }
    if (summary.weakestDay && summary.weakestDay[1].pnl < 0) {
      return {
        title: `${weekdayNames[summary.weakestDay[0]]} — самый убыточный день выборки`,
        copy: `${summary.weakestDay[1].count} закрытых сделок дали ${formatSignedUSD(summary.weakestDay[1].pnl)}. Откройте полный разбор, чтобы проверить часы и инструменты.`,
        measure: Math.min(100, (summary.weakestDay[1].count / trades.length) * 100),
        measureLabel: 'Доля выборки',
        measureValue: `${summary.weakestDay[1].count} сделок`,
        confidence,
        tone: 'negative',
      };
    }
    if (summary.lossStreak >= 2) {
      return {
        title: `Текущая серия — ${summary.lossStreak} убыточные сделки подряд`,
        copy: 'Это не доказывает поломку стратегии, но уже требует сверки дневного лимита и соблюдения торгового плана.',
        measure: Math.min(100, (summary.lossStreak / Math.max(1, trades.length)) * 100),
        measureLabel: 'Длина серии',
        measureValue: `${summary.lossStreak} сделки`,
        confidence,
        tone: 'negative',
      };
    }
    if (summary.contextCoverage < 70) {
      return {
        title: `Контекст заполнен у ${summary.contextCount} из ${trades.length} сделок`,
        copy: 'Цифры уже надёжны, но без сетапа, эмоции и оценки плана Tradeum не сможет отличить ошибку процесса от обычной дисперсии.',
        measure: summary.contextCoverage,
        measureLabel: 'Покрытие контекстом',
        measureValue: `${summary.contextCoverage.toFixed(0)}%`,
        confidence,
        tone: 'neutral',
      };
    }
    if (summary.bestHour) {
      const hour = String(summary.bestHour[0]).padStart(2, '0');
      const nextHour = String((summary.bestHour[0] + 1) % 24).padStart(2, '0');
      return {
        title: `Лучшее подтверждённое окно — ${hour}:00–${nextHour}:00`,
        copy: `${summary.bestHour[1].count} сделок дали ${formatSignedUSD(summary.bestHour[1].pnl)}. Сравните результат с остальными часами перед изменением торгового плана.`,
        measure: Math.min(100, (summary.bestHour[1].count / trades.length) * 100),
        measureLabel: 'Доля выборки',
        measureValue: `${summary.bestHour[1].count} сделок`,
        confidence,
        tone: 'positive',
      };
    }
    return {
      title: 'Выборка пока формируется',
      copy: 'Tradeum не будет придумывать вывод по нескольким сделкам. После следующей синхронизации проверка обновится автоматически.',
      measure: Math.min(100, (trades.length / 10) * 100),
      measureLabel: 'До первой устойчивой выборки',
      measureValue: `${trades.length} / 10`,
      confidence,
      tone: 'neutral',
    };
  }, [summary, trades.length]);

  const recentTrades = trades.slice(0, 5);
  const latestSync = latestSyncTime(wallets);
  const activeSync = wallets.some((wallet) =>
    ['pending', 'processing'].includes(wallet.processing_status)
  );
  const failedWallet = wallets.find((wallet) => wallet.processing_status === 'failed');
  const primaryWallet = failedWallet || wallets[0];
  const syncTone = !wallets.length
    ? 'empty'
    : activeSync
      ? 'processing'
      : failedWallet
        ? 'failed'
        : 'ready';
  const syncTitle = !wallets.length
    ? 'Автосинхронизация ждёт источник'
    : activeSync
      ? 'Синхронизация выполняется'
      : failedWallet
        ? 'Последняя попытка завершилась с ошибкой'
        : 'Автосинхронизация активна';
  const syncCopy = !wallets.length
    ? 'Подключите Bybit один раз — следующие импорты запустятся без кнопки.'
    : activeSync
      ? 'Получаем и нормализуем закрытые сделки. Экран обновится сам.'
      : failedWallet
        ? 'Последний успешный снимок сохранён; нулевые значения не подставляются.'
        : 'Tradeum проверяет источник в фоне и сохраняет только завершённые сделки.';
  const syncError = walletsError || tradesError;
  const initialLoading = walletsLoading && !wallets.length;
  const dataLoading = tradesLoading && !trades.length;

  return (
    <div className="dashboard-v5">
      <motion.header
        className="dashboard-v5-head"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1>Обзор</h1>
          <p>Чистый результат, стоимость торговли и главное отклонение периода.</p>
        </div>
        <div className="dashboard-v5-range" aria-label="Период аналитики">
          {ranges.map((value) => (
            <button
              type="button"
              key={value}
              className={range === value ? 'active' : ''}
              onClick={() => setRange(value)}
            >
              {value} дней
            </button>
          ))}
          <span>
            <CalendarBlank size={17} />
          </span>
        </div>
      </motion.header>

      <section className={`dashboard-v5-sync ${syncTone}`} aria-live="polite">
        <div className="dashboard-v5-sync-state">
          <span>
            {activeSync ? (
              <ArrowClockwise size={17} className="spin" />
            ) : failedWallet ? (
              <WarningCircle size={17} />
            ) : wallets.length ? (
              <CheckCircle size={17} weight="fill" />
            ) : (
              <PlugsConnected size={17} />
            )}
          </span>
          <div>
            <strong>{syncTitle}</strong>
            <small>{syncCopy}</small>
          </div>
        </div>
        {wallets.length ? (
          <dl>
            <div>
              <dt>Обновлено</dt>
              <dd>{formatFreshness(latestSync, now)}</dd>
            </div>
            <div>
              <dt>Следующая</dt>
              <dd>{formatNextSync(wallets, now)}</dd>
            </div>
          </dl>
        ) : null}
        {primaryWallet ? (
          <button
            type="button"
            onClick={() => void startSync(primaryWallet.id)}
            disabled={activeSync}
          >
            <ArrowClockwise size={16} />
            {failedWallet ? 'Повторить' : activeSync ? 'Обновляем' : 'Обновить сейчас'}
          </button>
        ) : (
          <Link to="/dashboard/wallets">
            Подключить Bybit <ArrowRight size={15} />
          </Link>
        )}
      </section>

      {syncError ? (
        <div className="dashboard-v5-alert">
          <WarningCircle size={17} />
          <span>
            <strong>Свежие данные временно недоступны.</strong>
            Показан последний успешно загруженный результат.
          </span>
        </div>
      ) : null}

      {initialLoading ? <DashboardLoading /> : null}

      {!initialLoading && !wallets.length ? (
        <section className="dashboard-v5-onboarding">
          <div>
            <span>
              <Database size={22} />
            </span>
            <h2>Первый отчёт появится без ручного журнала</h2>
            <p>
              Подключите read-only ключ Bybit. Tradeum сам запустит импорт, соберёт исполнения в
              закрытые сделки и пересчитает аналитику.
            </p>
            <Link to="/dashboard/wallets">
              Подключить Bybit <ArrowRight size={16} />
            </Link>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Проверка доступа</strong>
                <small>Ключ без торговли и вывода средств</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Автоматический импорт</strong>
                <small>Закрытые Spot и Linear сделки без дублей</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Первый диагноз</strong>
                <small>P&L, комиссии, риск и подтверждённый вывод</small>
              </div>
            </li>
          </ol>
        </section>
      ) : null}

      {!initialLoading && wallets.length && dataLoading ? <DashboardLoading /> : null}

      {!initialLoading && wallets.length && !dataLoading && !trades.length ? (
        <section className={`dashboard-v5-import-state ${failedWallet ? 'failed' : ''}`}>
          <div>
            <span>
              {failedWallet ? (
                <WarningCircle size={24} />
              ) : (
                <ArrowClockwise size={24} className={activeSync ? 'spin' : ''} />
              )}
            </span>
            <div>
              <h2>{failedWallet ? 'Импорт требует внимания' : 'Готовим первый отчёт'}</h2>
              <p>
                {failedWallet
                  ? failedWallet.error_message || 'Bybit не завершил последний запрос.'
                  : activeSync
                    ? 'История загружается в фоне. Эту страницу можно не обновлять.'
                    : 'Источник подключён. Следующий фоновый цикл проверит новые закрытые сделки.'}
              </p>
            </div>
          </div>
          <ol>
            <li className={activeSync ? 'active' : ''}>
              <Database size={17} />
              <span>
                <strong>Получаем историю</strong>
                <small>Закрытые исполнения с выбранной даты</small>
              </span>
            </li>
            <li>
              <ShieldCheck size={17} />
              <span>
                <strong>Проверяем расчёты</strong>
                <small>Комиссии, funding и защита от дублей</small>
              </span>
            </li>
            <li>
              <ChartLineUp size={17} />
              <span>
                <strong>Строим аналитику</strong>
                <small>Экран заполнится после завершения цикла</small>
              </span>
            </li>
          </ol>
          {failedWallet ? (
            <button type="button" onClick={() => void startSync(failedWallet.id)}>
              Повторить импорт
            </button>
          ) : (
            <Link to="/dashboard/wallets">Открыть состояние источника</Link>
          )}
        </section>
      ) : null}

      {trades.length ? (
        <>
          <motion.section
            className="dashboard-v5-performance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38 }}
          >
            <div className="dashboard-v5-result">
              <span>
                Чистый результат <Info size={14} />
              </span>
              <strong className={summary.netPnl >= 0 ? 'positive' : 'negative'}>
                {formatSignedUSD(summary.netPnl)}
              </strong>
              <small className={summary.pnlPercent >= 0 ? 'positive' : 'negative'}>
                {summary.hasCapital
                  ? `${summary.pnlPercent >= 0 ? '+' : ''}${summary.pnlPercent.toFixed(2)}% за период`
                  : `за ${range} дней`}
              </small>
              <dl>
                <div>
                  <dt>Валовый P&amp;L</dt>
                  <dd className={summary.grossPnl >= 0 ? 'positive' : 'negative'}>
                    {formatSignedUSD(summary.grossPnl)}
                  </dd>
                </div>
                <div>
                  <dt>Комиссии</dt>
                  <dd className="negative">{formatSignedUSD(-summary.fees)}</dd>
                </div>
                <div>
                  <dt>Funding</dt>
                  <dd className={summary.adjustments >= 0 ? 'positive' : 'negative'}>
                    {formatSignedUSD(summary.adjustments)}
                  </dd>
                </div>
                <div>
                  <dt>Текущий капитал</dt>
                  <dd>{summary.hasCapital ? formatUSD(summary.capital) : 'Нет данных'}</dd>
                </div>
              </dl>
            </div>
            <div className="dashboard-v5-chart">
              <header>
                <div>
                  <h2>Кривая капитала</h2>
                  <p>
                    {summary.hasCapital
                      ? 'Текущий капитал с учётом чистого результата'
                      : 'Накопленный Net P&L без подмены отсутствующего капитала'}
                  </p>
                </div>
                <span>{summary.chartData.length} торговых дней</span>
              </header>
              <div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={summary.chartData}
                    margin={{ top: 18, right: 14, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashboardV5Equity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartTone} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={chartTone} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={34}
                      tick={{ fill: '#69707a', fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={58}
                      tick={{ fill: '#69707a', fontSize: 10 }}
                      tickFormatter={(value: number) =>
                        `$${Intl.NumberFormat('en', { notation: 'compact' }).format(value)}`
                      }
                    />
                    <Tooltip
                      content={<DashboardTooltip hasCapital={summary.hasCapital} />}
                      cursor={{ stroke: '#747c87', strokeDasharray: '3 3' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartTone}
                      strokeWidth={2}
                      fill="url(#dashboardV5Equity)"
                      activeDot={{ r: 4, fill: chartTone, stroke: '#eef0f5', strokeWidth: 2 }}
                      animationDuration={650}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.section>

          <section
            className={`dashboard-v5-metrics ${tradesLoading || walletsLoading ? 'loading' : ''}`}
            aria-label="Ключевые метрики периода"
          >
            <Metric
              label="Win rate"
              value={`${summary.winRate.toFixed(1)}%`}
              detail={`${summary.wins} из ${trades.length} прибыльных`}
            />
            <Metric
              label="Expectancy"
              value={formatSignedUSD(summary.expectancy)}
              detail="чистый результат / сделку"
              tone={summary.expectancy >= 0 ? 'positive' : 'negative'}
            />
            <Metric
              label="Profit factor"
              value={summary.profitFactor === Infinity ? '∞' : summary.profitFactor.toFixed(2)}
              detail="gross profit / gross loss"
              tone={summary.profitFactor >= 1 ? 'positive' : 'negative'}
            />
            <Metric
              label="Макс. просадка"
              value={
                summary.hasCapital
                  ? `-${summary.maxDrawdownPercent.toFixed(2)}%`
                  : formatSignedUSD(-summary.maxDrawdownAmount)
              }
              detail={
                summary.hasCapital
                  ? formatSignedUSD(-summary.maxDrawdownAmount)
                  : 'по накопленному P&L'
              }
              tone={summary.maxDrawdownAmount > 0 ? 'negative' : undefined}
            />
            <Metric
              label="Закрытые сделки"
              value={String(trades.length)}
              detail={`выборка за ${range} дней`}
            />
          </section>

          <div className="dashboard-v5-bottom">
            <section className="dashboard-v5-trades">
              <header>
                <div>
                  <h2>Последние сделки</h2>
                  <p>Net P&amp;L уже включает комиссии и биржевые корректировки.</p>
                </div>
                <Link to="/dashboard/trades">
                  Все сделки <CaretRight size={15} />
                </Link>
              </header>
              <div>
                <div className="dashboard-v5-trade-head">
                  <span>Время</span>
                  <span>Инструмент</span>
                  <span>Позиция</span>
                  <span>Вход</span>
                  <span>Выход</span>
                  <span>Net P&amp;L</span>
                  <span />
                </div>
                {recentTrades.map((trade) => {
                  const item = calculateTradeBreakdown(trade);
                  return (
                    <button
                      type="button"
                      className="dashboard-v5-trade-row"
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
                      <span>{formatUSDPrice(item.entryPrice)}</span>
                      <span>{formatUSDPrice(item.exitPrice)}</span>
                      <span className={item.netPnl >= 0 ? 'positive' : 'negative'}>
                        {formatSignedUSD(item.netPnl)}
                      </span>
                      <span>
                        <ArrowRight size={15} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className={`dashboard-v5-insight ${mainInsight.tone}`}>
              <header>
                <div>
                  <span>Главный вывод</span>
                  <small>автоматически по выбранному периоду</small>
                </div>
                {mainInsight.tone === 'negative' ? (
                  <WarningCircle size={20} />
                ) : (
                  <ChartLineUp size={20} />
                )}
              </header>
              <h2>{mainInsight.title}</h2>
              <p>{mainInsight.copy}</p>
              <div className="dashboard-v5-insight-measure">
                <span>
                  <small>{mainInsight.measureLabel}</small>
                  <strong>{mainInsight.measureValue}</strong>
                </span>
                <i>
                  <b style={{ width: `${Math.max(4, mainInsight.measure)}%` }} />
                </i>
              </div>
              <small className="dashboard-v5-confidence">
                Достоверность: {mainInsight.confidence} · {trades.length} закрытых сделок
              </small>
              <Link to="/pro">
                Открыть полный разбор <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        </>
      ) : null}

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
