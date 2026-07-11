import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

const plans = [
  {
    name: 'Free',
    price: '0 ₽',
    note: 'Навсегда',
    description: 'Для начала системной работы со сделками.',
    features: ['Ручной ввод и CSV', 'Основные метрики', 'Теги и заметки', '30 дней истории'],
    action: 'Начать бесплатно',
    kind: 'free' as const,
  },
  {
    name: 'Trader',
    price: '499 ₽',
    note: 'в месяц',
    description: 'Полный дневник, автоматизация и риск-контроль.',
    features: [
      'CEX и криптокошельки',
      'Полная история',
      'Риск-менеджер',
      'Расширенные отчёты',
      'Экспорт CSV, Excel и PDF',
    ],
    action: 'Выбрать Trader',
    kind: 'trader' as const,
    featured: true,
  },
  {
    name: 'PRO + AI',
    price: 'Скоро',
    note: 'ранний доступ',
    description: 'Глубокий разбор поведения и торгового контекста.',
    features: [
      'PRO-перекосы и серии',
      'AI-разбор ошибок',
      'Слабые сетапы',
      'Персональные рекомендации',
    ],
    action: 'Открывается позже',
    kind: 'ai' as const,
    disabled: true,
  },
];

export function NewSubscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [periodOpen, setPeriodOpen] = useState(false);
  if (user?.subscription_tier === 'pro') return <Navigate to="/dashboard" replace />;

  const selectPlan = (kind: 'free' | 'trader' | 'ai') => {
    if (kind === 'ai') return;
    if (!user) {
      localStorage.setItem('selectedPlan', kind === 'trader' ? 'pro' : 'free');
      navigate('/register');
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
    <div className="subscribe-page">
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
              {plan.featured && <small>Основной тариф</small>}
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
            <button type="button" disabled={plan.disabled} onClick={() => selectPlan(plan.kind)}>
              {plan.action}
            </button>
          </article>
        ))}
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
                <p>Тариф Trader</p>
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
                <small>Два месяца бесплатно</small>
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
