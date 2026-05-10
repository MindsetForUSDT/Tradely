import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LoginFormProps {
  savedEmail: string;
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ savedEmail, onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error('Введите email');
      return;
    }
    if (!password) {
      toast.error('Введите пароль');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        toast.error(
          error.message === 'Invalid login credentials'
            ? 'Неверный email или пароль'
            : 'Ошибка входа'
        );
        setLoading(false);
        return;
      }
      if (data?.session) {
        localStorage.setItem(
          'tradeumdiary-auth',
          JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.session.user,
          })
        );
        toast.success('Вход выполнен!');
        window.location.replace('/dashboard');
      }
    } catch {
      toast.error('Сетевая ошибка');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className="input-field"
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        className="input-field"
      />
      <button onClick={handleLogin} disabled={loading} className="btn-primary w-full">
        {loading ? 'Вход...' : 'Войти'}
      </button>
      <div className="text-right">
        <button
          onClick={onSwitchToReset}
          className="text-xs text-text-muted hover:text-accent-green transition-colors"
        >
          Забыли пароль?
        </button>
      </div>
      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button
          onClick={onSwitchToRegister}
          className="text-accent-green font-medium hover:underline"
        >
          Регистрация
        </button>
      </p>
    </div>
  );
}
