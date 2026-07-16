import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

const productScenes = [
  {
    id: 'journal',
    number: '01',
    title: 'Журнал сделок',
    copy: 'Контекст, риск, эмоции и заметки — в одной последовательной истории.',
  },
  {
    id: 'analytics',
    number: '02',
    title: 'Аналитика',
    copy: 'Паттерны появляются только после подключения ваших реальных данных.',
  },
  {
    id: 'risk',
    number: '03',
    title: 'Риск-менеджмент',
    copy: 'Лимиты на сделку, день и просадку превращают дисциплину в систему.',
  },
  {
    id: 'ai',
    number: '04',
    title: 'AI-разборы',
    copy: 'Конкретные наблюдения о ваших решениях — без шума и общих советов.',
  },
] as const;

const plans = [
  {
    name: 'Free',
    price: '0 ₽',
    note: 'Навсегда',
    items: ['Ручной ввод и CSV', 'Основные метрики', 'Теги и заметки'],
    cta: 'Начать бесплатно',
  },
  {
    name: 'Trader',
    price: '499 ₽',
    note: 'в месяц',
    items: ['CEX и кошельки', 'Риск-менеджер', 'Расширенные отчёты'],
    cta: 'Выбрать Trader',
    featured: true,
  },
  {
    name: 'PRO + AI',
    price: 'По запросу',
    note: 'для глубокой работы',
    items: ['PRO-перекосы и серии', 'AI-разбор контекста', 'Приоритетный sync'],
    cta: 'Попробовать PRO',
  },
];

const faq = [
  [
    'Безопасно ли подключать биржу?',
    'Да. Используется доступ только для чтения — без вывода средств и торговли.',
  ],
  [
    'Какие биржи поддерживаются?',
    'Источники подключаются через CEX API, криптокошелёк или импорт файла.',
  ],
  [
    'Что такое AI-разбор?',
    'Это анализ повторяющихся решений и контекста на основе вашей торговой истории.',
  ],
  [
    'Можно ли экспортировать данные?',
    'Да, сделки и отчёты можно выгрузить из рабочего пространства.',
  ],
];

const demoEquity = [
  { day: '01.07', value: 10000, r: 0 },
  { day: '03.07', value: 10240, r: 1.2 },
  { day: '05.07', value: 10110, r: -0.65 },
  { day: '07.07', value: 10580, r: 2.35 },
  { day: '09.07', value: 10490, r: -0.45 },
  { day: '11.07', value: 10940, r: 2.25 },
  { day: '13.07', value: 11280, r: 1.7 },
];

const demoTrades = [
  ['BTCUSDT', 'Long', 'Breakout', '+2.35R', '+470 USDT'],
  ['ETHUSDT', 'Short', 'Retest', '-0.65R', '-130 USDT'],
  ['SOLUSDT', 'Long', 'Momentum', '+1.70R', '+340 USDT'],
];

function DynamicMarketWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const pointer = pointerRef.current;
      const phase = reduceMotion ? 0 : time * 0.00032;
      context.globalCompositeOperation = 'lighter';

      for (let band = 0; band < 9; band += 1) {
        const alpha = 0.09 + band * 0.012;
        const amplitude = 26 + band * 5;
        const offset = (band - 4) * 10;
        context.beginPath();
        for (let point = 0; point <= 120; point += 1) {
          const x = (point / 120) * width;
          const normalized = x / Math.max(width, 1);
          const influence = Math.exp(-Math.pow(normalized - pointer.x, 2) / 0.035);
          const y =
            height * 0.53 +
            offset +
            Math.sin(normalized * 9.5 + phase * (1 + band * 0.05) + band * 0.65) * amplitude +
            Math.sin(normalized * 22 - phase * 1.7 + band) * 7 -
            influence * (pointer.y - 0.5) * 80;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
          if (point % 5 === band % 5) {
            context.moveTo(x + 0.01, y);
            context.arc(x, y, 0.55 + influence * 1.5, 0, Math.PI * 2);
          }
        }
        context.strokeStyle = `rgba(245,245,245,${alpha})`;
        context.lineWidth = band === 4 ? 1.15 : 0.55;
        context.stroke();
      }

      context.globalCompositeOperation = 'source-over';
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      };
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    draw(0);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
    };
  }, [reduceMotion]);

  return <canvas ref={canvasRef} className="spatial-wave-canvas" aria-hidden="true" />;
}

