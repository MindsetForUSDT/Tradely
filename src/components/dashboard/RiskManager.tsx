import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRiskManager } from '@/hooks/useRiskManager';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { calculatePositionSize, checkRiskLimits } from '@/lib/riskCalculator';
import { formatUSD } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function RiskManager() {
  const { limits, saveLimits } = useRiskManager();
  const { trades } = useTradesOptimized({ limit: 500, daysAgo: 7 });

  const [dl, setDl] = useState(limits.daily_loss_limit);
  const [wl, setWl] = useState(limits.weekly_loss_limit);
  const [ps, setPs] = useState(limits.position_size_percent);
  const [ml, setMl] = useState(limits.max_leverage);
  const [ae, setAe] = useState(limits.alert_enabled);
  const [aem, setAem] = useState(limits.alert_email);

  const [balance, setBalance] = useState('10000');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [risk, setRisk] = useState('2');
  const [calcResult, setCalcResult] = useState<any>(null);

  const todayPnl = trades
    .filter((t: any) => {
      const d = new Date(t.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    })
    .reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);

  const { dailyBreached } = checkRiskLimits(
    todayPnl,
    limits.daily_loss_limit,
    limits.weekly_loss_limit
  );

  useEffect(() => {
    setDl(limits.daily_loss_limit);
    setWl(limits.weekly_loss_limit);
    setPs(limits.position_size_percent);
    setMl(limits.max_leverage);
    setAe(limits.alert_enabled);
    setAem(limits.alert_email);
  }, [limits]);

  const handleCalculate = () => {
    const result = calculatePositionSize(
      parseFloat(balance) || 0,
      parseFloat(risk) || 2,
      parseFloat(entry) || 0,
      parseFloat(stop) || 0
    );
    setCalcResult(result);
  };

  const handleSave = () => {
    saveLimits({
      daily_loss_limit: dl,
      weekly_loss_limit: wl,
      position_size_percent: ps,
      max_leverage: ml,
      alert_enabled: ae,
      alert_email: aem,
    });
  };

  if (dailyBreached && limits.alert_enabled) {
    toast.error('⚠️ Дневной лимит убытка превышен!');
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold">Риск-менеджмент</h2>

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
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted">Размер позиции</p>
          <p className="text-lg font-bold">{limits.position_size_percent}% от баланса</p>
        </Card>
      </div>

      <Card padding="md" className="space-y-4">
        <h3 className="text-sm font-semibold">Калькулятор размера позиции</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-text-muted block mb-1">Баланс ($)</span>
            <input
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              type="number"
              className="input-field"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Риск (%)</span>
            <input
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              type="number"
              step="0.1"
              className="input-field"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Цена входа</span>
            <input
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              type="number"
              step="any"
              className="input-field"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Стоп-лосс</span>
            <input
              value={stop}
              onChange={(e) => setStop(e.target.value)}
              type="number"
              step="any"
              className="input-field"
            />
          </div>
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

      <Card padding="md" className="space-y-4">
        <h3 className="text-sm font-semibold">Настройки лимитов</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-text-muted block mb-1">Дневной лимит убытка ($)</span>
            <input
              value={dl}
              onChange={(e) => setDl(parseFloat(e.target.value) || 0)}
              type="number"
              className="input-field"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Недельный лимит убытка ($)</span>
            <input
              value={wl}
              onChange={(e) => setWl(parseFloat(e.target.value) || 0)}
              type="number"
              className="input-field"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">% баланса на позицию</span>
            <input
              value={ps}
              onChange={(e) => setPs(parseFloat(e.target.value) || 2)}
              type="number"
              step="0.1"
              className="input-field"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Макс. плечо</span>
            <input
              value={ml}
              onChange={(e) => setMl(parseFloat(e.target.value) || 1)}
              type="number"
              step="0.1"
              className="input-field"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={ae} onChange={(e) => setAe(e.target.checked)} />
          <span className="text-xs text-text-muted">Уведомления при нарушении</span>
        </div>
        {ae && (
          <div>
            <span className="text-xs text-text-muted block mb-1">Email для алертов</span>
            <input
              value={aem}
              onChange={(e) => setAem(e.target.value)}
              type="email"
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
