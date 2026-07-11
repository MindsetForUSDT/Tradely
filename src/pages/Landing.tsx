import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
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

function EmptyProductPanel({ scene }: { scene: (typeof productScenes)[number] }) {
  return (
    <div className="spatial-product-panel">
      <div className="spatial-product-topbar">
        <span>TradeumDiary / {scene.title}</span>
        <span className="spatial-live-dot">Источник не подключён</span>
      </div>
      <div className="spatial-product-body">
        <aside>
          {productScenes.map((item) => (
            <span className={item.id === scene.id ? 'active' : ''} key={item.id}>
              {item.number} {item.title}
            </span>
          ))}
        </aside>
        <div className="spatial-empty-state">
          <div className="spatial-empty-icon">
            <Icon name="wallet" size={22} />
          </div>
          <span>Ваши данные появятся здесь</span>
          <h3>Подключите источник сделок</h3>
          <p>
            Мы не показываем демо-прибыль и выдуманные метрики. После подключения здесь будет только
            ваша история.
          </p>
          <Link to="/register">
            Подключить источник <span>↗</span>
          </Link>
        </div>
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
          <span>Обзор</span>
          <span>•••</span>
        </div>
        <div className="spatial-layer-title">Динамика капитала</div>
        <div className="spatial-chart-empty">
          <span>Подключите источник, чтобы увидеть динамику</span>
        </div>
      </motion.div>
      <motion.div
        className="spatial-layer spatial-layer-trade"
        animate={reduceMotion ? undefined : { y: [0, 9, 0], rotateZ: [-5, -3.5, -5] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="spatial-mono">НОВАЯ СДЕЛКА</span>
        <h3>Контекст важнее цифры</h3>
        <p>Инструмент · направление · риск · заметка</p>
        <div className="spatial-fields">
          <i />
          <i />
          <i />
        </div>
      </motion.div>
      <motion.div
        className="spatial-layer spatial-layer-ai"
        animate={reduceMotion ? undefined : { y: [0, -7, 0], rotateZ: [4, 5.5, 4] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="spatial-mono">AI-РАЗБОР</span>
        <h3>Инсайты появятся после накопления данных</h3>
        <div className="spatial-ai-lines">
          <i />
          <i />
          <i />
          <i />
        </div>
      </motion.div>
    </div>
  );
}

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeScene, setActiveScene] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const waveX = useTransform(scrollYProgress, [0, 0.5], ['-3%', '3%']);

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
            TradeumDiary превращает сделки, риск и контекст в ясную систему решений — без демо-цифр
            и лишнего шума.
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
        <motion.img
          className="spatial-wave"
          src="/tradeum-data-wave.png"
          alt=""
          aria-hidden="true"
          style={reduceMotion ? undefined : { x: waveX }}
        />
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
          <EmptyProductPanel scene={scene} />
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
          {['Риск на сделку', 'Лимит на день', 'Макс. просадка'].map((label) => (
            <div key={label}>
              <span>{label}</span>
              <strong>—</strong>
              <small>Установите лимит в рабочем пространстве</small>
            </div>
          ))}
          <div className="spatial-risk-status">
            <Icon name="shield" size={20} />
            <span>Правила ещё не настроены</span>
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
