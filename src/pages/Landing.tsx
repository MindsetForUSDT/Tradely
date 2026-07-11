import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

const performance = [
  { day: '10 июн', r: -0.5 },
  { day: '13 июн', r: 0.8 },
  { day: '16 июн', r: -0.6 },
  { day: '19 июн', r: 1.2 },
  { day: '22 июн', r: -1.1 },
  { day: '25 июн', r: 0.7 },
  { day: '28 июн', r: 1.35 },
  { day: '1 июл', r: 0.45 },
  { day: '4 июл', r: -0.75 },
  { day: '7 июл', r: 1.1 },
  { day: '10 июл', r: 2.45 },
];

const trades = [
  {
    pair: 'BTCUSDT',
    side: 'Лонг',
    strategy: 'Тренд-продолжение',
    r: '+2.35R',
    pnl: '+2 234,55 USDT',
    good: true,
  },
  {
    pair: 'ETHUSDT',
    side: 'Шорт',
    strategy: 'Ретест уровня',
    r: '-0.92R',
    pnl: '-786,20 USDT',
    good: false,
  },
  {
    pair: 'SOLUSDT',
    side: 'Лонг',
    strategy: 'Breakout',
    r: '+1.78R',
    pnl: '+1 367,12 USDT',
    good: true,
  },
];

const nav = [
  { label: 'Обзор', icon: 'chart' as const },
  { label: 'Сделки', icon: 'trades' as const },
  { label: 'Позиции', icon: 'wallet' as const },
  { label: 'Дневник', icon: 'journal' as const },
  { label: 'Аналитика', icon: 'chart' as const },
  { label: 'Риски', icon: 'shield' as const },
  { label: 'Стратегии', icon: 'pro' as const },
  { label: 'AI-инсайты', icon: 'info' as const },
];

