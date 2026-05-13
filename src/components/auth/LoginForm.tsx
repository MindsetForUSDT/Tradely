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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Ошибка соединения с сервером. Проверьте подключение к интернету или попробуйте позже.';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Неверный email или пароль';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Email не подтверждён. Проверьте почту.';
  }
  return msg;
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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      toast.error('Сервис авторизации временно недоступен. Не настроены параметры подключения.');
      return;
    }

    setLoading(true);
    console.log('[LoginForm] Attempting login for:', email.trim());
    toast.loading('Входим в аккаунт...', { duration: 10000 });

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error('[LoginForm] Login error:', error);
        const errorMsg = getErrorMessage(error);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      console.log('[LoginForm] Login successful:', {
        userId: data?.user?.id,
        email: data?.user?.email,
        hasSession: !!data?.session,
      });

      if (!data?.session) {
        console.error('[LoginForm] No session returned from login');
        toast.error('Ошибка: сессия не создана');
        setLoading(false);
        return;
      }

      console.log('[LoginForm] Updating AuthContext with user:', data.session.user.id);

      setUser?.({
        id: data.session.user.id,
        username: data.session.user.email || 'User',
        email: data.session.user.email,
        subscription_tier: 'free',
        created_at: data.session.user.created_at,
      });

      toast.success('Вход выполнен!');
      localStorage.removeItem('lastRegistrationEmail');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('[LoginForm] Unexpected error:', err);
      toast.error(getErrorMessage(err));
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
