import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) { toast.error('Введите email'); return; }
    if (!password) { toast.error('Введите пароль'); return; }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error('Неверный email или пароль');
        setLoading(false);
        return;
      }

      if (data.user) {
        toast.success('Вход выполнен!');
        navigate('/dashboard', { replace: true });
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4" noValidate>
      <div>
        <label htmlFor="login-email" className="sr-only">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="sr-only">Пароль</label>
        <input
          id="login-password"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>

      <div className="text-right">
        <button type="button" onClick={onSwitchToReset} className="text-xs text-text-muted hover:text-accent-green transition-colors">
          Забыли пароль?
        </button>
      </div>

      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-accent-green font-medium">
          Регистрация
        </button>
      </p>
    </form>
  );
}