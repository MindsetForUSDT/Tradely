import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

interface AlertConfig {
  name: string;
  alert_type: string;
  condition_config: { metric: string; operator: string; value: number };
  channels: string[];
}

export function AlertSettings() {
  const [pnlTarget, setPnlTarget] = useState('');
  const [drawdownLimit, setDrawdownLimit] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAlerts = async () => {
    setSaving(true);
    const alerts: AlertConfig[] = [];
    const pnlVal = parseFloat(pnlTarget);
    const ddVal = parseFloat(drawdownLimit);
    if (!isNaN(pnlVal) && pnlVal > 0)
      alerts.push({
        name: 'P&L Цель',
        alert_type: 'pnl_target',
        condition_config: { metric: 'pnl_daily', operator: 'gte', value: pnlVal },
        channels: email ? ['email'] : [],
      });
    if (!isNaN(ddVal) && ddVal > 0)
      alerts.push({
        name: 'Макс. просадка',
        alert_type: 'drawdown',
        condition_config: { metric: 'drawdown', operator: 'gte', value: ddVal },
        channels: email ? ['email'] : [],
      });
    if (alerts.length) {
      try {
        await fetch('http://localhost:3001/api/profile/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alerts, email }),
        });
        toast.success('Алерты сохранены!');
      } catch {
        toast.error('Ошибка сохранения');
      }
    }
    setSaving(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Card padding="lg" className="space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-accent-green/10 flex items-center justify-center">
            <Icon name="alert" size={18} className="text-accent-green" />
          </div>
          <h3 className="text-base font-semibold">Настройка алертов</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted font-medium">Цель P&L ($)</label>
            <input
              type="number"
              placeholder="Например, 1000"
              value={pnlTarget}
              onChange={(e) => setPnlTarget(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted font-medium">Лимит просадки ($)</label>
            <input
              type="number"
              placeholder="Например, 500"
              value={drawdownLimit}
              onChange={(e) => setDrawdownLimit(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted font-medium">Email для уведомлений</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
            />
          </div>
          <button
            onClick={saveAlerts}
            disabled={saving}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold disabled:opacity-50 hover:bg-accent-green-dim transition-all active:scale-[0.98]"
          >
            {saving ? 'Сохранение...' : 'Сохранить алерты'}
          </button>
        </div>
      </Card>
    </div>
  );
}
