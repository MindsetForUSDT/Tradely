import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChartBar,
  Clock,
  Coins,
  Info,
  ShieldWarning,
  Tag,
  TrendDown,
} from '@phosphor-icons/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import type { DiagnosticBucket } from '@/lib/lossDiagnostics';
import { calculateLossDiagnostics } from '@/lib/lossDiagnostics';
import { formatDuration, formatSignedUSD } from '@/lib/tradeAnalytics';
import { formatUSD } from '@/lib/utils';

type RangeDays = 7 | 30 | 90;

const ranges: RangeDays[] = [7, 30, 90];

function tradeCountLabel(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const word =
    mod100 >= 11 && mod100 <= 14
      ? 'сделок'
      : mod10 === 1
        ? 'сделка'
        : mod10 >= 2 && mod10 <= 4
          ? 'сделки'
          : 'сделок';
  return `${count} ${word}`;
}

function compactUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function percent(value: number | null, digits = 2) {
  return value === null ? 'Нет данных' : `${value.toFixed(digits)}%`;
}

function ChartTooltip({
  active,
  payload,
  title,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DiagnosticBucket; dataKey?: string; value?: number }>;
  title: string;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="diagnostic-tooltip">
      <span>{title}</span>
      <strong>{item.label}</strong>
      <dl>
        <div>
          <dt>Чистый P&amp;L</dt>
          <dd className={item.netPnl >= 0 ? 'positive' : 'negative'}>
            {formatSignedUSD(item.netPnl)}
          </dd>
        </div>
        <div>
          <dt>Комиссии</dt>
          <dd>{formatSignedUSD(-item.fees)}</dd>
        </div>
        <div>
          <dt>Сделок</dt>
          <dd>{item.trades}</dd>
        </div>
      </dl>
    </div>
  );
}

function Coverage({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="diagnostic-coverage-row">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <div>
        <i style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <b>{value.toFixed(0)}%</b>
    </div>
  );
}

