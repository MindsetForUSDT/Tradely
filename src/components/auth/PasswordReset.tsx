import { useState } from 'react';
import toast from 'react-hot-toast';

interface PasswordResetProps {
  onSwitchToLogin: () => void;
}

export function PasswordReset({ onSwitchToLogin }: PasswordResetProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) { toast.error('Введите email'); return; }
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/recover`;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': key },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
        toast.success('Ссылка отправлена на email');
      } else {
        toast.error('Ошибка отправки');
        setLoading(false);
      }
    } catch {
      toast.error('Ошибка сети');
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Проверьте почту</h3>
        <p className="text-sm text-text-muted">Ссылка для сброса пароля отправлена на {email}</p>
        <button onClick={onSwitchToLogin} className="text-accent-green text-sm">← Вернуться ко входу</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <button onClick={handleReset} disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
        {loading ? 'Отправка...' : 'Отправить ссылку'}
      </button>
      <p className="text-center">
        <button onClick={onSwitchToLogin} className="text-sm text-text-muted hover:text-accent-green transition-colors">← Вернуться ко входу</button>
      </p>
    </div>
  );
}