function DemoProductPanel({ scene }: { scene: (typeof productScenes)[number] }) {
  return (
    <div className="spatial-product-panel">
      <div className="spatial-product-topbar">
        <span>TradeumDiary / {scene.title}</span>
        <span className="spatial-demo-status">Интерактивное демо</span>
      </div>
      <div className="spatial-product-body">
        <aside>
          {productScenes.map((item) => (
            <span className={item.id === scene.id ? 'active' : ''} key={item.id}>
              {item.number} {item.title}
            </span>
          ))}
        </aside>
        <div className="spatial-demo-workspace">
          {scene.id === 'journal' ? <JournalDemo /> : null}
          {scene.id === 'analytics' ? <AnalyticsDemo /> : null}
          {scene.id === 'risk' ? <RiskDemo /> : null}
          {scene.id === 'ai' ? <AiDemo /> : null}
        </div>
      </div>
    </div>
  );
}

function DemoMetrics() {
  return (
    <div className="spatial-demo-metrics">
      <div>
        <span>Баланс</span>
        <strong>11 280 USDT</strong>
        <small>+12,8% за период</small>
      </div>
      <div>
        <span>Win rate</span>
        <strong>62,5%</strong>
        <small>15 из 24 сделок</small>
      </div>
      <div>
        <span>Profit factor</span>
        <strong>1,84</strong>
        <small>цель ≥ 1,50</small>
      </div>
      <div>
        <span>Средний R</span>
        <strong>+0,53R</strong>
        <small>на сделку</small>
      </div>
    </div>
  );
}

