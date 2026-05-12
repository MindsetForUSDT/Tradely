import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/ui/Icons';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface ValidationErrors {
  email?: string;
  password?: string;
}

function getErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Ошибка соединения с сервером. Проверьте подключение к интернету или попробуйте позже.';
  }
  if (msg.includes('User already registered')) {
    return 'Этот email уже зарегистрирован. Попробуйте войти или восстановить пароль.';
  }
  if (msg.includes('Password should be')) {
    return 'Пароль слишком простой. Используйте не менее 6 символов.';
  }
  if (msg.includes('Invalid email')) {
    return 'Некорректный формат email';
  }
  return msg;
}

function validateEmail(email: string): string | undefined {
  if (!email) return 'Введите email';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Некорректный формат email (пример: user@mail.com)';
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Введите пароль';
  if (password.length < 6) return 'Минимум 6 символов';
  if (password.length < 8) return 'Рекомендуется 8+ символов для надёжности';
}

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validateField = useCallback((name: 'email' | 'password', value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: name === 'email' ? validateEmail(value) : validatePassword(value),
      }));
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError('');
    if (touched.email) validateField('email', value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setError('');
    if (touched.password) validateField('password', value);
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, field === 'email' ? email : password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setFieldErrors({ email: emailErr, password: passwordErr });
    setTouched({ email: true, password: true });

    if (emailErr || passwordErr) {
      setError('Проверьте введённые данные');
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError('Сервис регистрации временно недоступен. Не настроены параметры подключения.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(getErrorMessage(error));
        setLoading(false);
        return;
      }

      if (data.user) {
        navigate('/subscribe');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
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
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
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
                onChange={(e) => handlePasswordChange(e.target.value)}
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
