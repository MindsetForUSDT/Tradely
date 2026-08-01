import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowsLeftRight,
  ChartDonut,
  Check,
  CheckCircle,
  ClipboardText,
  LockKey,
  Play,
  ShieldCheck,
  TrendUp,
} from '@phosphor-icons/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SourceLogo } from '@/components/brand/SourceLogo';
import { FAQSection } from '@/components/landing/FAQSection';
import { useAuth } from '@/hooks/useAuth';

type PreviewPeriod = '7 дней' | '30 дней' | '90 дней';
type DecisionId = 'plan' | 'entry' | 'manage' | 'exit';

interface EquityPoint {
  day: string;
  value: number;
}

interface PreviewPeriodData {
  range: string;
  capital: number;
  change: string;
  chart: EquityPoint[];
}

interface Decision {
  id: DecisionId;
  time: string;
  title: string;
  detail: string;
}

const previewPeriods: PreviewPeriod[] = ['7 дней', '30 дней', '90 дней'];

const previewData: Record<PreviewPeriod, PreviewPeriodData> = {
  '7 дней': {
    range: '2026-07-22 — 2026-07-28',
    capital: 11640,
    change: '+4.9% за период',
    chart: [
      { day: '22 июл', value: 11100 },
      { day: '23 июл', value: 11240 },
      { day: '24 июл', value: 11180 },
      { day: '25 июл', value: 11420 },
      { day: '26 июл', value: 11380 },
      { day: '27 июл', value: 11520 },
      { day: '28 июл', value: 11640 },
    ],
  },
  '30 дней': {
    range: '2026-06-28 — 2026-07-28',
    capital: 11640,
    change: '+16.4% за период',
    chart: [
      { day: '28 июн', value: 8200 },
      { day: '30 июн', value: 8460 },
      { day: '02 июл', value: 9050 },
      { day: '04 июл', value: 8740 },
      { day: '06 июл', value: 9160 },
      { day: '08 июл', value: 9520 },
      { day: '10 июл', value: 9700 },
      { day: '12 июл', value: 9900 },
      { day: '14 июл', value: 10280 },
      { day: '16 июл', value: 10190 },
      { day: '18 июл', value: 10610 },
      { day: '20 июл', value: 10820 },
      { day: '22 июл', value: 11020 },
      { day: '24 июл', value: 11360 },
      { day: '26 июл', value: 11410 },
      { day: '28 июл', value: 11640 },
    ],
  },
  '90 дней': {
    range: '2026-04-30 — 2026-07-28',
    capital: 11640,
    change: '+32.6% за период',
    chart: [
      { day: '30 апр', value: 8780 },
      { day: '10 мая', value: 9120 },
      { day: '20 мая', value: 8950 },
      { day: '30 мая', value: 9480 },
      { day: '09 июн', value: 9760 },
      { day: '19 июн', value: 10040 },
      { day: '29 июн', value: 10220 },
      { day: '09 июл', value: 10860 },
      { day: '19 июл', value: 11140 },
      { day: '28 июл', value: 11640 },
    ],
  },
};

const decisions: Decision[] = [
  {
    id: 'plan',
    time: '09:12',
    title: 'План',
    detail: 'Сценарий: пробой + ретест',
  },
  {
    id: 'entry',
    time: '09:25',
    title: 'Вход в сделку',
    detail: 'BTCUSDT · Лонг · $68,240',
  },
  {
    id: 'manage',
    time: '10:07',
    title: 'Частичная фиксация',
    detail: 'Закрыто 50% · +0.96R',
  },
  {
    id: 'exit',
    time: '10:42',
    title: 'Выход по плану',
    detail: 'Остаток · +1.92R',
  },
];

const plans = [
  {
    name: 'Free',
    price: '0 ₽',
    note: 'навсегда',
    items: ['Обзор и базовые метрики', 'Разбор отдельных сделок', 'История за 30 дней'],
    href: '/register',
  },
  {
    name: 'PRO',
    price: '499 ₽',
    note: 'в месяц',
    items: ['Автосинхронизация Bybit', 'Полная история и аналитика', 'Риск и дисциплина'],
    href: '/subscribe?selected=pro',
    featured: true,
  },
];

function DecisionIcon({ id }: { id: DecisionId }) {
  if (id === 'plan') return <ClipboardText size={17} />;
  if (id === 'entry') return <ArrowUpRight size={17} />;
  if (id === 'manage') return <ChartDonut size={17} />;
  return <CheckCircle size={17} />;
}