function JournalDemo() {
  return (
    <div className="spatial-demo-stack">
      <DemoMetrics />
      <div className="spatial-demo-chart-row">
        <div className="spatial-demo-chart">
          <header>
            <span>Динамика капитала</span>
            <small>01–13 июля</small>
          </header>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demoEquity} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#202020" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 8, fill: '#666' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 8, fill: '#666' }}
                tickLine={false}
                axisLine={false}
                domain={[9800, 11400]}
              />
              <Tooltip
                contentStyle={{ background: '#0b0b0b', border: '1px solid #333', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f1f1ef"
                fill="#222"
                strokeWidth={1.7}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="spatial-demo-context">
          <span>Последняя запись</span>
          <strong>BTCUSDT · Breakout</strong>
          <p>Вход после ретеста уровня. Риск соблюдён, импульс подтверждён объёмом.</p>
          <div>
            <span>Результат</span>
            <b>+2.35R</b>
          </div>
        </div>
      </div>
      <DemoTrades />
    </div>
  );
}

function DemoTrades() {
  return (
    <div className="spatial-demo-table" role="table" aria-label="Пример журнала сделок">
      <div className="head" role="row">
        <span>Инструмент</span>
        <span>Сторона</span>
        <span>Сетап</span>
        <span>R</span>
        <span>P&amp;L</span>
      </div>
      {demoTrades.map((trade) => (
        <div role="row" key={trade[0]}>
          {trade.map((cell) => (
            <span key={cell}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function AnalyticsDemo() {
  return (
    <div className="spatial-demo-stack">
      <DemoMetrics />
      <div className="spatial-analytics-grid">
        <div className="spatial-demo-chart wide">
          <header>
            <span>Результат в R</span>
            <small>24 сделки</small>
          </header>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demoEquity} margin={{ top: 18, right: 12, left: -28 }}>
              <CartesianGrid stroke="#202020" vertical={false} />
              <XAxis dataKey="day" hide />
              <YAxis tick={{ fontSize: 8, fill: '#666' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0b0b0b', border: '1px solid #333', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="r"
                stroke="#eee"
                dot={{ r: 2, fill: '#eee' }}
                strokeWidth={1.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="spatial-setup-list">
          <span>Сетапы</span>
          <div>
            <b>Breakout</b>
            <em>+7.2R</em>
          </div>
          <div>
            <b>Retest</b>
            <em>+3.8R</em>
          </div>
          <div>
            <b>Momentum</b>
            <em>+1.7R</em>
          </div>
        </div>
      </div>
      <DemoTrades />
    </div>
  );
}

function RiskDemo() {
  return (
    <div className="spatial-demo-stack">
      <div className="spatial-demo-risk-cards">
        {[
          ['Риск на сделку', '1,0%', '62%'],
          ['Лимит на день', '3,0%', '38%'],
          ['Макс. просадка', '8,0%', '46%'],
        ].map(([label, value, progress]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <div>
              <i style={{ width: progress }} />
            </div>
            <small>В пределах правила</small>
          </div>
        ))}
      </div>
      <div className="spatial-risk-timeline">
        <header>
          <span>Контроль сессии</span>
          <small>Сегодня</small>
        </header>
        {[
          ['09:42', 'BTCUSDT', 'Риск 0,8%', 'Разрешено'],
          ['11:18', 'ETHUSDT', 'Риск 1,0%', 'Разрешено'],
          ['14:06', 'SOLUSDT', 'Дневной риск 2,8%', 'Предупреждение'],
        ].map((row) => (
          <div key={row[0]}>
            {row.map((cell) => (
              <span key={cell}>{cell}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="spatial-demo-rule">
        <Icon name="shield" size={18} />
        <div>
          <strong>Правила активны</strong>
          <span>Следующая сделка будет заблокирована при достижении дневного лимита.</span>
        </div>
      </div>
    </div>
  );
}

function AiDemo() {
  return (
    <div className="spatial-demo-stack spatial-ai-demo">
      <div className="spatial-ai-score">
        <span>Дисциплина</span>
        <strong>8,7</strong>
        <small>/ 10</small>
        <p>Стабильнее, чем в предыдущем периоде</p>
      </div>
      <div className="spatial-ai-insight">
        <span>Обнаруженный паттерн</span>
        <h3>После двух прибыльных сделок вы повышаете риск в 1,6 раза</h3>
        <p>
          Это увеличивает среднюю просадку следующей сделки. Сохраните базовый риск 1% до конца
          сессии.
        </p>
        <div>
          <b>Основано на 18 сессиях</b>
          <em>Высокая уверенность</em>
        </div>
      </div>
      <div className="spatial-ai-actions">
        <button type="button">Добавить правило риска</button>
        <button type="button">Посмотреть сделки</button>
      </div>
    </div>
  );
}

function HeroConstellation() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="spatial-constellation" aria-label="Интерфейс TradeumDiary">
      <motion.div
        className="spatial-layer spatial-layer-main"
        animate={reduceMotion ? undefined : { y: [0, -10, 0], rotateX: [0, 1.2, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="spatial-layer-head">
          <span>Демо-портфель</span>
          <span>13 июля</span>
        </div>
        <div className="spatial-layer-title">Динамика капитала</div>
        <div className="spatial-chart-live">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demoEquity} margin={{ top: 18, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid stroke="#202020" vertical={false} />
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[9800, 11400]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f1f1ef"
                fill="#202020"
                strokeWidth={1.8}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div>
            <span>Баланс</span>
            <strong>11 280 USDT</strong>
            <small>+12,8%</small>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="spatial-layer spatial-layer-trade"
        animate={reduceMotion ? undefined : { y: [0, 9, 0], rotateZ: [-5, -3.5, -5] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="spatial-mono">ПОСЛЕДНЯЯ СДЕЛКА</span>
        <h3>BTCUSDT · Long</h3>
        <p>Breakout · риск 0,8% · результат +2.35R</p>
        <div className="spatial-trade-result">
          <strong>+470 USDT</strong>
          <span>План соблюдён</span>
        </div>
      </motion.div>
      <motion.div
        className="spatial-layer spatial-layer-ai"
        animate={reduceMotion ? undefined : { y: [0, -7, 0], rotateZ: [4, 5.5, 4] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="spatial-mono">AI-РАЗБОР · ДЕМО</span>
        <h3>Риск растёт после серии побед</h3>
        <p>Сохраняйте базовый риск 1% до завершения сессии.</p>
        <div className="spatial-confidence">
          <span>Уверенность</span>
          <strong>87%</strong>
        </div>
      </motion.div>
    </div>
  );
}

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeScene, setActiveScene] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const scene = productScenes[activeScene];

  return (
    <main className="spatial-landing">
      <section className="spatial-hero">
        <div className="spatial-hero-copy">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Ваш журнал.
            <br />
            Ваше преимущество.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
          >
            Посмотрите интерактивное демо, а затем подключите свои сделки, чтобы превратить риск и
            контекст в ясную систему решений.
          </motion.p>
          <motion.div
            className="spatial-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link className="spatial-primary" to="/register">
              Начать бесплатно <span>↗</span>
            </Link>
            <a href="#workspace">
              Смотреть продукт <span>↓</span>
            </a>
          </motion.div>
          <div className="spatial-trust">
            <Icon name="shield" size={14} /> Только чтение. Средства не переводятся.
          </div>
        </div>
        <HeroConstellation />
        <DynamicMarketWave />
      </section>

      <section className="spatial-stage" id="workspace">
        <div className="spatial-stage-nav">
          <span>{scene.number} — 04</span>
          <h2>
            Журнал, аналитика,
            <br />
            риск и AI в одном
            <br />
            рабочем пространстве.
          </h2>
          <p>Каждая сделка. Каждый контекст. Каждое решение под контролем.</p>
          <div role="tablist" aria-label="Возможности продукта">
            {productScenes.map((item, index) => (
              <button
                key={item.id}
                className={activeScene === index ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={activeScene === index}
                onClick={() => setActiveScene(index)}
              >
                <span>{item.number}</span>
                {item.title}
              </button>
            ))}
          </div>
        </div>
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42 }}
          className="spatial-stage-screen"
        >
          <DemoProductPanel scene={scene} />
          <div className="spatial-scene-caption">
            <span>{scene.number}</span>
            <p>{scene.copy}</p>
          </div>
        </motion.div>
      </section>

      <section className="spatial-discipline">
        <div>
          <span>Риск-дисциплина</span>
          <h2>
            Защищает капитал
            <br />
            до входа в сделку.
          </h2>
        </div>
        <div className="spatial-risk-panel">
          {[
            ['Риск на сделку', '1,0%', 'Базовый лимит'],
            ['Лимит на день', '3,0%', 'Остановка после −3R'],
            ['Макс. просадка', '8,0%', 'Защита капитала'],
          ].map(([label, value, note]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          ))}
          <div className="spatial-risk-status">
            <Icon name="shield" size={20} />
            <span>Демо-набор правил активен · настройте собственные после регистрации</span>
          </div>
        </div>
      </section>

      <section className="spatial-benefits">
        {[
          ['01', 'Фокус на процессе', 'Анализируйте решения, а не только результат.'],
          ['02', 'Данные из первых рук', 'Объединяйте источники в единой истории.'],
          ['03', 'Лучшие решения', 'Находите повторяемые паттерны поведения.'],
          ['04', 'AI как ко-пилот', 'Получайте структурную обратную связь без шума.'],
        ].map(([number, title, copy]) => (
          <article key={number}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="spatial-pricing" id="pricing">
        <div className="spatial-section-title">
          <span>Тарифы</span>
          <h2>
            Начните с дневника.
            <br />
            Расширяйте систему.
          </h2>
        </div>
        <div className="spatial-pricing-frame">
          {plans.map((plan) => (
            <article className={plan.featured ? 'featured' : ''} key={plan.name}>
              <span>{plan.name}</span>
              <h3>{plan.price}</h3>
              <p>{plan.note}</p>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/register">{plan.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="spatial-faq">
        <h2>FAQ</h2>
        <div>
          {faq.map(([question, answer], index) => (
            <article key={question}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                aria-expanded={openFaq === index}
              >
                {question}
                <span>{openFaq === index ? '−' : '+'}</span>
              </button>
              {openFaq === index ? (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                  {answer}
                </motion.p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
