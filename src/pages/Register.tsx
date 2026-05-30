import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface ValidationErrors {
  email?: string;
  password?: string;
  username?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Ошибка при регистрации';
}

function validateEmail(email: string): string | undefined {
  if (!email) return 'Введите email';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Некорректный формат email';
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Введите пароль';
  if (password.length < 6) return 'Минимум 6 символов';
}

function validateUsername(username: string): string | undefined {
  if (!username) return 'Введите имя пользователя';
  if (username.length < 2) return 'Минимум 2 символа';
}

export function Register() {
  const { isAuthenticated, isLoading: authLoading, setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
    username?: boolean;
  }>({});
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validateField = useCallback((name: keyof ValidationErrors, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFieldErrors((prev) => ({
        ...prev,
        [name]:
          name === 'email'
            ? validateEmail(value)
            : name === 'password'
              ? validatePassword(value)
              : validateUsername(value),
      }));
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  const handleBlur = (field: keyof ValidationErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === 'email' ? email : field === 'password' ? password : username;
    validateField(field, value);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const usernameErr = validateUsername(username);
    setFieldErrors({ email: emailErr, password: passwordErr, username: usernameErr });
    setTouched({ email: true, password: true, username: true });

    if (emailErr || passwordErr || usernameErr) {
      setError('Проверьте введённые данные');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.toLowerCase().trim();

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
      }>('/auth/register', {
        email: normalizedEmail,
        password,
        username: username.trim(),
      });

      const { user, token } = response;

      if (!user || !token) {
        throw new Error('Ошибка регистрации');
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

      toast.success('Аккаунт создан!');
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
            <h1 className="text-2xl font-bold text-white mb-2">Создать аккаунт</h1>
            <p className="text-sm text-gray-400">Начните свой путь к профессиональному трейдингу</p>
          </div>

          {/* Форма */}
          <form onSubmit={handleRegister} className="space-y-4" aria-live="polite">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                  if (touched.username) validateField('username', e.target.value);
                }}
                onBlur={() => handleBlur('username')}
                placeholder="trader_01"
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                  fieldErrors.username && touched.username
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/30'
                }`}
                disabled={loading}
                aria-invalid={!!fieldErrors.username && touched.username}
                aria-describedby={
                  fieldErrors.username && touched.username ? 'username-error' : undefined
                }
              />
              {fieldErrors.username && touched.username && (
                <p
                  id="username-error"
                  className="text-xs text-red-400 mt-1.5 flex items-center gap-1"
                >
                  <span>⚠</span> {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value.toLowerCase().trim());
                  setError('');
                  if (touched.email) validateField('email', e.target.value);
                }}
                onBlur={() => handleBlur('email')}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                  fieldErrors.email && touched.email
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/30'
                }`}
                disabled={loading}
                aria-invalid={!!fieldErrors.email && touched.email}
                aria-describedby={fieldErrors.email && touched.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && touched.email && (
                <p id="email-error" className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                  if (touched.password) validateField('password', e.target.value);
                }}
                onBlur={() => handleBlur('password')}
                placeholder="Минимум 6 символов"
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                  fieldErrors.password && touched.password
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/30'
                }`}
                disabled={loading}
                aria-invalid={!!fieldErrors.password && touched.password}
                aria-describedby={
                  fieldErrors.password && touched.password ? 'password-error' : undefined
                }
              />
              {fieldErrors.password && touched.password && (
                <p
                  id="password-error"
                  className="text-xs text-red-400 mt-1.5 flex items-center gap-1"
                >
                  <span>⚠</span> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Ошибка сервера */}
            {error && (
              <div
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                role="alert"
              >
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
                  Создаём аккаунт...
                </>
              ) : (
                <>
                  <Icon name="wallet-add" size={20} />
                  Зарегистрироваться
                </>
              )}
            </button>
          </form>

          {/* Ссылка на вход */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-emerald-400 font-medium hover:underline">
              Войти
            </Link>
          </p>

          {/* Условия */}
          <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
            Регистрируясь, вы соглашаетесь с{' '}
            <Link to="/terms" className="text-gray-400 hover:underline">
              Условиями использования
            </Link>{' '}
            и{' '}
            <Link to="/privacy" className="text-gray-400 hover:underline">
              Политикой конфиденциальности
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
