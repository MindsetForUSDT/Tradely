import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icons';
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
  const [searchParams] = useSearchParams();
  const [periodOpen, setPeriodOpen] = useState(false);

  useEffect(() => {
    if (user && searchParams.get('selected') === 'pro') setPeriodOpen(true);
  }, [searchParams, user]);

  if (user?.subscription_tier === 'pro') return <Navigate to="/dashboard" replace />;

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
    setPeriodOpen(true);
  };
  const selectPeriod = (period: 'month' | 'year') => {
    localStorage.setItem('selectedPlan', 'pro');
    localStorage.setItem('selectedPeriod', period);
    setPeriodOpen(false);
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
              {plan.action}
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
          <strong>Оплата ещё не подключена</strong>
          <p>
            До запуска защищённого checkout Tradeum не запросит карту и не изменит тариф без
            подтверждённого платежа.
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
      {periodOpen && (
        <div className="period-overlay" role="dialog" aria-modal="true" aria-label="Выбор периода">
          <button
            className="period-backdrop"
            type="button"
            onClick={() => setPeriodOpen(false)}
            aria-label="Закрыть"
          />
          <div className="period-modal">
            <div className="period-modal-head">
              <div>
                <p>Тариф PRO</p>
                <h2>Выберите период</h2>
              </div>
              <button type="button" onClick={() => setPeriodOpen(false)} aria-label="Закрыть">
                <Icon name="close" size={19} />
              </button>
            </div>
            <button type="button" onClick={() => selectPeriod('month')}>
              <span>
                <strong>Ежемесячно</strong>
                <small>Гибкая оплата</small>
              </span>
              <b>499 ₽</b>
            </button>
            <button type="button" className="recommended" onClick={() => selectPeriod('year')}>
              <span>
                <strong>Ежегодно</strong>
                <small>Экономия 998 ₽ за год</small>
              </span>
              <b>4 990 ₽</b>
            </button>
            <p>Оплата будет подтверждена на следующем шаге.</p>
          </div>
        </div>
      )}
    </div>
  );
}