function AnalyticsScene({ reduceMotion }: { reduceMotion: boolean }) {
  const [period, setPeriod] = useState<PreviewPeriod>('30 дней');
  const [activeDecisionId, setActiveDecisionId] = useState<DecisionId>('exit');
  const data = previewData[period];
  const activeDecision =
    decisions.find((decision) => decision.id === activeDecisionId) ?? decisions[3];

  const cyclePeriod = () => {
    const currentIndex = previewPeriods.indexOf(period);
    setPeriod(previewPeriods[(currentIndex + 1) % previewPeriods.length]);
  };

  return (
    <motion.div
      className="cinematic-analytics-scene"
      id="product"
      initial={reduceMotion ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.85, delay: 0.12 }}
    >
      <div className="cinematic-scene-head">
        <div>
          <span>
            Кривая капитала <i />
          </span>
          <strong>${data.capital.toLocaleString('en-US')}</strong>
          <small>{data.change}</small>
        </div>
        <button type="button" onClick={cyclePeriod} aria-label="Изменить период графика">
          <span>Период: {period}</span>
          <small>{data.range}</small>
        </button>
      </div>

      <div className="cinematic-equity-chart" aria-label={`Кривая капитала за ${period}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.chart} margin={{ top: 26, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cinematicEquityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d8c6af" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#d8c6af" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(237, 230, 220, 0.075)" vertical />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              tick={{ fill: '#5d5a56', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              orientation="right"
              domain={['dataMin - 250', 'dataMax + 250']}
              tick={{ fill: '#5d5a56', fontSize: 10 }}
              tickFormatter={(value: number) => `$${Math.round(value / 1000)}K`}
              width={42}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(216, 198, 175, 0.35)', strokeDasharray: '4 5' }}
              contentStyle={{
                background: '#0b0c0e',
                border: '1px solid rgba(237, 230, 220, 0.2)',
                borderRadius: 6,
                color: '#eee8df',
                fontSize: 11,
              }}
              formatter={(value: number) => [`$${value.toLocaleString('en-US')}`, 'Капитал']}
            />
            {period === '30 дней' ? (
              <>
                <ReferenceLine
                  x="02 июл"
                  stroke="rgba(216, 198, 175, 0.35)"
                  strokeDasharray="3 4"
                />
                <ReferenceLine
                  x="20 июл"
                  stroke="rgba(216, 198, 175, 0.35)"
                  strokeDasharray="3 4"
                />
                <ReferenceDot
                  x="02 июл"
                  y={9050}
                  r={5}
                  fill="#0b0c0e"
                  stroke="#e8dccd"
                  strokeWidth={2}
                />
                <ReferenceDot
                  x="20 июл"
                  y={10820}
                  r={5}
                  fill="#0b0c0e"
                  stroke="#e8dccd"
                  strokeWidth={2}
                />
              </>
            ) : null}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#e8dccd"
              strokeWidth={1.7}
              fill="url(#cinematicEquityFill)"
              isAnimationActive={!reduceMotion}
              animationDuration={1100}
              dot={false}
              activeDot={{ r: 4, fill: '#0b0c0e', stroke: '#eee8df', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {period === '30 дней' ? (
          <>
            <button
              className={`cinematic-chart-note note-risk ${
                activeDecisionId === 'entry' ? 'active' : ''
              }`}
              type="button"
              onClick={() => setActiveDecisionId('entry')}
            >
              <strong>Риск соблюдён</strong>
              <span>0.62% от капитала</span>
            </button>
            <button
              className={`cinematic-chart-note note-exit ${
                activeDecisionId === 'exit' ? 'active' : ''
              }`}
              type="button"
              onClick={() => setActiveDecisionId('exit')}
            >
              <strong>Выход по плану</strong>
              <span>RR 1.92</span>
            </button>
          </>
        ) : null}
      </div>

      <div className="cinematic-decision-grid">
        <section className="cinematic-decision-feed" aria-label="Лента решений">
          <h2>Лента решений</h2>
          <div>
            {decisions.map((decision) => (
              <button
                className={decision.id === activeDecisionId ? 'active' : ''}
                type="button"
                key={decision.id}
                onClick={() => setActiveDecisionId(decision.id)}
              >
                <time>{decision.time}</time>
                <i />
                <span>
                  <strong>{decision.title}</strong>
                  <small>{decision.detail}</small>
                </span>
                <DecisionIcon id={decision.id} />
              </button>
            ))}
          </div>
        </section>

        <section className="cinematic-trade-summary" aria-label="Итоги по сделке">
          <header>
            <h2>Итоги по сделке</h2>
            <span>2026-07-18 · BTCUSDT Лонг</span>
          </header>
          <dl>
            <div>
              <dt>P&amp;L</dt>
              <dd>+$1,640</dd>
              <small>+1.92R</small>
            </div>
            <div>
              <dt>Profit factor</dt>
              <dd>1.84</dd>
              <small>Хорошо</small>
            </div>
            <div>
              <dt>Дисциплина</dt>
              <dd>91%</dd>
              <small>Стабильно</small>
            </div>
          </dl>
          <p>
            <span>Контекст</span>
            {activeDecision.title}: {activeDecision.detail}
          </p>
        </section>
      </div>
    </motion.div>
  );
}

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const reduceMotion = useReducedMotion();
  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="tailark-landing cinematic-landing public-v9-landing">
      <section className="cinematic-landing-hero">
        <div className="cinematic-hero-field" aria-hidden="true" />
        <motion.div
          className="cinematic-hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72 }}
        >
          <h1>
            Видите не только P&amp;L.
            <br />
            Понимаете свои решения.
          </h1>
          <p>
            TradeumDiary объединяет завершённые сделки, комиссии, риск и контекст в одну честную
            картину.
          </p>
          <div className="cinematic-hero-actions">
            <Link className="cinematic-action cinematic-hero-primary" to="/register">
              <span>Начать бесплатно</span>
              <i>
                <ArrowRight size={18} />
              </i>
            </Link>
            <a className="cinematic-hero-secondary" href="#product">
              <i>
                <Play size={13} weight="fill" />
              </i>
              Посмотреть продукт
            </a>
          </div>
          <small className="cinematic-security-note">
            <LockKey size={15} /> Только чтение. Без доступа к средствам.
          </small>
        </motion.div>

        <AnalyticsScene reduceMotion={Boolean(reduceMotion)} />
      </section>

      <section
        className="tailark-sources cinematic-sources"
        id="workspace"
        aria-labelledby="sources-title"
      >
        <h2 id="sources-title">Данные приходят из источника. Выводы принадлежат вам.</h2>
        <div>
          <span>
            <SourceLogo brand="bybit" size={28} />
            <b>Bybit</b>
            <small>Доступно</small>
          </span>
          <span>
            <SourceLogo brand="binance" size={28} />
            <b>Binance</b>
            <small>Скоро</small>
          </span>
          <span>
            <SourceLogo brand="okx" size={28} />
            <b>OKX</b>
            <small>Скоро</small>
          </span>
          <span>
            <SourceLogo brand="coinbase" size={28} />
            <b>Coinbase</b>
            <small>Скоро</small>
          </span>
          <span>
            <SourceLogo brand="metamask" size={28} />
            <b>Web3</b>
            <small>Скоро</small>
          </span>
        </div>
      </section>

      <section className="tailark-workflow" aria-labelledby="workflow-title">
        <header>
          <span>Как работает система</span>
          <div>
            <h2 id="workflow-title">От биржи до решения — один непрерывный процесс.</h2>
            <p>
              TradeumDiary не заставляет заполнять пустой журнал. Платформа собирает завершённую
              торговую историю, приводит данные к единому формату и показывает, где результат
              создаёт стратегия, а где — случайность или нарушение риска.
            </p>
          </div>
        </header>
        <div className="tailark-workflow-steps">
          <article>
            <span>01</span>
            <strong>Подключение</strong>
            <p>Добавьте API-ключ только для чтения и выберите дату начала импорта.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Нормализация</strong>
            <p>Частичные исполнения собираются в завершённые позиции с комиссиями и P&amp;L.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Аналитика</strong>
            <p>Дашборд показывает динамику капитала, серии, сетапы и отклонения от системы.</p>
          </article>
          <article>
            <span>04</span>
            <strong>Улучшение</strong>
            <p>Вы фиксируете выводы, корректируете риск и проверяете изменения на дистанции.</p>
          </article>
        </div>
      </section>

      <section className="tailark-principles" id="analytics">
        <header>
          <span>Один продукт — три уровня контроля</span>
          <h2>
            Видеть результат недостаточно.
            <br />
            Нужно понимать, как он появился.
          </h2>
        </header>
        <div>
          <article>
            <ArrowsLeftRight size={21} />
            <span>01</span>
            <h3>Финальные сделки</h3>
            <p>
              Частичные исполнения объединяются в завершённые позиции с ценой входа, выхода,
              комиссиями и реальным P&amp;L.
            </p>
          </article>
          <article>
            <ShieldCheck size={21} />
            <span>02</span>
            <h3>Контроль риска</h3>
            <p>
              Лимиты на сделку, день и просадку показывают нарушение системы до того, как оно
              становится большой потерей.
            </p>
          </article>
          <article>
            <TrendUp size={21} />
            <span>03</span>
            <h3>Разбор решений</h3>
            <p>
              Аналитика связывает результат с поведением и помогает проверять повторяющиеся сильные
              и слабые паттерны на дистанции.
            </p>
          </article>
        </div>
      </section>

      <section className="tailark-pricing" id="pricing">
        <header>
          <span>Тарифы</span>
          <h2>
            Начните с истории.
            <br />
            Добавляйте глубину по мере роста.
          </h2>
        </header>
        <div>
          {plans.map((plan) => (
            <article className={plan.featured ? 'featured' : ''} key={plan.name}>
              <span>{plan.name}</span>
              <strong>
                {plan.price} <small>{plan.note}</small>
              </strong>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>
                    <Check size={13} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={plan.href}>
                Выбрать тариф <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <FAQSection />
      <section className="landing-v7-final">
        <div>
          <h2>Начните видеть полную картину своей торговли.</h2>
          <p>Подключите источник и получите первую честную сводку по завершённым сделкам.</p>
        </div>
        <Link to="/register">
          Создать дневник <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