export function ProAnalytics() {
  const [range, setRange] = useState<RangeDays>(30);
  const { subscriptionTier } = useAuth();
  const { trades, isLoading, error } = useTradesOptimized({ limit: 5000, daysAgo: range });
  const diagnostics = useMemo(() => calculateLossDiagnostics(trades), [trades]);

  const hourlyData = useMemo(() => {
    const byHour = new Map(diagnostics.hourly.map((bucket) => [Number(bucket.key), bucket]));
    return Array.from({ length: 24 }, (_, hour) => {
      const existing = byHour.get(hour);
      const key = String(hour).padStart(2, '0');
      return (
        existing || {
          key,
          label: `${key}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`,
          trades: 0,
          netPnl: 0,
          grossPnl: 0,
          fees: 0,
          winRate: 0,
          averagePnl: 0,
        }
      );
    });
  }, [diagnostics.hourly]);

  const rankedSymbols = useMemo(
    () => [...diagnostics.symbols].sort((a, b) => a.netPnl - b.netPnl).slice(0, 8),
    [diagnostics.symbols]
  );
  const behaviorRows = useMemo(
    () =>
      [...diagnostics.emotions, ...diagnostics.mistakes]
        .sort((a, b) => a.netPnl - b.netPnl)
        .slice(0, 6),
    [diagnostics.emotions, diagnostics.mistakes]
  );
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'локальное время';
  const primaryInsight = diagnostics.insights[0];

  if (isLoading) return <div className="workspace-loading">Ищем причины в истории сделок…</div>;

  if (error) {
    return (
      <section className="pro-v3-page">
        <div className="pro-v3-state">
          <ShieldWarning size={28} />
          <h1>Не удалось собрать аналитику</h1>
          <p>{error}</p>
          <Link to="/dashboard/wallets">Проверить источник</Link>
        </div>
      </section>
    );
  }

  if (!trades.length) {
    return (
      <section className="pro-v3-page">
        <header className="pro-v3-heading">
          <span>Диагностика торговли</span>
          <h1>Сначала данные — затем выводы</h1>
          <p>
            Tradeum не подставляет демонстрационные причины. Подключите источник, и модуль
            рассчитает комиссии, риск, часы и инструменты по вашим сделкам.
          </p>
        </header>
        <div className="pro-v3-state">
          <ChartBar size={28} />
          <h2>История сделок пока пуста</h2>
          <p>После синхронизации первый диагноз появится автоматически.</p>
          <Link to="/dashboard/wallets">Подключить источник</Link>
        </div>
      </section>
    );
  }

  if (subscriptionTier !== 'pro') {
    return (
      <section className="pro-v3-page">
        <header className="pro-v3-heading">
          <span>Tradeum PRO · медицинский осмотр торговли</span>
          <h1>Почему вы теряете деньги?</h1>
          <p>
            Не ещё одна таблица: Tradeum связывает чистый результат с комиссиями, временем,
            инструментами, риском и вашим состоянием.
          </p>
        </header>

        <article className={`diagnostic-hero ${primaryInsight?.tone || 'neutral'}`}>
          <span>{primaryInsight?.eyebrow || 'Предварительный диагноз'}</span>
          <h2>{primaryInsight?.title}</h2>
          <p>{primaryInsight?.description}</p>
          <div>
            <strong>{primaryInsight?.evidence}</strong>
            <small>
              Вывод построен по выборке «{tradeCountLabel(trades.length)}» за {range} дней
            </small>
          </div>
        </article>

        <div className="pro-v3-gate">
          <div>
            <span>
              <Clock size={18} /> P&amp;L по 24 часам
            </span>
            <span>
              <Coins size={18} /> Комиссии по дням и инструментам
            </span>
            <span>
              <TrendDown size={18} /> Просадка и худшая сделка
            </span>
            <span>
              <Tag size={18} /> Ошибки и эмоции
            </span>
          </div>
          <section>
            <small>Персональный разбор уже рассчитан</small>
            <h2>Откройте причины и конкретные точки для изменения правил</h2>
            <p>
              Полный отчёт покажет, где именно теряется P&amp;L, и отделит устойчивые закономерности
              от единичных сделок.
            </p>
            <strong>
              499 ₽ <small>/ месяц</small>
            </strong>
            <Link to="/subscribe">
              Открыть PRO-диагностику <ArrowRight size={17} />
            </Link>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="pro-v3-page">
      <header className="pro-v3-heading pro-v3-heading-row">
        <div>
          <span>PRO · диагностика торговли</span>
          <h1>Почему я теряю деньги?</h1>
          <p>
            {tradeCountLabel(trades.length)} · часы в {timezone}
          </p>
        </div>
        <div className="pro-v3-range" aria-label="Период аналитики">
          {ranges.map((days) => (
            <button
              type="button"
              key={days}
              className={range === days ? 'active' : ''}
              onClick={() => setRange(days)}
            >
              {days} дней
            </button>
          ))}
        </div>
      </header>

      <article className={`diagnostic-hero ${primaryInsight?.tone || 'neutral'}`}>
        <span>{primaryInsight?.eyebrow}</span>
        <h2>{primaryInsight?.title}</h2>
        <p>{primaryInsight?.description}</p>
        <div>
          <strong>{primaryInsight?.evidence}</strong>
          <small>Расчёт обновляется вместе с выбранным периодом</small>
        </div>
      </article>

      <div className="diagnostic-metrics">
        <article>
          <span>Чистый P&amp;L</span>
          <strong className={diagnostics.netPnl >= 0 ? 'positive' : 'negative'}>
            {formatSignedUSD(diagnostics.netPnl)}
          </strong>
          <small>
            Валовый {formatSignedUSD(diagnostics.grossPnl)} · корректировки{' '}
            {formatSignedUSD(diagnostics.adjustments)}
          </small>
        </article>
        <article>
          <span>Комиссии / валовый P&amp;L</span>
          <strong>{percent(diagnostics.feeShareOfGrossPnl, 0)}</strong>
          <small>
            {formatSignedUSD(-diagnostics.fees)} · {percent(diagnostics.feeRateOfTurnover)} от
            учтённого оборота
          </small>
        </article>
        <article>
          <span>Средняя комиссия</span>
          <strong>{formatUSD(diagnostics.averageFee)}</strong>
          <small>на одну завершённую сделку</small>
        </article>
        <article>
          <span>Максимальная просадка</span>
          <strong className="negative">{formatUSD(diagnostics.maxDrawdown)}</strong>
          <small>по накопленному чистому P&amp;L</small>
        </article>
      </div>

      <div className="diagnostic-chart-grid">
        <article className="diagnostic-card diagnostic-chart-card">
          <header>
            <div>
              <span>Время торговли</span>
              <h2>Где день забирает ваш P&amp;L</h2>
            </div>
            <small>{timezone}</small>
          </header>
          <div className="diagnostic-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis
                  dataKey="key"
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                  tick={{ fill: '#777e89', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tick={{ fill: '#777e89', fontSize: 10 }}
                  tickFormatter={compactUSD}
                />
                <Tooltip
                  content={<ChartTooltip title="Час закрытия сделки" />}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="netPnl" radius={[4, 4, 2, 2]} maxBarSize={24}>
                  {hourlyData.map((bucket) => (
                    <Cell
                      key={bucket.key}
                      fill={bucket.netPnl >= 0 ? '#7c8cff' : '#ff6b72'}
                      fillOpacity={bucket.trades ? 0.88 : 0.08}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="diagnostic-card diagnostic-chart-card">
          <header>
            <div>
              <span>Цена торговли</span>
              <h2>Комиссии и результат по дням</h2>
            </div>
            <small>{formatUSD(diagnostics.fees)} за период</small>
          </header>
          <div className="diagnostic-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={diagnostics.daily}
                margin={{ top: 10, right: 4, bottom: 4, left: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tick={{ fill: '#777e89', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tick={{ fill: '#777e89', fontSize: 10 }}
                  tickFormatter={compactUSD}
                />
                <Tooltip content={<ChartTooltip title="Торговый день" />} />
                <Bar dataKey="fees" fill="#ff9364" fillOpacity={0.72} radius={[3, 3, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="netPnl"
                  stroke="#8997ff"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <footer className="diagnostic-legend">
            <span className="fees">Комиссии</span>
            <span className="pnl">Чистый P&amp;L</span>
          </footer>
        </article>
      </div>

      <div className="diagnostic-detail-grid">
        <article className="diagnostic-card diagnostic-symbols">
          <header>
            <div>
              <span>Инструменты</span>
              <h2>Где edge не покрывает издержки</h2>
            </div>
            <Link to="/dashboard/trades">Открыть сделки</Link>
          </header>
          <div className="diagnostic-table">
            <div className="diagnostic-table-head">
              <span>Инструмент</span>
              <span>Сделок</span>
              <span>Комиссии</span>
              <span>Win rate</span>
              <span>Net P&amp;L</span>
            </div>
            {rankedSymbols.map((item) => (
              <div className="diagnostic-table-row" key={item.key}>
                <strong>{item.label}</strong>
                <span>{item.trades}</span>
                <span>{formatSignedUSD(-item.fees)}</span>
                <span>{item.winRate.toFixed(0)}%</span>
                <strong className={item.netPnl >= 0 ? 'positive' : 'negative'}>
                  {formatSignedUSD(item.netPnl)}
                </strong>
              </div>
            ))}
          </div>
        </article>

        <article className="diagnostic-card diagnostic-risk">
          <header>
            <div>
              <span>Картина риска</span>
              <h2>Насколько тяжело переживается ошибка</h2>
            </div>
            <ShieldWarning size={20} />
          </header>
          <dl>
            <div>
              <dt>Худшая сделка</dt>
              <dd className="negative">{formatSignedUSD(-diagnostics.maxLoss)}</dd>
            </div>
            <div>
              <dt>Среднее удержание</dt>
              <dd>
                {diagnostics.averageHoldingMinutes === null
                  ? 'Нет данных'
                  : formatDuration(Math.round(diagnostics.averageHoldingMinutes))}
              </dd>
            </div>
            <div>
              <dt>Средний результат</dt>
              <dd className={diagnostics.averageTrade >= 0 ? 'positive' : 'negative'}>
                {formatSignedUSD(diagnostics.averageTrade)}
              </dd>
            </div>
            <div>
              <dt>Средний R-multiple</dt>
              <dd>
                {diagnostics.averageRMultiple === null
                  ? 'Нет данных'
                  : `${diagnostics.averageRMultiple.toFixed(2)}R`}
              </dd>
            </div>
          </dl>
          <p>
            <Info size={15} />
            Sharpe и просадка в процентах требуют истории капитала. Здесь показаны только метрики,
            которые можно доказать текущими данными.
          </p>
        </article>
      </div>

      <div className="diagnostic-detail-grid">
        <article className="diagnostic-card diagnostic-behavior">
          <header>
            <div>
              <span>Поведение</span>
              <h2>Что происходит с результатом в разных состояниях</h2>
            </div>
            <Tag size={20} />
          </header>
          {behaviorRows.length ? (
            <div>
              {behaviorRows.map((item) => (
                <div className="diagnostic-behavior-row" key={`${item.key}-${item.label}`}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.trades} отмеченных сделок</small>
                  </span>
                  <i>
                    <b
                      className={item.netPnl >= 0 ? 'positive' : 'negative'}
                      style={{
                        width: `${Math.max(
                          8,
                          Math.min(
                            100,
                            (Math.abs(item.netPnl) /
                              Math.max(...behaviorRows.map((row) => Math.abs(row.netPnl)), 1)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </i>
                  <strong className={item.netPnl >= 0 ? 'positive' : 'negative'}>
                    {formatSignedUSD(item.netPnl)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="diagnostic-inline-empty">
              <p>Поведенческий вывод появится после разметки сделок.</p>
              <span>Откройте сделку и выберите эмоцию или ошибку — длинные заметки не нужны.</span>
              <Link to="/dashboard/trades">Разметить сделки</Link>
            </div>
          )}
        </article>

        <article className="diagnostic-card diagnostic-coverage">
          <header>
            <div>
              <span>Достоверность</span>
              <h2>Каких данных не хватает для точного разбора</h2>
            </div>
            <Info size={20} />
          </header>
          <Coverage
            label="Время удержания"
            value={diagnostics.holdingCoverage}
            detail="Для анализа длительности"
          />
          <Coverage
            label="Исходный риск"
            value={diagnostics.riskCoverage}
            detail="Для R/R и R-multiple"
          />
          <Coverage
            label="Контекст решения"
            value={diagnostics.contextCoverage}
            detail="Для ошибок и эмоций"
          />
          <p>
            Slippage станет доступен после импорта заявленной цены ордера; сейчас Tradeum хранит
            фактические исполнения и не подменяет отсутствующие значения.
          </p>
        </article>
      </div>
    </section>
  );
}
