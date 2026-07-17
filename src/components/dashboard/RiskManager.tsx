import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, CheckCircle, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useRiskManager } from '@/hooks/useRiskManager';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { calculatePositionSize, checkRiskLimits } from '@/lib/riskCalculator';
import { formatUSD } from '@/lib/utils';

function safeParseFloat(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function RiskManager() {
  const { limits, saveLimits } = useRiskManager();
  const { trades } = useTradesOptimized({ limit: 500, daysAgo: 7 });
  const [dailyLimit, setDailyLimit] = useState(limits.daily_loss_limit);
  const [weeklyLimit, setWeeklyLimit] = useState(limits.weekly_loss_limit);
  const [positionRisk, setPositionRisk] = useState(limits.position_size_percent);
  const [maxLeverage, setMaxLeverage] = useState(limits.max_leverage);
  const [alertsEnabled, setAlertsEnabled] = useState(limits.alert_enabled);
  const [alertEmail, setAlertEmail] = useState(limits.alert_email || '');
  const [balance, setBalance] = useState('');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [risk, setRisk] = useState('2');
  const [calculation, setCalculation] = useState<ReturnType<typeof calculatePositionSize> | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const previousBreach = useRef(false);

  useEffect(() => {
    setDailyLimit(limits.daily_loss_limit);
    setWeeklyLimit(limits.weekly_loss_limit);
    setPositionRisk(limits.position_size_percent);
    setMaxLeverage(limits.max_leverage);
    setAlertsEnabled(limits.alert_enabled);
    setAlertEmail(limits.alert_email || '');
  }, [limits]);

  const todayPnl = useMemo(() => {
    const today = new Date().toDateString();
    return trades.reduce((total, trade) => {
      if (new Date(trade.timestamp).toDateString() !== today) return total;
      return total + (trade.pnl_realized || 0);
    }, 0);
  }, [trades]);

  const { dailyBreached } = checkRiskLimits(
    todayPnl,
    limits.daily_loss_limit,
    limits.weekly_loss_limit
  );

  useEffect(() => {
    if (dailyBreached && !previousBreach.current && limits.alert_enabled) {
      toast.error('Дневной лимит убытка превышен');
    }
    previousBreach.current = dailyBreached;
  }, [dailyBreached, limits.alert_enabled]);

  const validateCalculator = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    const accountBalance = safeParseFloat(balance);
    const entryPrice = safeParseFloat(entry);
    const stopPrice = safeParseFloat(stop);
    const riskPercent = safeParseFloat(risk);

    if (accountBalance <= 0) nextErrors.balance = 'Укажите баланс больше нуля';
    if (entryPrice <= 0) nextErrors.entry = 'Укажите цену входа';
    if (stopPrice <= 0) nextErrors.stop = 'Укажите стоп-лосс';
    if (riskPercent <= 0 || riskPercent > 100) nextErrors.risk = 'Допустимо от 0,1 до 100%';
    if (entryPrice > 0 && entryPrice === stopPrice) nextErrors.stop = 'Стоп не равен цене входа';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [balance, entry, stop, risk]);

  const calculate = () => {
    if (!validateCalculator()) return;
    setCalculation(
      calculatePositionSize(
        safeParseFloat(balance),
        safeParseFloat(risk),
        safeParseFloat(entry),
        safeParseFloat(stop)
      )
    );
  };

  const save = () => {
    if (dailyLimit < 0 || weeklyLimit < 0) {
      toast.error('Лимиты не могут быть отрицательными');
      return;
    }
    if (positionRisk <= 0 || positionRisk > 100) {
      toast.error('Риск на позицию должен быть от 0,1 до 100%');
      return;
    }
    saveLimits({
      daily_loss_limit: dailyLimit,
      weekly_loss_limit: weeklyLimit,
      position_size_percent: positionRisk,
      max_leverage: maxLeverage,
      alert_enabled: alertsEnabled,
      alert_email: alertEmail,
    });
  };

  return (
    <section className="risk-v3-page">
      <header className="risk-v3-heading">
        <div>
          <h1>Риск</h1>
          <p>Лимиты, размер позиции и состояние торговой дисциплины.</p>
        </div>
        <span className={dailyBreached ? 'breached' : ''}>
          {dailyBreached ? <WarningCircle size={16} /> : <CheckCircle size={16} weight="fill" />}
          {dailyBreached ? 'Лимит превышен' : 'Правила соблюдены'}
        </span>
      </header>

      <div className="risk-v3-status">
        <article>
          <span>P&amp;L сегодня</span>
          <strong className={todayPnl >= 0 ? 'positive' : 'negative'}>{formatUSD(todayPnl)}</strong>
          <small>по автоматически импортированным сделкам</small>
        </article>
        <article>
          <span>Дневной лимит</span>
          <strong>
            {limits.daily_loss_limit ? formatUSD(limits.daily_loss_limit) : 'Не настроен'}
          </strong>
          <small>максимальный допустимый убыток</small>
        </article>
        <article>
          <span>Риск на позицию</span>
          <strong>{limits.position_size_percent}%</strong>
          <small>максимальное плечо {limits.max_leverage}x</small>
        </article>
      </div>

      <div className="risk-v3-grid">
        <section className="risk-v3-tool">
          <header>
            <div>
              <Calculator size={20} />
              <span>
                <h2>Калькулятор позиции</h2>
                <p>Рассчитайте объём до открытия сделки.</p>
              </span>
            </div>
          </header>
          <div className="risk-v3-fields">
            {[
              {
                key: 'balance',
                label: 'Баланс, $',
                value: balance,
                setter: setBalance,
                error: errors.balance,
              },
              { key: 'risk', label: 'Риск, %', value: risk, setter: setRisk, error: errors.risk },
              {
                key: 'entry',
                label: 'Цена входа',
                value: entry,
                setter: setEntry,
                error: errors.entry,
              },
              { key: 'stop', label: 'Стоп-лосс', value: stop, setter: setStop, error: errors.stop },
            ].map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  type="number"
                  value={field.value}
                  onChange={(event) => field.setter(event.target.value)}
                  placeholder="0"
                />
                {field.error ? <small>{field.error}</small> : null}
              </label>
            ))}
          </div>
          <button type="button" className="risk-v3-primary" onClick={calculate}>
            Рассчитать позицию
          </button>
          {calculation ? (
            <div className="risk-v3-result">
              <div>
                <span>Количество</span>
                <strong>{calculation.positionSize}</strong>
              </div>
              <div>
                <span>Стоимость позиции</span>
                <strong>{formatUSD(calculation.positionSizeUSD)}</strong>
              </div>
              <div>
                <span>Риск</span>
                <strong>{formatUSD(calculation.riskAmount)}</strong>
              </div>
              <div>
                <span>Расстояние до стопа</span>
                <strong>{calculation.stopDistancePercent}%</strong>
              </div>
            </div>
          ) : null}
        </section>

        <section className="risk-v3-tool">
          <header>
            <div>
              <ShieldCheck size={20} />
              <span>
                <h2>Торговые лимиты</h2>
                <p>Система предупредит до нарушения правил.</p>
              </span>
            </div>
          </header>
          <div className="risk-v3-fields">
            {[
              { key: 'daily', label: 'Дневной лимит, $', value: dailyLimit, setter: setDailyLimit },
              {
                key: 'weekly',
                label: 'Недельный лимит, $',
                value: weeklyLimit,
                setter: setWeeklyLimit,
              },
              {
                key: 'position',
                label: 'Риск на позицию, %',
                value: positionRisk,
                setter: setPositionRisk,
              },
              {
                key: 'leverage',
                label: 'Максимальное плечо',
                value: maxLeverage,
                setter: setMaxLeverage,
              },
            ].map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  type="number"
                  min="0"
                  value={field.value}
                  onChange={(event) =>
                    field.setter(safeParseFloat(event.target.value, field.value))
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="risk-v3-toggle-row"
            onClick={() => setAlertsEnabled((value) => !value)}
          >
            <span>
              <strong>Предупреждения о риске</strong>
              <small>Сообщать о приближении к лимиту.</small>
            </span>
            <i className={alertsEnabled ? 'on' : ''} />
          </button>
          {alertsEnabled ? (
            <label className="risk-v3-email">
              Email для уведомлений
              <input
                type="email"
                value={alertEmail}
                onChange={(event) => setAlertEmail(event.target.value)}
                placeholder="trader@example.com"
              />
            </label>
          ) : null}
          <button type="button" className="risk-v3-primary" onClick={save}>
            Сохранить лимиты
          </button>
        </section>
      </div>
    </section>
  );
}
