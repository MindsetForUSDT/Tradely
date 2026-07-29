import { useState } from 'react';
import { Bell, CheckCircle, ShieldCheck } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

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
    const alerts: AlertConfig[] = [];
    const pnlValue = Number(pnlTarget);
    const drawdownValue = Number(drawdownLimit);
    if (Number.isFinite(pnlValue) && pnlValue > 0) {
      alerts.push({
        name: 'P&L Цель',
        alert_type: 'pnl_target',
        condition_config: { metric: 'pnl_daily', operator: 'gte', value: pnlValue },
        channels: email ? ['email'] : [],
      });
    }
    if (Number.isFinite(drawdownValue) && drawdownValue > 0) {
      alerts.push({
        name: 'Макс. просадка',
        alert_type: 'drawdown',
        condition_config: { metric: 'drawdown', operator: 'gte', value: drawdownValue },
        channels: email ? ['email'] : [],
      });
    }
    if (!alerts.length) {
      toast.error('Укажите хотя бы один лимит');
      return;
    }

    setSaving(true);
    try {
      await api.post('/profile/alerts', { alerts, email });
      toast.success('Алерты сохранены');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить алерты');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace-form-page">
      <header>
        <span>Контроль риска</span>
        <h1>Уведомления и лимиты</h1>
        <p>Фиксируйте границы до торговой сессии, а не после эмоционального решения.</p>
      </header>
      <div className="workspace-form-layout">
        <div className="workspace-form-panel">
          <div className="workspace-form-title">
            <Bell size={21} />
            <div>
              <strong>Триггеры сессии</strong>
              <small>Tradeum сообщит о достижении заданного уровня.</small>
            </div>
          </div>
          <label>
            Дневная цель P&amp;L, $
            <input
              type="number"
              placeholder="Например, 1000"
              value={pnlTarget}
              onChange={(event) => setPnlTarget(event.target.value)}
            />
          </label>
          <label>
            Максимальная просадка, $
            <input
              type="number"
              placeholder="Например, 500"
              value={drawdownLimit}
              onChange={(event) => setDrawdownLimit(event.target.value)}
            />
          </label>
          <label>
            Email для уведомлений
            <input
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button type="button" onClick={() => void saveAlerts()} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить лимиты'}
          </button>
        </div>
        <aside className="workspace-context-rail">
          <ShieldCheck size={24} />
          <h2>Лимит — это правило, а не прогноз</h2>
          <p>
            Уведомление не останавливает торговлю автоматически. Оно возвращает внимание к вашему
            заранее принятому решению.
          </p>
          <ul>
            <li>
              <CheckCircle size={15} /> Используйте дневной лимит вместе с риском на сделку
            </li>
            <li>
              <CheckCircle size={15} /> Пересматривайте пороги только вне сессии
            </li>
            <li>
              <CheckCircle size={15} /> Не повышайте лимит после серии убытков
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
