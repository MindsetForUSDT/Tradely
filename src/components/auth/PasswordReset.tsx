import { useState } from 'react';
import toast from 'react-hot-toast';

interface PasswordResetProps {
  savedEmail: string;
  onSwitchToLogin: () => void;
}

export function PasswordReset({ savedEmail, onSwitchToLogin }: PasswordResetProps) {
  const [email, setEmail] = useState(savedEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      toast.error('Введите email');
      return;
    }
    setLoading(true);
    // TODO: Добавить endpoint для сброса пароля
    try {
      await fetch('http://localhost:3001/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
      toast.success('Ссылка отправлена на email');
    } catch {
      toast.error('Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Проверьте почту</h3>
        <p className="text-sm text-text-muted">Ссылка отправлена на {email}</p>
        <button onClick={onSwitchToLogin} className="text-accent-green text-sm">
          ← Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
      />
      <button
        onClick={handleReset}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Отправка...' : 'Отправить ссылку'}
      </button>
      <button
        onClick={onSwitchToLogin}
        className="w-full text-sm text-text-muted hover:text-accent-green transition-colors"
      >
        ← Вернуться ко входу
      </button>
    </div>
  );
}
