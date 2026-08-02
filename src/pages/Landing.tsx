import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  CirclesThreePlus,
  Clock,
  Crosshair,
  FlowArrow,
  LockKey,
  Play,
  ShieldCheck,
  Sparkle,
  Strategy,
} from '@phosphor-icons/react';
import { SourceLogo } from '@/components/brand/SourceLogo';
import { FAQSection } from '@/components/landing/FAQSection';
import { useAuth } from '@/hooks/useAuth';

type DecisionId = 'plan' | 'entry' | 'manage' | 'exit';
type InsightMode = 'rhythm' | 'risk' | 'setups';

const decisions = [
  { id: 'plan' as const, index: '01', time: '09:12', title: 'План', detail: 'Пробой + ретест' },
  { id: 'entry' as const, index: '02', time: '09:25', title: 'Вход', detail: 'Риск 0.62%' },
  { id: 'manage' as const, index: '03', time: '10:07', title: 'Фиксация', detail: 'Закрыто 50%' },
  { id: 'exit' as const, index: '04', time: '10:42', title: 'Выход', detail: 'По плану' },
];

const heatmap = [
  0, 1, 1, 2, 1, 0, 0, 1, 2, 3, 3, 2, 0, 0, 1, 3, 4, 4, 3, 1, 0, 0, 2, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1,
  0, 0,
];

