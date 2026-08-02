import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, CheckCircle, Minus, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useRiskManager } from '@/hooks/useRiskManager';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { buildDisciplineHistory } from '@/lib/productExperience';
import { calculatePositionSize } from '@/lib/riskCalculator';
import { buildRiskDisciplineSnapshot, type RiskWindowSnapshot } from '@/lib/riskDiscipline';
import { formatSignedUSD } from '@/lib/tradeAnalytics';
import { formatUSD } from '@/lib/utils';

function safeParseFloat(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const riskStatusCopy = {
  'not-configured': 'Лимит не настроен',
  'no-trades': 'Сделок пока нет',
  safe: 'В пределах правила',
  warning: 'Использовано 80% лимита',
  breached: 'Лимит достигнут',
} as const;

function RiskWindowCard({ label, snapshot }: { label: string; snapshot: RiskWindowSnapshot }) {
  const progress = Math.min(100, snapshot.usagePercent || 0);
  return (
    <article className={`risk-v11-window ${snapshot.status}`}>
      <header>
        <span>{label}</span>
        <small>{riskStatusCopy[snapshot.status]}</small>
      </header>
      <strong className={snapshot.netPnl >= 0 ? 'positive' : 'negative'}>
        {formatSignedUSD(snapshot.netPnl)}
      </strong>
      <div className="risk-v11-meter" aria-label={`Использование лимита: ${progress.toFixed(0)}%`}>
        <i style={{ width: `${progress}%` }} />
      </div>
      <footer>
        <span>{snapshot.trades} завершённых сделок</span>
        <span>
          {snapshot.remaining === null
            ? 'Задайте лимит'
            : snapshot.status === 'breached'
              ? 'Остаток: $0'
              : `Остаток: ${formatUSD(snapshot.remaining)}`}
        </span>
      </footer>
    </article>
  );
}

export function RiskManager() {
  const { limits, saveLimits } = useRiskManager();
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 14 });
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

  const riskSnapshot = useMemo(
    () =>
      buildRiskDisciplineSnapshot(trades, {
        daily: limits.daily_loss_limit,
        weekly: limits.weekly_loss_limit,
      }),
    [trades, limits.daily_loss_limit, limits.weekly_loss_limit]
  );

  const disciplineHistory = useMemo(
    () => buildDisciplineHistory(trades, limits.daily_loss_limit, new Date(), 14),
    [trades, limits.daily_loss_limit]
  );
  const disciplineSummary = useMemo(() => {
    const activeDays = disciplineHistory.filter((day) => day.trades > 0);
    const configuredDays = activeDays.filter((day) => day.limitUsage !== null);
    return {
      activeDays: activeDays.length,
      violations: disciplineHistory.filter((day) => day.status === 'breached').length,
      averageUsage: configuredDays.length
        ? configuredDays.reduce((sum, day) => sum + (day.limitUsage || 0), 0) /
          configuredDays.length
        : null,
    };
  }, [disciplineHistory]);

  useEffect(() => {
    if (riskSnapshot.shouldStopTrading && !previousBreach.current && limits.alert_enabled) {
      toast.error('Лимит риска достигнут — остановите торговую сессию');
    }
    previousBreach.current = riskSnapshot.shouldStopTrading;
  }, [riskSnapshot.shouldStopTrading, limits.alert_enabled]);

  const statusTone = riskSnapshot.shouldStopTrading
    ? 'breached'
    : riskSnapshot.today.status === 'warning' || riskSnapshot.week.status === 'warning'
      ? 'warning'
      : limits.daily_loss_limit <= 0 || limits.weekly_loss_limit <= 0
        ? 'unconfigured'
        : 'safe';
  const statusLabel = riskSnapshot.shouldStopTrading
    ? 'Торговлю следует остановить'
    : statusTone === 'warning'
      ? 'Приближение к лимиту'
      : statusTone === 'unconfigured'
        ? 'Настройте оба лимита'
        : 'Правила соблюдены';

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
        <span className={statusTone}>
          {statusTone === 'breached' || statusTone === 'warning' ? (
            <WarningCircle size={16} />
          ) : (
            <CheckCircle size={16} weight="fill" />
          )}
          {statusLabel}
        </span>
      </header>

      <div className="risk-v11-guard" aria-label="Контроль лимитов текущей сессии">
        <RiskWindowCard label="Сегодня" snapshot={riskSnapshot.today} />
        <RiskWindowCard label="Текущая неделя" snapshot={riskSnapshot.week} />
        <article className="risk-v11-policy">
          <span>Правило позиции</span>
          <strong>{limits.position_size_percent}%</strong>
          <small>от капитала на одну сделку</small>
          <dl>
            <div>
              <dt>Макс. плечо</dt>
              <dd>{limits.max_leverage}x</dd>
            </div>
            <div>
              <dt>Предупреждения</dt>
              <dd>{limits.alert_enabled ? 'В интерфейсе' : 'Выключены'}</dd>
            </div>
          </dl>
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
                <p>Статус обновляется по завершённым сделкам из журнала.</p>
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
              <strong>Предупреждения в интерфейсе</strong>
              <small>Показывать сигнал при достижении сохранённого лимита.</small>
            </span>
            <i className={alertsEnabled ? 'on' : ''} />
          </button>
          <button type="button" className="risk-v3-primary" onClick={save}>
            Сохранить лимиты
          </button>
        </section>
      </div>

      <section className="risk-v6-history">
        <header>
          <div>
            <h2>История дисциплины за 14 дней</h2>
            <p>Только реальные закрытые сделки и сохранённый дневной лимит.</p>
          </div>
          <span>14 дней</span>
        </header>
        <div className="risk-v6-history-scroll">
          <div className="risk-v6-history-table" role="table" aria-label="История дисциплины">
            <div className="risk-v6-history-row risk-v6-history-dates" role="row">
              <span role="columnheader">Дата</span>
              {disciplineHistory.map((day) => (
                <strong role="columnheader" key={day.key}>
                  {day.label}
                </strong>
              ))}
            </div>
            <div className="risk-v6-history-row" role="row">
              <span role="rowheader">Net P&amp;L</span>
              {disciplineHistory.map((day) => (
                <b
                  role="cell"
                  key={day.key}
                  className={!day.trades ? '' : day.netPnl >= 0 ? 'positive' : 'negative'}
                >
                  {day.trades ? formatSignedUSD(day.netPnl) : '—'}
                </b>
              ))}
            </div>
            <div className="risk-v6-history-row" role="row">
              <span role="rowheader">Использование лимита</span>
              {disciplineHistory.map((day) => (
                <b
                  role="cell"
                  key={day.key}
                  className={day.status === 'breached' ? 'negative' : ''}
                >
                  {day.limitUsage === null
                    ? day.trades
                      ? 'Не задан'
                      : '—'
                    : `${day.limitUsage.toFixed(0)}%`}
                </b>
              ))}
            </div>
            <div className="risk-v6-history-row risk-v6-history-status" role="row">
              <span role="rowheader">Правило</span>
              {disciplineHistory.map((day) => (
                <i
                  role="cell"
                  key={day.key}
                  className={day.status}
                  title={
                    day.status === 'breached'
                      ? 'Лимит нарушен'
                      : day.status === 'kept'
                        ? 'Лимит соблюдён'
                        : day.status === 'not-configured'
                          ? 'Лимит не настроен'
                          : 'Сделок не было'
                  }
                >
                  {day.status === 'breached' ? (
                    <WarningCircle size={17} weight="fill" />
                  ) : day.status === 'kept' ? (
                    <CheckCircle size={17} weight="fill" />
                  ) : (
                    <Minus size={16} />
                  )}
                </i>
              ))}
            </div>
          </div>
        </div>
        <footer>
          <CheckCircle size={18} weight="fill" />
          <p>
            <strong>Вывод за период</strong>
            {limits.daily_loss_limit > 0 ? (
              <span>
                Активных дней: {disciplineSummary.activeDays}. Нарушений:{' '}
                {disciplineSummary.violations}. Среднее использование лимита:{' '}
                {disciplineSummary.averageUsage === null
                  ? 'нет данных'
                  : `${disciplineSummary.averageUsage.toFixed(0)}%`}
                .
              </span>
            ) : (
              <span>Установите дневной лимит, чтобы Tradeum мог проверять соблюдение правила.</span>
            )}
          </p>
        </footer>
      </section>
    </section>
  );
}