function ProductPreview() {
  const [range, setRange] = useState<'30 дней' | '90 дней'>('30 дней');
  const [insightOpen, setInsightOpen] = useState(true);
  const chartData = useMemo(
    () =>
      range === '30 дней'
        ? performance
        : [
            ...performance.slice(0, 6).map((point, index) => ({
              ...point,
              day: `${12 + index * 3} мая`,
              r: Number((point.r * 0.65).toFixed(2)),
            })),
            ...performance,
          ],
    [range]
  );

  return (
    <div className="signal-room" aria-label="Предпросмотр рабочего пространства TradeumDiary">
      <aside className="signal-sidebar">
        <div className="signal-mark">T</div>
        <div className="signal-product">
          <strong>TradeumDiary</strong>
          <span>Signal Room</span>
        </div>
        <nav aria-label="Навигация демо">
          {nav.map((item, index) => (
            <button className={index === 0 ? 'active' : ''} key={item.label} type="button">
              <Icon name={item.icon} size={15} /> <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="signal-user">
          <span>TR</span>
          <div>
            <strong>Trader</strong>
            <small>Основной аккаунт</small>
          </div>
        </div>
      </aside>

      <div className="signal-main">
        <div className="signal-metrics">
          <div className="signal-date">
            <Icon name="calendar" size={18} />
            <span>
              <strong>10 июня — 10 июля 2026</strong>
              <small>Обновлено сегодня, 10:24</small>
            </span>
          </div>
          <Metric label="Чистая прибыль" value="+7 842,12" suffix="USDT" tone="positive" />
          <Metric label="Прибыльных" value="61,9%" />
          <Metric label="Фактор прибыли" value="1.78" />
          <Metric label="Макс. просадка" value="-6.32%" tone="negative" />
          <Metric label="Ожидание (R)" value="0.42 R" />
        </div>

        <div className="signal-content">
          <section className="signal-chart">
            <div className="signal-section-head">
              <h3>
                Лента результатов <Icon name="info" size={15} />
              </h3>
              <div className="signal-filters">
                {(['30 дней', '90 дней'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={range === item ? 'selected' : ''}
                    onClick={() => setRange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="signal-chart-canvas">
              <div className="chart-callout positive-callout">
                Breakout<strong>+2.35R</strong>
              </div>
              <div className="chart-callout negative-callout">
                FOMO вход<strong>-1.85R</strong>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 18, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#25272b" strokeDasharray="3 4" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#777b82"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    minTickGap={20}
                  />
                  <YAxis
                    stroke="#777b82"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    domain={[-2, 3]}
                    tickFormatter={(v) => `${v}R`}
                  />
                  <ReferenceLine y={0} stroke="#777b82" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{
                      background: '#101114',
                      border: '1px solid #2b2d31',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value: number) => [`${value}R`, 'Результат']}
                  />
                  <Line
                    type="linear"
                    dataKey="r"
                    stroke="#e8e8e8"
                    strokeWidth={1.4}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      return (
                        <circle
                          key={`${payload.day}-${index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload.r >= 0 ? '#71b67a' : '#e15b5b'}
                          stroke="#0a0b0d"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 5, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="signal-legend">
              <span>
                <i className="positive" /> Прибыльные сделки
              </span>
              <span>
                <i className="negative" /> Убыточные сделки
              </span>
            </div>
            <div className="signal-trades">
              <div className="signal-trades-head">
                <h4>Последние сделки</h4>
                <Link to="/register">Посмотреть все сделки →</Link>
              </div>
              <div className="signal-table" role="table">
                <div className="signal-row labels" role="row">
                  <span>Пара</span>
                  <span>Направление</span>
                  <span>Стратегия</span>
                  <span>R</span>
                  <span>Результат</span>
                </div>
                {trades.map((trade) => (
                  <div className="signal-row" role="row" key={trade.pair}>
                    <span>{trade.pair}</span>
                    <span className={trade.good ? 'positive' : 'negative'}>
                      {trade.good ? '↑' : '↓'} {trade.side}
                    </span>
                    <span>{trade.strategy}</span>
                    <span className={trade.good ? 'positive' : 'negative'}>{trade.r}</span>
                    <span className={trade.good ? 'positive' : 'negative'}>{trade.pnl}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="signal-insight">
            <button
              className="signal-insight-title"
              type="button"
              onClick={() => setInsightOpen((value) => !value)}
              aria-expanded={insightOpen}
            >
              <span>
                AI-инсайты <small>β</small>
              </span>
              <span>{insightOpen ? '−' : '+'}</span>
            </button>
            {insightOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="signal-insight-body"
              >
                <div className="signal-target">◎</div>
                <p className="signal-kicker">Поведенческий инсайт</p>
                <h4>Снижайте риск на сделку при росте волатильности</h4>
                <p>
                  В дни, когда ATR(14) выше 30-дневной медианы, ваш средний результат снижается, а
                  просадка увеличивается на 28%.
                </p>
                <div className="signal-rule">
                  <strong>Что делать:</strong>
                  <span>→ Уменьшайте риск до 0,5–0,75% от капитала.</span>
                </div>
                <div className="signal-risk">
                  <div>
                    <span>Ваш средний риск</span>
                    <strong>1.24%</strong>
                  </div>
                  <div className="signal-range">
                    <span />
                  </div>
                  <small>Рекомендовано: 0.50% — 0.75%</small>
                </div>
              </motion.div>
            )}
            <Link className="signal-insight-link" to="/register">
              Смотреть все инсайты →
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="signal-metric">
      <span>{label}</span>
      <strong className={tone}>
        {value} {suffix && <small>{suffix}</small>}
      </strong>
    </div>
  );
}

const steps = [
  {
    icon: 'wallet-add' as const,
    title: 'Подключите источник',
    text: 'Импортируйте сделки автоматически из биржи, кошелька или файла.',
  },
  {
    icon: 'journal' as const,
    title: 'Разберите сделки',
    text: 'Фиксируйте контекст, причины, эмоции и риск без ручной рутины.',
  },
  {
    icon: 'chart' as const,
    title: 'Улучшайте систему',
    text: 'Проверяйте гипотезы и повторяйте то, что действительно работает.',
  },
];

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mono-landing">
      <section className="landing-hero">
        <motion.div
          className="landing-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <h1>Видите сделку. Понимайте решение.</h1>
          <p>
            TradeumDiary связывает результат, риск и контекст — чтобы ваша стратегия становилась
            сильнее после каждой сделки.
          </p>
          <div className="landing-actions">
            <Link className="mono-button primary" to="/register">
              Создать дневник
            </Link>
            <a className="mono-link" href="#product">
              Открыть демо <span>→</span>
            </a>
          </div>
        </motion.div>
        <motion.div
          id="product"
          className="landing-preview"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12 }}
        >
          <ProductPreview />
        </motion.div>
      </section>

      <section className="landing-steps" id="features">
        <p className="mono-eyebrow">Рабочий процесс</p>
        <h2>Начните путь к сильной системе</h2>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article key={step.title}>
              <div className="step-number">{index + 1}</div>
              <div className="step-icon">
                <Icon name={step.icon} size={25} />
              </div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-proof">
        <div>
          <p className="mono-eyebrow">Всё на своих местах</p>
          <h2>
            Не ещё один терминал.
            <br />
            Система обратной связи.
          </h2>
        </div>
        <div className="proof-list">
          <article>
            <span>01</span>
            <div>
              <h3>Реальные данные</h3>
              <p>
                До подключения источника — честный onboarding. После — ваши сделки, балансы и
                метрики без демо-цифр.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Контроль риска</h3>
              <p>Лимиты на сделку, просадку и день превращают дисциплину в измеримый процесс.</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>PRO + AI</h3>
              <p>
                Перекосы, серии, слабые сетапы и конкретные рекомендации доступны тогда, когда для
                них хватает данных.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-pricing" id="pricing">
        <p className="mono-eyebrow">Простые тарифы</p>
        <h2>Начните бесплатно. Усиливайте аналитику по мере роста.</h2>
        <div className="pricing-grid">
          <article>
            <span>Free</span>
            <h3>0 ₽</h3>
            <p>База для честного торгового дневника.</p>
            <ul>
              <li>Ручной ввод и импорт CSV</li>
              <li>Основные метрики</li>
              <li>Теги и заметки</li>
            </ul>
            <Link to="/register">Начать бесплатно</Link>
          </article>
          <article className="featured">
            <span>Trader</span>
            <h3>
              499 ₽ <small>/ месяц</small>
            </h3>
            <p>Автоматизация, риск и расширенная аналитика.</p>
            <ul>
              <li>Подключение CEX и кошельков</li>
              <li>Риск-менеджер</li>
              <li>Расширенные отчёты</li>
            </ul>
            <Link to="/register">Выбрать Trader</Link>
          </article>
          <article>
            <span>PRO + AI</span>
            <h3>По запросу</h3>
            <p>Глубокий разбор паттернов и ошибок.</p>
            <ul>
              <li>PRO-перекосы и серии</li>
              <li>AI-разбор контекста</li>
              <li>Приоритетные sync jobs</li>
            </ul>
            <Link to="/register">Попробовать PRO</Link>
          </article>
        </div>
      </section>

      <section className="landing-final">
        <h2>Торговая история уже содержит ответы.</h2>
        <p>TradeumDiary помогает их увидеть.</p>
        <Link className="mono-button primary" to="/register">
          Создать дневник
        </Link>
      </section>
    </div>
  );
}
