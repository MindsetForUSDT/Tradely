import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AppProviders';
import toast from 'react-hot-toast';

interface LoginFormProps {
  savedEmail: string;
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ savedEmail, onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
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
        toast.error('Неверный email или пароль');
        setLoading(false);
        return;
      }
      if (data?.session) {
        // Обновляем локальное состояние auth
        setUser?.({
          id: data.session.user.id,
          username: data.session.user.email || 'User',
          email: data.session.user.email,
          subscription_tier: 'free',
          created_at: data.session.user.created_at,
        });

        toast.success('Вход выполнен!');
        // Используем navigate вместо window.location
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Сетевая ошибка');
    } finally {
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
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Вход...
          </span>
        ) : (
          'Войти'
        )}
      </button>
      <div className="text-right">
        <button
          onClick={onSwitchToReset}
          className="text-xs text-text-muted hover:text-neon-cyan transition-colors"
        >
          Забыли пароль?
        </button>
      </div>
      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button onClick={onSwitchToRegister} className="text-neon-cyan font-medium hover:underline">
          Регистрация
        </button>
      </p>
    </div>
  );
}
