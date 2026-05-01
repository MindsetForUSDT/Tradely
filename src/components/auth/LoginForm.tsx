import { useState } from 'react';
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Введите email'); return; }
    if (!password) { toast.error('Введите пароль'); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.log('LOGIN ERROR:', error.message);
      toast.error('Неверный email или пароль');
      setLoading(false);
      return;
    }

    console.log('LOGIN DATA:', data);

    if (data?.session) {
      toast.success('Вход выполнен!');
      window.location.href = '/dashboard';
    } else {
      toast.error('Ошибка входа. Попробуйте снова.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4" noValidate>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
        {loading ? 'Вход...' : 'Войти'}
      </button>
      <div className="text-right">
        <button type="button" onClick={onSwitchToReset} className="text-xs text-text-muted hover:text-accent-green transition-colors">Забыли пароль?</button>
      </div>
      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-accent-green font-medium">Регистрация</button>
      </p>
    </form>
  );
}