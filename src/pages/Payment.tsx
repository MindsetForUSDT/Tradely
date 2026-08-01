import { ArrowLeft, CheckCircle, LockKey, ShieldCheck } from '@phosphor-icons/react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function Payment() {
  const { user, isLoading } = useAuth();
  const selectedPlan = localStorage.getItem('selectedPlan');
  const selectedPeriod = localStorage.getItem('selectedPeriod') === 'year' ? 'year' : 'month';

  if (isLoading) return <div className="payment-v6-loading">Проверяем аккаунт…</div>;
  if (!user) {
    return <Navigate to="/register" replace state={{ from: '/payment' }} />;
  }
  if (selectedPlan !== 'pro') return <Navigate to="/subscribe" replace />;

  const price = selectedPeriod === 'year' ? '4 990 ₽ в год' : '499 ₽ в месяц';

  return (
    <main className="payment-v6-page public-v9-payment">
      <Link className="payment-v6-back" to="/subscribe">
        <ArrowLeft size={17} />
        Вернуться к тарифам
      </Link>
      <section className="payment-v6-shell">
        <div className="payment-v6-copy">
          <span className="payment-v6-icon">
            <ShieldCheck size={25} weight="duotone" />
          </span>
          <p>Выбор сохранён</p>
          <h1>Оформление PRO пока недоступно</h1>
          <span>
            Tradeum не запрашивает данные карты и не активирует подписку, пока защищённый checkout и
            подтверждение оплаты на сервере не подключены.
          </span>
          <div className="payment-v6-selection">
            <span>
              <small>Тариф</small>
              <strong>PRO</strong>
            </span>
            <span>
              <small>Период</small>
              <strong>{selectedPeriod === 'year' ? 'Ежегодно' : 'Ежемесячно'}</strong>
            </span>
            <span>
              <small>Стоимость</small>
              <strong>{price}</strong>
            </span>
          </div>
          <div className="payment-v6-actions">
            <Link to="/subscribe">Изменить период</Link>
            <Link to="/dashboard">Продолжить на Free</Link>
          </div>
        </div>
        <aside className="payment-v6-readiness">
          <h2>Что произойдёт после запуска оплаты</h2>
          <ul>
            <li>
              <LockKey size={19} />
              <span>
                <strong>Переход к платёжному провайдеру</strong>
                <small>Данные карты не будут проходить через Tradeum.</small>
              </span>
            </li>
            <li>
              <CheckCircle size={19} />
              <span>
                <strong>Серверное подтверждение</strong>
                <small>PRO включится только после подтверждённого платежа.</small>
              </span>
            </li>
            <li>
              <ShieldCheck size={19} />
              <span>
                <strong>Free остаётся активным</strong>
                <small>Текущие данные и доступ к дневнику не пропадут.</small>
              </span>
            </li>
          </ul>
          <p>Сейчас платёж не создан, деньги не списаны, тариф аккаунта не изменён.</p>
        </aside>
      </section>
      <p className="payment-v9-footnote">
        Этот экран фиксирует выбранный тариф, но не создаёт платёж и не списывает средства.
      </p>
    </main>
  );
}
