import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowClockwise,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  LockKey,
  Receipt,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  formatBillingDate,
  resolveBillingViewState,
  type PaymentRecord,
  type SubscriptionSummary,
} from '@/lib/billing';

const paymentLabels: Record<PaymentRecord['status'], string> = {
  pending: 'Ожидает оплаты',
  succeeded: 'Оплачен',
  canceled: 'Отменён',
  failed: 'Не создан',
  refunded: 'Возвращён',
};

export function Payment() {
  const { user, isLoading: authLoading, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const returnedFromProvider = searchParams.get('return') === '1';
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [summary, history] = await Promise.all([
      api.get<SubscriptionSummary>('/billing/subscription'),
      api.get<{ payments: PaymentRecord[] }>('/billing/payments'),
    ]);
    setSubscription(summary);
    setPayments(history.payments);
    if (user && summary.plan === 'pro' && user.subscription_tier !== 'pro') {
      setUser({
        ...user,
        subscription_tier: 'pro',
        subscription_expires_at: summary.current_period_end || undefined,
      });
    } else if (user && summary.plan === 'free' && user.subscription_tier === 'pro') {
      setUser({ ...user, subscription_tier: 'free', subscription_expires_at: undefined });
    }
    return summary;
  }, [setUser, user]);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((requestError) => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : 'Не удалось загрузить оплату'
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!returnedFromProvider || loading || subscription?.plan === 'pro') return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void refresh().then((summary) => {
        if (summary.plan === 'pro' || attempts >= 12) window.clearInterval(timer);
      });
    }, 2_500);
    return () => window.clearInterval(timer);
  }, [loading, refresh, returnedFromProvider, subscription?.plan]);

  const state = useMemo(
    () => resolveBillingViewState({ loading, returnedFromProvider, subscription }),
    [loading, returnedFromProvider, subscription]
  );

  if (authLoading) return <div className="payment-v6-loading">Проверяем аккаунт…</div>;
  if (!user) return <Navigate to="/register" replace state={{ from: '/payment' }} />;

  const startCheckout = async () => {
    setStarting(true);
    setError(null);
    try {
      const checkout = await api.post<{ confirmation_url: string }>('/billing/checkout');
      window.location.assign(checkout.confirmation_url);
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error ? checkoutError.message : 'Не удалось создать платёж';
      setError(message);
      toast.error(message);
      setStarting(false);
    }
  };

  return (
    <main className="payment-v6-page public-v9-payment billing-v14-page">
      <Link className="payment-v6-back" to="/subscribe">
        <ArrowLeft size={17} /> Вернуться к тарифам
      </Link>

      <section className="billing-v14-hero">
        <div>
          <span className="payment-v6-icon">
            <ShieldCheck size={25} weight="duotone" />
          </span>
          <p>Tradeum PRO · 499 ₽ в месяц</p>
          {state === 'loading' && <h1>Проверяем подписку…</h1>}
          {state === 'unavailable' && <h1>Платёжный магазин ещё не подключён</h1>}
          {state === 'ready' && <h1>Оформите PRO через защищённую страницу ЮKassa</h1>}
          {state === 'checking' && <h1>Ожидаем серверное подтверждение оплаты</h1>}
          {state === 'active' && (
            <h1>PRO активен до {formatBillingDate(subscription?.current_period_end || null)}</h1>
          )}
          <span>
            {state === 'unavailable'
              ? 'Tradeum не создаст платёж и не запросит карту, пока владелец проекта не подключит тестовый или рабочий магазин.'
              : state === 'active'
                ? 'Продление выполняется вручную: автоматического списания и скрытых платежей нет.'
                : 'Данные карты не проходят через Tradeum. Доступ включается только после проверенного события payment.succeeded.'}
          </span>
          {error && (
            <div className="billing-v14-error" role="alert">
              {error}
            </div>
          )}
          <div className="billing-v14-actions">
            {state === 'ready' && (
              <button type="button" onClick={startCheckout} disabled={starting}>
                <CreditCard size={18} /> {starting ? 'Создаём платёж…' : 'Перейти к оплате 499 ₽'}
              </button>
            )}
            {state === 'checking' && (
              <button type="button" onClick={() => void refresh()}>
                <ArrowClockwise size={18} /> Проверить ещё раз
              </button>
            )}
            {state === 'active' && <Link to="/dashboard">Открыть рабочее пространство</Link>}
            <Link to="/dashboard">Продолжить без оплаты</Link>
          </div>
        </div>

        <aside className="payment-v6-readiness">
          <h2>Как защищена активация</h2>
          <ul>
            <li>
              <LockKey size={19} />
              <span>
                <strong>Checkout провайдера</strong>
                <small>Tradeum не принимает реквизиты карты.</small>
              </span>
            </li>
            <li>
              <Clock size={19} />
              <span>
                <strong>Возврат не равен оплате</strong>
                <small>Страница ждёт подтверждение backend.</small>
              </span>
            </li>
            <li>
              <CheckCircle size={19} />
              <span>
                <strong>Проверенный webhook</strong>
                <small>Сервер сверяет платёж через API ЮKassa.</small>
              </span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="billing-v14-history" aria-labelledby="billing-history-title">
        <header>
          <div>
            <p>История платежей</p>
            <h2 id="billing-history-title">Последние операции</h2>
          </div>
          <Receipt size={22} />
        </header>
        {payments.length ? (
          <div className="billing-v14-list">
            {payments.map((payment) => (
              <article key={payment.id}>
                <span>
                  <strong>PRO · 1 месяц</strong>
                  <small>{formatBillingDate(payment.created_at)}</small>
                </span>
                <b>{payment.amount} ₽</b>
                <em data-status={payment.status}>{paymentLabels[payment.status]}</em>
              </article>
            ))}
          </div>
        ) : (
          <p className="billing-v14-empty">Платежей пока нет. Деньги не списывались.</p>
        )}
      </section>
    </main>
  );
}
