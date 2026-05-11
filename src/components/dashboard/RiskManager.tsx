// components/dashboard/RiskManager.tsx — ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRiskManager } from '@/hooks/useRiskManager';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { calculatePositionSize, checkRiskLimits } from '@/lib/riskCalculator';
import { formatUSD, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function safeParseFloat(value: string, fallback: number = 0): number {
  const parsed = parseFloat(value);
  return isFinite(parsed) ? parsed : fallback;
}

export function RiskManager() {
  const { limits, saveLimits } = useRiskManager();
  const { trades } = useTradesOptimized({ limit: 500, daysAgo: 7 });

  // Локальное состояние
  const [dl, setDl] = useState(limits.daily_loss_limit);
  const [wl, setWl] = useState(limits.weekly_loss_limit);
  const [ps, setPs] = useState(limits.position_size_percent);
  const [ml, setMl] = useState(limits.max_leverage);
  const [ae, setAe] = useState(limits.alert_enabled);
  const [aem, setAem] = useState(limits.alert_email || '');

  const [balance, setBalance] = useState('10000');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [risk, setRisk] = useState('2');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ Ref для отслеживания предыдущего состояния алерта
  const prevBreachedRef = useRef(false);

  // Синхронизация с limits
  useEffect(() => {
    setDl(limits.daily_loss_limit);
    setWl(limits.weekly_loss_limit);
    setPs(limits.position_size_percent);
    setMl(limits.max_leverage);
    setAe(limits.alert_enabled);
    setAem(limits.alert_email || '');
  }, [limits]);

  // Расчет сегодняшнего P&L
  const todayPnl = useMemo(() => {
    const now = new Date();
    return trades
      .filter((t: any) => new Date(t.timestamp).toDateString() === now.toDateString())
      .reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);
  }, [trades]);

  const { dailyBreached } = checkRiskLimits(
    todayPnl,
    limits.daily_loss_limit,
    limits.weekly_loss_limit
  );

  // ✅ Алерт только при изменении состояния
  useEffect(() => {
    if (dailyBreached && !prevBreachedRef.current && limits.alert_enabled) {
      toast.error('⚠️ Дневной лимит убытка превышен!');
    }
    prevBreachedRef.current = dailyBreached;
  }, [dailyBreached, limits.alert_enabled]);

  // Валидация калькулятора
  const validateCalculator = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    const bal = safeParseFloat(balance);
    const ep = safeParseFloat(entry);
    const sp = safeParseFloat(stop);
    const rp = safeParseFloat(risk);

    if (bal <= 0) errs.balance = 'Баланс должен быть > 0';
    if (ep <= 0) errs.entry = 'Цена входа должна быть > 0';
    if (sp <= 0) errs.stop = 'Стоп-лосс должен быть > 0';
    if (rp <= 0 || rp > 100) errs.risk = 'Риск от 0.1 до 100%';
    if (ep > 0 && sp > 0 && ep === sp) errs.stop = 'Стоп не может равняться цене входа';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [balance, entry, stop, risk]);

  const handleCalculate = () => {
    if (!validateCalculator()) return;

    const result = calculatePositionSize(
      safeParseFloat(balance),
      safeParseFloat(risk),
      safeParseFloat(entry),
      safeParseFloat(stop)
    );
    setCalcResult(result);
  };

  const handleSave = () => {
    // Валидация лимитов
    if (dl < 0 || wl < 0) {
      toast.error('Лимиты не могут быть отрицательными');
      return;
    }
    if (ps <= 0 || ps > 100) {
      toast.error('Процент позиции от 0.1 до 100');
      return;
    }

    saveLimits({
      daily_loss_limit: dl,
      weekly_loss_limit: wl,
      position_size_percent: ps,
      max_leverage: ml,
      alert_enabled: ae,
      alert_email: aem,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold">Риск-менеджмент</h2>

      {/* Статус */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md" className={cn(dailyBreached && 'border-accent-red/50')}>
          <p className="text-xs text-text-muted">P&L сегодня</p>
          <p
            className={cn(
              'text-lg font-bold font-mono',
              todayPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
            )}
          >
            {formatUSD(todayPnl)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Лимит: {formatUSD(limits.daily_loss_limit)}
          </p>
          {dailyBreached && (
            <p className="text-xs text-accent-red mt-1 font-medium">⚠️ Лимит превышен</p>
          )}
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted">Размер позиции</p>
          <p className="text-lg font-bold">{limits.position_size_percent}%</p>
          <p className="text-xs text-text-muted mt-1">Макс. плечо: {limits.max_leverage}x</p>
        </Card>
      </div>

      {/* Калькулятор */}
      <Card padding="md" className="space-y-4">
        <h3 className="text-sm font-semibold">Калькулятор размера позиции</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Баланс ($)', value: balance, setter: setBalance, error: errors.balance },
            { label: 'Риск (%)', value: risk, setter: setRisk, error: errors.risk, step: '0.1' },
            {
              label: 'Цена входа',
              value: entry,
              setter: setEntry,
              error: errors.entry,
              step: 'any',
            },
            { label: 'Стоп-лосс', value: stop, setter: setStop, error: errors.stop, step: 'any' },
          ].map((field) => (
            <div key={field.label}>
              <span className="text-xs text-text-muted block mb-1">{field.label}</span>
              <input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                type="number"
                step={field.step || '1'}
                className={cn('input-field', field.error && 'border-accent-red')}
              />
              {field.error && <p className="text-[10px] text-accent-red mt-1">{field.error}</p>}
            </div>
          ))}
        </div>
        <Button onClick={handleCalculate} className="w-full">
          Рассчитать
        </Button>
        {calcResult && (
          <div className="p-3 rounded-xl bg-accent-green/5 border border-accent-green/20 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-text-muted">Позиция</p>
              <p className="text-sm font-bold text-accent-green">{calcResult.positionSize}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Риск $</p>
              <p className="text-sm font-bold">{formatUSD(calcResult.riskAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Стоп %</p>
              <p className="text-sm font-bold">{calcResult.stopDistancePercent}%</p>
            </div>
          </div>
        )}
      </Card>

      {/* Настройки лимитов */}
      <Card padding="md" className="space-y-4">
        <h3 className="text-sm font-semibold">Настройки лимитов</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Дневной лимит убытка ($)', value: dl, setter: setDl },
            { label: 'Недельный лимит убытка ($)', value: wl, setter: setWl },
            { label: '% баланса на позицию', value: ps, setter: setPs, step: '0.1' },
            { label: 'Макс. плечо', value: ml, setter: setMl, step: '0.1' },
          ].map((field) => (
            <div key={field.label}>
              <span className="text-xs text-text-muted block mb-1">{field.label}</span>
              <input
                value={field.value}
                onChange={(e) => field.setter(safeParseFloat(e.target.value, field.value))}
                type="number"
                step={field.step || '1'}
                min="0"
                className="input-field"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ae}
            onChange={(e) => setAe(e.target.checked)}
            className="w-4 h-4 rounded accent-accent-green"
          />
          <span className="text-xs text-text-muted">Уведомления при нарушении</span>
        </div>
        {ae && (
          <div>
            <span className="text-xs text-text-muted block mb-1">Email для алертов</span>
            <input
              value={aem}
              onChange={(e) => setAem(e.target.value)}
              type="email"
              placeholder="trader@example.com"
              className="input-field"
            />
          </div>
        )}
        <Button onClick={handleSave} className="w-full">
          Сохранить настройки
        </Button>
      </Card>
    </div>
  );
}

// ✅ Добавлен useMemo (был пропущен)
import { useMemo } from 'react';
