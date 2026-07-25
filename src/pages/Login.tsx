import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Ошибка при входе в аккаунт';
}

export function Login() {
  const { isAuthenticated, isLoading: authLoading, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string' &&
    location.state.from.startsWith('/')
      ? location.state.from
      : '/dashboard';

  useEffect(() => {
    const saved = localStorage.getItem('lastRegistrationEmail');
    if (saved) setEmail(saved);
  }, []);
  if (!authLoading && isAuthenticated) return <Navigate to={returnTo} replace />;
  if (authLoading)
    return (
      <div className="auth-loading">
        <span />
      </div>
    );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Введите email и пароль');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post<{
        success: boolean;
        user: {
          id: string;
          email: string;
          username: string;
          subscription_tier: string;
          created_at: string;
        };
      }>('/auth/login', { email: email.trim().toLowerCase(), password, remember });
      const { user } = response;
      if (!user) throw new Error('Ошибка входа');
      setUser({
        id: user.id,
        username: user.username,
        email: user.email,
        subscription_tier: user.subscription_tier as 'free' | 'pro',
        created_at: user.created_at,
      });
      localStorage.removeItem('lastRegistrationEmail');
      toast.success('Успешный вход!');
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title="С возвращением"
      description="Войдите, чтобы продолжить работу с торговой историей."
      footer={
        <>
          <span>Нет аккаунта?</span> <Link to="/register">Создать бесплатно</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleLogin}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="trader@example.com"
            disabled={loading}
            autoComplete="email"
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Введите пароль"
            disabled={loading}
            autoComplete="current-password"
          />
        </label>
        <div className="auth-form-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />{' '}
            <span>Запомнить меня</span>
          </label>
          <Link to="/forgot-password">Забыли пароль?</Link>
        </div>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </AuthFrame>
  );
}
