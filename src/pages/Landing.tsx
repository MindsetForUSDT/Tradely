import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowsLeftRight,
  ChartLineUp,
  Check,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { SourceLogo } from '@/components/brand/SourceLogo';
import { useAuth } from '@/hooks/useAuth';

type PreviewTab = 'overview' | 'trades' | 'risk';

const equity = [
  { day: '01', value: 10000 },
  { day: '05', value: 10240 },
  { day: '09', value: 10110 },
  { day: '13', value: 10580 },
  { day: '17', value: 10490 },
  { day: '21', value: 10940 },
  { day: '25', value: 11280 },
  { day: '30', value: 11640 },
];

const trades = [
  ['BTCUSDT', 'Long', '$63,420 → $64,910', '+$372.40'],
  ['ETHUSDT', 'Short', '$3,540 → $3,498', '+$126.00'],
  ['SOLUSDT', 'Long', '$146.20 → $143.80', '−$72.00'],
];

const plans = [
  { name: 'Free', price: '0 ₽', items: ['Основные метрики', 'CSV-импорт', 'История сделок'] },
  {
    name: 'Trader',
    price: '499 ₽',
    items: ['Автоматическая синхронизация', 'Риск-менеджер', 'Полная аналитика'],
    featured: true,
  },
  {
    name: 'PRO + AI',
    price: 'По запросу',
    items: ['Разбор паттернов', 'AI-наблюдения', 'Расширенные отчёты'],
  },
];

function BrandMark() {
  return (
    <span className="tailark-brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function OverviewPreview() {
  return (
    <div className="tailark-preview-overview">
      <div className="tailark-preview-metrics">
        <article>
          <span>Капитал</span>
          <strong>$11,640</strong>
          <small>текущий equity</small>
        </article>
        <article>
          <span>P&amp;L · 30 дней</span>
          <strong className="positive">+$1,640</strong>
          <small>+16.4% за период</small>
        </article>
        <article>
          <span>Завершено</span>
          <strong>24</strong>
          <small>финальные сделки</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>62.5%</strong>
          <small>15 прибыльных</small>
        </article>
      </div>
      <div className="tailark-preview-chart">
        <header>
          <span>Динамика капитала</span>
          <small>Последние 30 дней</small>
        </header>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={equity} margin={{ top: 15, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="landingEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f3f3f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f3f3f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#24272c" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#62666d', fontSize: 8 }}
            />
            <Tooltip
              contentStyle={{ background: '#0b0d10', border: '1px solid #34383e', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f3f3f1"
              strokeWidth={1.7}
              fill="url(#landingEquity)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TradesPreview() {
  return (
    <div className="tailark-preview-table">
      <header>
        <span>Инструмент</span>
        <span>Позиция</span>
        <span>Вход → выход</span>
        <span>P&amp;L</span>
      </header>
      {trades.map((trade) => (
        <div key={trade[0]}>
          <span>
            <SourceLogo brand="bybit" size={18} />
            <strong>{trade[0]}</strong>
          </span>
          <span>{trade[1]}</span>
          <span>{trade[2]}</span>
          <span className={trade[3].startsWith('+') ? 'positive' : 'negative'}>{trade[3]}</span>
        </div>
      ))}
      <footer>Частичные исполнения объединены в финальные сделки</footer>
    </div>
  );
}

function RiskPreview() {
  return (
    <div className="tailark-preview-risk">
      <div>
        <ShieldCheck size={28} />
        <span>Статус риска</span>
        <strong>В пределах системы</strong>
      </div>
      <section>
        <article>
          <span>Риск на сделку</span>
          <strong>0.8%</strong>
          <i>
            <b style={{ width: '40%' }} />
          </i>
          <small>лимит 2.0%</small>
        </article>
        <article>
          <span>Дневная просадка</span>
          <strong>1.2%</strong>
          <i>
            <b style={{ width: '24%' }} />
          </i>
          <small>лимит 5.0%</small>
        </article>
        <article>
          <span>Серия убытков</span>
          <strong>1</strong>
          <i>
            <b style={{ width: '20%' }} />
          </i>
          <small>пауза после 3</small>
        </article>
      </section>
    </div>
  );
}

function ProductPreview() {
  const [tab, setTab] = useState<PreviewTab>('overview');
  const labels: Array<[PreviewTab, string]> = [
    ['overview', 'Обзор'],
    ['trades', 'Сделки'],
    ['risk', 'Риск'],
  ];
  return (
    <div className="tailark-product-window">
      <header>
        <div>
          <BrandMark />
          <strong>TradeumDiary</strong>
        </div>
        <span>
          <i /> Данные синхронизированы
        </span>
      </header>
      <div className="tailark-product-body">
        <aside>
          {labels.map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? 'active' : ''}
              onClick={() => setTab(value)}
              type="button"
            >
              {value === 'overview' ? (
                <ChartLineUp size={15} />
              ) : value === 'trades' ? (
                <ArrowsLeftRight size={15} />
              ) : (
                <ShieldCheck size={15} />
              )}
              {label}
            </button>
          ))}
        </aside>
        <main>
          <div className="tailark-product-heading">
            <div>
              <small>Рабочее пространство</small>
              <h2>{labels.find(([value]) => value === tab)?.[1]}</h2>
            </div>
            <span>30 дней</span>
          </div>
          {tab === 'overview' ? (
            <OverviewPreview />
          ) : tab === 'trades' ? (
            <TradesPreview />
          ) : (
            <RiskPreview />
          )}
        </main>
      </div>
    </div>
  );
}

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const reduceMotion = useReducedMotion();
  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="tailark-landing">
      <section className="tailark-hero">
        <div className="tailark-light-beams" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <motion.div
          className="tailark-hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1>
            Торговые решения.
            <br />
            Без слепых зон.
          </h1>
          <p>
            TradeumDiary объединяет завершённые сделки, риск и контекст в одну ясную систему — чтобы
            вы улучшали процесс, а не смотрели на случайные цифры.
          </p>
          <div>
            <Link to="/register">
              Начать бесплатно <ArrowRight size={16} />
            </Link>
            <a href="#product">Смотреть продукт</a>
          </div>
          <small>
            <ShieldCheck size={14} /> Только чтение. Без доступа к средствам.
          </small>
          <div className="tailark-hero-proof" aria-label="Ключевые возможности">
            <article>
              <strong>Автоимпорт</strong>
              <span>Новые сделки попадают в дневник без ручного переноса.</span>
            </article>
            <article>
              <strong>Финальные позиции</strong>
              <span>Исполнения объединяются в понятный результат сделки.</span>
            </article>
            <article>
              <strong>Контекст и риск</strong>
              <span>Цифры связаны с решениями, лимитами и дисциплиной.</span>
            </article>
          </div>
        </motion.div>

        <div className="tailark-perspective" id="product">
          <div>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="tailark-sources" aria-labelledby="sources-title">
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
            <Sparkle size={21} />
            <span>03</span>
            <h3>Разбор решений</h3>
            <p>
              Аналитика связывает результат с поведением и помогает находить повторяющиеся сильные и
              слабые паттерны.
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
              <strong>{plan.price}</strong>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>
                    <Check size={13} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                Выбрать тариф <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