const setupRows = [
  { name: 'Пробой уровня', loss: 34, win: 66 },
  { name: 'Откат', loss: 46, win: 54 },
  { name: 'Продолжение тренда', loss: 28, win: 72 },
  { name: 'Возврат к среднему', loss: 57, win: 43 },
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

function DecisionOrbit({ reduceMotion }: { reduceMotion: boolean }) {
  const [active, setActive] = useState<DecisionId>('exit');
  const selected = decisions.find((decision) => decision.id === active) ?? decisions[3];

  return (
    <motion.div
      className="v16-orbit"
      id="product"
      initial={reduceMotion ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      aria-label="Интерактивная карта решений демонстрационной сделки"
    >
      <div className="v16-orbit-canvas">
        <div className="v16-orbit-rings" aria-hidden="true" />
        <div className="v16-trade-core">
          <span>BTCUSDT</span>
          <strong>+1.92R</strong>
          <small>Завершена · по плану</small>
        </div>
        {decisions.map((decision) => (
          <button
            className={`v16-decision v16-decision-${decision.id} ${active === decision.id ? 'active' : ''}`}
            type="button"
            key={decision.id}
            onClick={() => setActive(decision.id)}
            aria-pressed={active === decision.id}
          >
            <i>{decision.index}</i>
            <span>
              <time>{decision.time}</time>
              <strong>{decision.title}</strong>
              <small>{decision.detail}</small>
            </span>
          </button>
        ))}
      </div>

      <aside className="v16-orbit-inspector">
        <header>
          <span>Выбранное решение</span>
          <strong>{selected.title}</strong>
        </header>
        <div className="v16-risk-ring" aria-label="Использовано 62 процента лимита риска">
          <span>0.62%</span>
          <small>из 1.00%</small>
        </div>
        <div className="v16-mini-heatmap" aria-label="Карта дисциплины за пять недель">
          {heatmap.slice(0, 28).map((value, index) => (
            <i key={index} data-level={value} />
          ))}
        </div>
        <p>
          <CheckCircle size={15} /> Риск соблюдён на всех этапах
        </p>
      </aside>
    </motion.div>
  );
}

function InsightStudio() {
  const [mode, setMode] = useState<InsightMode>('rhythm');
  const insights: Record<InsightMode, { title: string; detail: string }> = {
    rhythm: { title: 'Лучший ритм', detail: 'Вт–Чт · 10:00–13:00' },
    risk: { title: 'Сигнал риска', detail: 'После серии размер позиции растёт' },
    setups: { title: 'Сильный сценарий', detail: 'Продолжение тренда · 72%' },
  };

  return (
    <section className="v16-insights" id="analytics" aria-labelledby="v16-insights-title">
      <header className="v16-section-head">
        <div>
          <h2 id="v16-insights-title">От сделки к закономерности.</h2>
          <p>Каждый результат получает контекст: время, риск, сценарий и соблюдение плана.</p>
        </div>
        <small>Интерактивное демо · данные условные</small>
      </header>

      <div className="v16-mode-tabs" role="tablist" aria-label="Режим анализа">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'rhythm'}
          onClick={() => setMode('rhythm')}
        >
          <Clock size={18} /> Ритм недели
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'risk'}
          onClick={() => setMode('risk')}
        >
          <Crosshair size={18} /> Профиль риска
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'setups'}
          onClick={() => setMode('setups')}
        >
          <Strategy size={18} /> Сценарии
        </button>
      </div>

      <div className="v16-visual-grid">
        <article className={mode === 'rhythm' ? 'is-active' : ''}>
          <h3>Ритм недели</h3>
          <div className="v16-heatmap-labels">
            <span>Пн</span>
            <span>Вт</span>
            <span>Ср</span>
            <span>Чт</span>
            <span>Пт</span>
            <span>Сб</span>
            <span>Вс</span>
          </div>
          <div
            className="v16-heatmap"
            aria-label="Интенсивность качественных торговых решений по дням и времени"
          >
            {heatmap.map((value, index) => (
              <i key={index} data-level={value} />
            ))}
          </div>
          <footer>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
          </footer>
        </article>

        <article className={`v16-radar-card ${mode === 'risk' ? 'is-active' : ''}`}>
          <h3>Профиль риска</h3>
          <div className="v16-radar" aria-label="Профиль соблюдения риск-правил">
            <svg viewBox="0 0 220 220" role="img">
              <title>Риск, стопы, размер позиции и контроль серии</title>
              <g className="grid">
                <polygon points="110,16 204,110 110,204 16,110" />
                <polygon points="110,45 175,110 110,175 45,110" />
                <line x1="110" y1="16" x2="110" y2="204" />
                <line x1="16" y1="110" x2="204" y2="110" />
              </g>
              <polygon className="value" points="110,29 188,110 110,170 34,110" />
              <g className="points">
                <circle cx="110" cy="29" r="4" />
                <circle cx="188" cy="110" r="4" />
                <circle cx="110" cy="170" r="4" />
                <circle cx="34" cy="110" r="4" />
              </g>
            </svg>
            <span className="top">Риск</span>
            <span className="right">Стопы</span>
            <span className="bottom">Размер</span>
            <span className="left">Серия</span>
          </div>
        </article>

        <article className={mode === 'setups' ? 'is-active' : ''}>
          <h3>Результат по сценариям</h3>
          <div className="v16-diverging">
            {setupRows.map((row) => (
              <div key={row.name}>
                <span>{row.name}</span>
                <i className="loss" style={{ width: `${row.loss}%` }}>
                  <small>{row.loss}%</small>
                </i>
                <i className="win" style={{ width: `${row.win}%` }}>
                  <small>{row.win}%</small>
                </i>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="v16-selected-insight" aria-live="polite">
        <Sparkle size={22} />
        <span>{insights[mode].title}</span>
        <strong>{insights[mode].detail}</strong>
        <ArrowUpRight size={21} />
      </div>
    </section>
  );
}

function DataJourney() {
  return (
    <section className="v16-journey" id="workspace" aria-labelledby="v16-journey-title">
      <header className="v16-section-head">
        <div>
          <h2 id="v16-journey-title">Данные проходят путь. Вы получаете вывод.</h2>
          <p>Не строки ордеров, а понятная история завершённой позиции.</p>
        </div>
      </header>
      <div className="v16-journey-rail">
        <article>
          <span>01 · Подключение</span>
          <SourceLogo brand="bybit" size={38} />
          <strong>Bybit</strong>
          <small>API только для чтения</small>
        </article>
        <FlowArrow size={27} aria-hidden="true" />
        <article className="v16-executions">
          <span>02 · Исполнения</span>
          <i>
            <b>Купить</b> 0.012 BTC <time>10:02</time>
          </i>
          <i>
            <b>Купить</b> 0.008 BTC <time>10:05</time>
          </i>
          <i className="sell">
            <b>Продать</b> 0.020 BTC <time>10:42</time>
          </i>
        </article>
        <FlowArrow size={27} aria-hidden="true" />
        <article>
          <span>03 · Финальная позиция</span>
          <CirclesThreePlus size={34} />
          <strong>BTCUSDT · Long</strong>
          <small>Комиссии и P&amp;L объединены</small>
        </article>
        <FlowArrow size={27} aria-hidden="true" />
        <article className="v16-journey-result">
          <span>04 · Решение</span>
          <ShieldCheck size={35} />
          <strong>План соблюдён</strong>
          <small>Риск в норме · выход по сценарию</small>
        </article>
      </div>
    </section>
  );
}

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const reduceMotion = Boolean(useReducedMotion());
  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="tailark-landing cinematic-landing public-v9-landing v16-landing">
      <section className="v16-hero">
        <motion.div
          className="v16-hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
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
          <div className="v16-hero-actions">
            <Link className="cinematic-action v16-primary" to="/register">
              <span>Начать бесплатно</span>
              <i>
                <ArrowRight size={18} />
              </i>
            </Link>
            <a className="v16-secondary" href="#product">
              <Play size={14} weight="fill" />
              Посмотреть продукт
            </a>
          </div>
          <small>
            <LockKey size={15} /> Только чтение. Без доступа к средствам.
          </small>
        </motion.div>
        <DecisionOrbit reduceMotion={reduceMotion} />
      </section>

      <section className="v16-sources" aria-label="Источники данных">
        <p>Сейчас доступен импорт из Bybit. Следующие источники подключаются по мере готовности.</p>
        <div>
          <span className="available">
            <SourceLogo brand="bybit" size={27} />
            <b>Bybit</b>
            <small>Доступно</small>
          </span>
          <span>
            <SourceLogo brand="binance" size={27} />
            <b>Binance</b>
            <small>Скоро</small>
          </span>
          <span>
            <SourceLogo brand="okx" size={27} />
            <b>OKX</b>
            <small>Скоро</small>
          </span>
          <span>
            <SourceLogo brand="coinbase" size={27} />
            <b>Coinbase</b>
            <small>Скоро</small>
          </span>
          <span>
            <SourceLogo brand="metamask" size={27} />
            <b>Web3</b>
            <small>Скоро</small>
          </span>
        </div>
      </section>

      <InsightStudio />
      <DataJourney />

      <section className="v16-pricing" id="pricing">
        <header className="v16-section-head">
          <div>
            <h2>
              Начните с истории.
              <br />
              Добавляйте глубину по мере роста.
            </h2>
            <p>Два понятных тарифа без скрытых уровней.</p>
          </div>
        </header>
        <div>
          {plans.map((plan) => (
            <article className={plan.featured ? 'featured' : ''} key={plan.name}>
              <header>
                <span>{plan.name}</span>
                <strong>
                  {plan.price} <small>{plan.note}</small>
                </strong>
              </header>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>
                    <Check size={14} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={plan.href}>
                Выбрать тариф <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <FAQSection />
      <section className="v16-final">
        <div>
          <h2>Начните видеть полную картину своей торговли.</h2>
          <p>Подключите источник и получите первую сводку по завершённым сделкам.</p>
        </div>
        <Link to="/register">
          Создать дневник <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
