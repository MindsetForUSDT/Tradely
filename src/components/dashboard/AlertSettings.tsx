import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';
import { Icon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

export function AlertSettings() {
  const [pnlTarget, setPnlTarget] = useState('');
  const [drawdownLimit, setDrawdownLimit] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAlerts = async () => {
    const uid = getUserId();
    if (!uid) {
      toast.error('Не авторизован');
      return;
    }
    setSaving(true);
    const alerts: any[] = [];
    const pnlVal = parseFloat(pnlTarget);
    const ddVal = parseFloat(drawdownLimit);
    if (!isNaN(pnlVal) && pnlVal > 0)
      alerts.push({
        user_id: uid,
        name: 'P&L Цель',
        alert_type: 'pnl_target',
        condition_config: { metric: 'pnl_daily', operator: 'gte', value: pnlVal },
        channels: email ? ['email'] : [],
      });
    if (!isNaN(ddVal) && ddVal > 0)
      alerts.push({
        user_id: uid,
        name: 'Макс. просадка',
        alert_type: 'drawdown',
        condition_config: { metric: 'drawdown', operator: 'gte', value: ddVal },
        channels: email ? ['email'] : [],
      });
    if (alerts.length) {
      const { error } = await supabase.from('alerts').insert(alerts);
      if (error) {
        toast.error('Ошибка сохранения');
      } else {
        toast.success('Алерты сохранены!');
      }
    }
    setSaving(false);
  };

  return (
    <Card padding="md" className="max-w-md">
      <h3 className="text-sm font-semibold mb-4 inline-flex items-center gap-1.5">
        <Icon name="alert" size={18} className="text-accent-green" />
        Настройка алертов
      </h3>
      <div className="space-y-4">
        <input
          type="number"
          placeholder="Цель P&L ($)"
          value={pnlTarget}
          onChange={(e) => setPnlTarget(e.target.value)}
          className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
        />
        <input
          type="number"
          placeholder="Лимит просадки ($)"
          value={drawdownLimit}
          onChange={(e) => setDrawdownLimit(e.target.value)}
          className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
        />
        <input
          type="email"
          placeholder="Email для уведомлений"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
        />
        <button
          onClick={saveAlerts}
          disabled={saving}
          className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold disabled:opacity-50 hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98]"
        >
          {saving ? 'Сохранение...' : 'Сохранить алерты'}
        </button>
      </div>
    </Card>
  );
}

/* ✅ Исправлено: эмодзи заменён на Icon(alert), добавлены transition */
