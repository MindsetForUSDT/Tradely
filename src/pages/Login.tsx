import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Предзаполнить email из последней регистрации
  useEffect(() => {
    const lastEmail = localStorage.getItem('lastRegistrationEmail');
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  // Перенаправляем авторизованных пользователей
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError('Введите email и пароль');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await api.post<{
        success: boolean;
        user: {
          id: string;
          email: string;
          username: string;
          subscription_tier: string;
          created_at: string;
        };
        token: string;
      }>('/auth/login', {
        email: normalizedEmail,
        password,
      });

      const { user, token } = response;

      if (!user || !token) {
        throw new Error('Ошибка входа');
      }

      // Устанавливаем токен для API
      api.setTokenProvider(() => Promise.resolve(token));

      setUser(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          subscription_tier: user.subscription_tier as 'free' | 'pro',
          created_at: user.created_at,
        },
        token
      );

      localStorage.removeItem('lastRegistrationEmail');
      toast.success('Успешный вход!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0f]">
      {/* Градиентные пятна */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Карточка */}
        <div className="relative rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-xl">
          {/* Логотип */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-emerald-400"
                >
                  <path d="M3 17l4-8 4 6 6-10 3 4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">
                Tradeum<span className="text-emerald-400">Diary</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Добро пожаловать</h1>
            <p className="text-sm text-gray-400">Войдите в свой аккаунт</p>
          </div>

          {/* Форма */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                disabled={loading}
              />
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                disabled={loading}
              />
            </div>

            {/* Ошибка */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Вход...
                </>
              ) : (
                <>
                  <Icon name="wallet" size={20} />
                  Войти
                </>
              )}
            </button>
          </form>

          {/* Ссылка на регистрацию */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-emerald-400 font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>

          {/* Забыли пароль */}
          <p className="text-center text-sm mt-4">
            <Link
              to="/forgot-password"
              className="text-gray-400 hover:text-emerald-400 transition-colors"
            >
              Забыли пароль?
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
