import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function AlertSettings() {
  const [pnlTarget, setPnlTarget] = useState('');
  const [drawdownLimit, setDrawdownLimit] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAlerts = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (pnlTarget) {
      await supabase.from('alerts').insert({
        user_id: user.id,
        name: 'P&L Цель',
        alert_type: 'pnl_target',
        condition_config: { metric: 'pnl_daily', operator: 'gte', value: parseFloat(pnlTarget) },
        channels: email ? ['email'] : [],
      });
    }

    if (drawdownLimit) {
      await supabase.from('alerts').insert({
        user_id: user.id,
        name: 'Макс. просадка',
        alert_type: 'drawdown',
        condition_config: { metric: 'drawdown', operator: 'gte', value: parseFloat(drawdownLimit) },
        channels: email ? ['email'] : [],
      });
    }

    toast.success('Алерты сохранены!');
    setSaving(false);
  };

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-4">🔔 Настройка алертов</h3>
      <div className="space-y-4">
        <div>
          <span className="text-xs text-text-muted block mb-1">Цель по дневному P&L ($)</span>
          <input
            type="number"
            placeholder="1000"
            value={pnlTarget}
            onChange={(e) => setPnlTarget(e.target.value)}
            className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Лимит просадки ($)</span>
          <input
            type="number"
            placeholder="500"
            value={drawdownLimit}
            onChange={(e) => setDrawdownLimit(e.target.value)}
            className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
          />
        </div>
        <div>
          <span className="text-xs text-text-muted block mb-1">Email для уведомлений</span>
          <input
            type="email"
            placeholder="trader@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
          />
        </div>
        <Button variant="primary" onClick={saveAlerts} isLoading={saving} className="w-full">
          Сохранить алерты
        </Button>
      </div>
    </Card>
  );
}
