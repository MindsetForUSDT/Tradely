import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  PlugsConnected,
  X,
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
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useWallets } from '@/hooks/useWallets';
import { formatDate, formatUSD } from '@/lib/utils';
import type { Trade } from '@/types';

type RangeDays = 7 | 30 | 90;

const ranges: RangeDays[] = [7, 30, 90];

function numeric(value: unknown) {
  const result = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function getInitialBalance(wallets: ReturnType<typeof useWallets>['wallets']) {
  return wallets.reduce((total, wallet) => {
    try {
      const settings =
        typeof wallet.settings === 'string' ? JSON.parse(wallet.settings) : wallet.settings;
      const value =
        settings && typeof settings === 'object' && 'initialBalance' in settings
          ? numeric(settings.initialBalance)
          : 0;
      return total + value;
    } catch {
      return total;
    }
  }, 0);
}

function DashboardTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="overview-chart-tooltip">
      <span>{label}</span>
      <strong>{formatUSD(payload[0]?.value || 0)}</strong>
      <small>Капитал на выбранную дату</small>
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
    <article className="overview-metric">
      <span>{label}</span>
      <strong className={tone || ''}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TradeDetails({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const pnl = numeric(trade.pnl_realized);
  return (
    <aside className="overview-trade-drawer" aria-label="Детали сделки">
      <header>
        <div>
          <span>Детали сделки</span>
          <h2>{trade.symbol}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть детали">
          <X size={18} />
        </button>
      </header>
      <div className="overview-drawer-source">
        <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={24} />
        <div>
          <strong>{trade.exchange || 'Подключённый источник'}</strong>
          <span>{trade.status === 'closed' ? 'Закрыта' : 'Открыта'}</span>
        </div>
      </div>
      <dl>
        <div>
          <dt>Дата и время</dt>
          <dd>{formatDate(trade.timestamp)}</dd>
        </div>
        <div>
          <dt>Направление</dt>
          <dd>{trade.side === 'buy' ? 'Покупка' : 'Продажа'}</dd>
        </div>
        <div>
          <dt>Размер</dt>
          <dd>
            {numeric(trade.amount).toLocaleString('ru-RU')} {trade.symbol.split('/')[0]}
          </dd>
        </div>
        <div>
          <dt>Цена входа</dt>
          <dd>{formatUSD(numeric(trade.price_usd || trade.price))}</dd>
        </div>
        <div>
          <dt>Комиссия</dt>
          <dd>{formatUSD(numeric(trade.fee_usd || trade.fee))}</dd>
        </div>
        <div>
          <dt>P&amp;L</dt>
          <dd className={pnl >= 0 ? 'positive' : 'negative'}>{formatUSD(pnl)}</dd>
        </div>
      </dl>
      <section>
        <span>Контекст</span>
        <p>{trade.notes || 'Заметка к этой сделке пока не добавлена.'}</p>
        {trade.strategy_tag ? <em>{trade.strategy_tag}</em> : null}
      </section>
      <Link to="/dashboard/trades">
        Открыть в сделках <ArrowRight size={15} />
      </Link>
    </aside>
  );
}

export function DashboardLayout() {
  const [range, setRange] = useState<RangeDays>(30);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const { wallets, isLoading: walletsLoading, error: walletsError } = useWallets();
  const {
    trades,
    pnlData,
    isLoading: tradesLoading,
    error: tradesError,
  } = useTradesOptimized({
    limit: 1000,
    daysAgo: range,
  });

  const summary = useMemo(() => {
    const initialBalance = getInitialBalance(wallets);
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    let equity = initialBalance;
    let peak = equity;
    let maxDrawdown = 0;

    const chartData = pnlData.map((point) => {
      equity += numeric(point.pnl);
      peak = Math.max(peak, equity);
      if (peak > 0) maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
      return {
        date: new Date(point.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
        equity,
      };
    });

    trades.forEach((trade) => {
      const pnl = numeric(trade.pnl_realized);
      if (pnl > 0) {
        grossProfit += pnl;
        wins += 1;
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl);
      }
    });

    const pnl = grossProfit - grossLoss;
    const capital = initialBalance + pnl;
    return {
      initialBalance,
      capital,
      pnl,
      pnlPercent: initialBalance ? (pnl / initialBalance) * 100 : 0,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
      maxDrawdown,
      chartData,
    };
  }, [pnlData, trades, wallets]);

  const isLoading = walletsLoading || tradesLoading;
  const hasSource = wallets.length > 0;
  const recentTrades = trades.slice(0, 5);
  const syncError = walletsError || tradesError;

  return (
    <div className="dashboard-overview-v3">
      <header className="overview-topbar">
        <div>
          <h1>Обзор</h1>
          <p>Ключевые показатели и состояние автоматического импорта.</p>
        </div>
        <div className="overview-topbar-actions">
          <button type="button" aria-label="Уведомления">
            <Bell size={18} />
          </button>
          <span>
            <CalendarBlank size={16} /> Последние {range} дней
          </span>
        </div>
      </header>

      {syncError ? (
        <div className="overview-inline-alert">
          Не удалось обновить часть данных. Последняя доступная информация сохранена.
        </div>
      ) : null}

      <section
        className={`overview-metrics ${isLoading ? 'is-loading' : ''}`}
        aria-label="Основные показатели"
      >
        <Metric
          label="Текущий капитал"
          value={hasSource ? formatUSD(summary.capital) : '—'}
          detail={hasSource ? 'по подключённым источникам' : 'подключите источник'}
        />
        <Metric
          label={`P&L · ${range} дней`}
          value={formatUSD(summary.pnl)}
          detail={`${summary.pnlPercent >= 0 ? '+' : ''}${summary.pnlPercent.toFixed(2)}% за период`}
          tone={summary.pnl >= 0 ? 'positive' : 'negative'}
        />
        <Metric label="Сделки" value={String(trades.length)} detail="автоматически импортировано" />
        <Metric
          label="Win rate"
          value={`${summary.winRate.toFixed(1)}%`}
          detail={
            trades.length
              ? `${trades.filter((trade) => numeric(trade.pnl_realized) > 0).length} прибыльных`
              : 'недостаточно данных'
          }
        />
        <Metric
          label="Статус риска"
          value={summary.maxDrawdown < 5 ? 'Норма' : 'Внимание'}
          detail={`макс. просадка ${summary.maxDrawdown.toFixed(2)}%`}
          tone={summary.maxDrawdown >= 5 ? 'negative' : 'positive'}
        />
      </section>

      <section className="overview-chart-section">
        <header>
          <div>
            <h2>Динамика капитала</h2>
            <p>
              {trades.length
                ? `${trades.length} сделок в расчёте`
                : 'График появится после первой синхронизации'}
            </p>
          </div>
          <div className="overview-range" aria-label="Период графика">
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
          </div>
        </header>
        <div className="overview-chart-canvas">
          {summary.chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={summary.chartData}
                margin={{ top: 18, right: 10, left: 2, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="overviewEquityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#50c878" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#50c878" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#202328" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={32}
                  tick={{ fill: '#6f747c', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={66}
                  tick={{ fill: '#6f747c', fontSize: 10 }}
                  tickFormatter={(value: number) =>
                    `$${Intl.NumberFormat('en', { notation: 'compact' }).format(value)}`
                  }
                />
                <Tooltip
                  content={<DashboardTooltip />}
                  cursor={{ stroke: '#737983', strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#50c878"
                  strokeWidth={2}
                  fill="url(#overviewEquityFill)"
                  activeDot={{ r: 4, fill: '#50c878', stroke: '#f5f5f3', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="overview-chart-empty">
              <ClockCounterClockwise size={28} />
              <strong>Ожидаем торговую историю</strong>
              <span>Автоматический импорт заполнит график без ручного ввода.</span>
              <Link to="/dashboard/wallets">Подключить источник</Link>
            </div>
          )}
        </div>
      </section>

      <div className="overview-lower-grid">
        <section className="overview-recent-trades">
          <header>
            <div>
              <h2>Последние сделки</h2>
              <p>Краткая выборка, полный список находится в отдельном разделе.</p>
            </div>
            <Link to="/dashboard/trades">
              Все сделки <CaretRight size={14} />
            </Link>
          </header>
          <div className="overview-trades-table">
            <div className="overview-trade-head">
              <span>Инструмент</span>
              <span>Сторона</span>
              <span>Объём</span>
              <span>P&amp;L</span>
              <span>Источник</span>
            </div>
            {recentTrades.length ? (
              recentTrades.map((trade) => {
                const pnl = numeric(trade.pnl_realized);
                return (
                  <button
                    type="button"
                    className="overview-trade-row"
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <span>
                      <strong>{trade.symbol}</strong>
                      <small>{formatDate(trade.timestamp)}</small>
                    </span>
                    <span className={trade.side === 'buy' ? 'positive' : 'negative'}>
                      {trade.side === 'buy' ? 'Покупка' : 'Продажа'}
                    </span>
                    <span>{formatUSD(numeric(trade.value_usd))}</span>
                    <span className={pnl >= 0 ? 'positive' : 'negative'}>{formatUSD(pnl)}</span>
                    <span className="overview-source-cell">
                      <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={19} />{' '}
                      {trade.exchange || 'Источник'}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="overview-table-empty">
                Сделки появятся здесь после синхронизации источника.
              </div>
            )}
          </div>
        </section>

        <aside className="overview-sync-panel">
          <header>
            <div>
              <h2>Автоматический импорт</h2>
              <p>
                {hasSource
                  ? 'Источники синхронизируются автоматически'
                  : 'Добавьте первый источник данных'}
              </p>
            </div>
            <PlugsConnected size={22} />
          </header>
          {wallets.length ? (
            <div className="overview-source-list">
              {wallets.slice(0, 4).map((wallet) => {
                const source = wallet.label || wallet.chain || 'Источник';
                return (
                  <div key={wallet.id}>
                    <SourceLogo brand={resolveSourceBrand(source)} size={25} />
                    <span>
                      <strong>{source}</strong>
                      <small>
                        {wallet.processing_status === 'failed'
                          ? 'Требует внимания'
                          : 'Автоимпорт активен'}
                      </small>
                    </span>
                    <i className={wallet.processing_status === 'failed' ? 'error' : ''} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overview-supported-sources">
              {(['binance', 'bybit', 'okx', 'metamask', 'coinbase'] as const).map((brand) => (
                <SourceLogo key={brand} brand={brand} size={28} />
              ))}
              <p>API бирж, Web3-кошельки и импорт файлов.</p>
            </div>
          )}
          <div className="overview-sync-status">
            <CheckCircle size={17} weight="fill" />
            <span>
              <strong>{hasSource ? 'Синхронизация включена' : 'Готово к подключению'}</strong>
              <small>Ручное добавление не требуется</small>
            </span>
          </div>
          <Link to="/dashboard/wallets">
            {hasSource ? 'Управлять источниками' : 'Подключить источник'} <ArrowRight size={15} />
          </Link>
        </aside>
      </div>

      {selectedTrade ? (
        <TradeDetails trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
      ) : null}
      {selectedTrade ? (
        <button
          type="button"
          className="overview-drawer-backdrop"
          aria-label="Закрыть детали"
          onClick={() => setSelectedTrade(null)}
        />
      ) : null}
    </div>
  );
}
