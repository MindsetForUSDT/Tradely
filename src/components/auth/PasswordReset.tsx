import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface PasswordResetProps {
  onSwitchToLogin: () => void;
}

export function PasswordReset({ onSwitchToLogin }: PasswordResetProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Введите email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Ошибка отправки. Проверьте email.');
        return;
      }

      setSent(true);
      toast.success('Ссылка отправлена на email');
    } catch (err) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Проверьте почту</h3>
        <p className="text-sm text-text-muted">
          Ссылка для сброса пароля отправлена на {email}
        </p>
        <button
          onClick={onSwitchToLogin}
          className="text-accent-green text-sm hover:underline"
        >
          ← Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4" noValidate>
      <div>
        <label htmlFor="reset-email" className="sr-only">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Отправка...' : 'Отправить ссылку'}
      </button>

      <p className="text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm text-text-muted hover:text-accent-green transition-colors"
        >
          ← Вернуться ко входу
        </button>
      </p>
    </form>
  );
}