import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Check, ShieldCheck, X } from '@phosphor-icons/react';

const plans = [
  {
    name: 'Free',
    price: '0 ₽',
    note: 'Навсегда',
    description: 'Необходимый минимум для ведения торгового дневника.',
    features: [
      'Обзор и базовые метрики',
      'Разбор отдельных сделок',
      'Сетапы, эмоции и заметки',
      'История за последние 30 дней',
    ],
    action: 'Начать бесплатно',
    kind: 'free' as const,
  },
  {
    name: 'PRO',
    price: '499 ₽',
    note: 'в месяц',
    description: 'Автоматизация, глубокая аналитика и контроль риска.',
    features: [
      'Автосинхронизация Bybit',
      'Полная история',
      'Диагностика убытков и комиссий',
      'Правила и история дисциплины',
      'PRO-аналитика торговых паттернов',
    ],
    action: 'Выбрать PRO',
    kind: 'pro' as const,
    featured: true,
  },
];

export function NewSubscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const selectPlan = (kind: 'free' | 'pro') => {
    if (!user) {
      localStorage.setItem('selectedPlan', kind);
      navigate('/register', {
        state: { from: kind === 'pro' ? '/subscribe?selected=pro' : '/dashboard' },
      });
      return;
    }
    if (kind === 'free') {
      navigate('/dashboard');
      return;
    }
    localStorage.setItem('selectedPlan', 'pro');
    navigate('/payment');
  };

  return (
    <div className="subscribe-page public-v9-subscribe">
      <header className="subscribe-head">
        <p>Тарифы TradeumDiary</p>
        <h1>
          Платите за инструменты,
          <br />
          которые усиливают систему.
        </h1>
        <span>
          Начните бесплатно. Подключите автоматизацию, когда она станет частью вашего процесса.
        </span>
      </header>
      <section className="subscribe-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={plan.featured ? 'featured' : ''}>
            <div className="subscribe-plan-head">
              <span>{plan.name}</span>
              {plan.featured && <small>Полный доступ</small>}
            </div>
            <h2>
              {plan.price} <small>{plan.note}</small>
            </h2>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" onClick={() => selectPlan(plan.kind)}>
              {plan.kind === 'pro' && user?.subscription_tier === 'pro'
                ? 'Управлять PRO'
                : plan.action}
            </button>
          </article>
        ))}
      </section>
      <section className="subscribe-compare" aria-labelledby="compare-title">
        <header>
          <p>Сравнение без мелкого шрифта</p>
          <h2 id="compare-title">Что именно меняется после перехода на PRO</h2>
        </header>
        <div role="table" aria-label="Сравнение тарифов">
          <div role="row" className="subscribe-compare-head">
            <span role="columnheader">Возможность</span>
            <span role="columnheader">Free</span>
            <span role="columnheader">PRO</span>
          </div>
          {[
            ['История сделок', '30 дней', 'Полная'],
            ['Синхронизация Bybit', false, true],
            ['Диагностика убытков', false, true],
            ['Риск и дисциплина', 'Базово', 'Полностью'],
            ['Заметки и контекст', true, true],
          ].map(([label, free, pro]) => (
            <div role="row" key={String(label)}>
              <strong role="cell">{label}</strong>
              <span role="cell">
                {typeof free === 'boolean' ? free ? <Check size={16} /> : <X size={15} /> : free}
              </span>
              <span role="cell">
                {typeof pro === 'boolean' ? pro ? <Check size={16} /> : <X size={15} /> : pro}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="subscribe-safety">
        <ShieldCheck size={24} />
        <div>
          <strong>Защищённая оплата через ЮKassa</strong>
          <p>
            Карта не передаётся Tradeum, а PRO включается только после серверного подтверждения
            платежа.
          </p>
        </div>
        <Link to="/features">Изучить возможности</Link>
      </section>
      <div className="subscribe-note">
        <span>Без скрытых платежей</span>
        <span>Отмена в любой момент</span>
        <span>Данные остаются вашими</span>
      </div>
      <p className="subscribe-contact">
        Нужна помощь с выбором? <Link to="/#faq">Посмотрите ответы</Link>
      </p>
    </div>
  );
}
