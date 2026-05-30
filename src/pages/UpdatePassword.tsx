import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  // Для локальной БД - просто показываем форму
  useEffect(() => {
    // Валидация токена из URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError('Недействительная ссылка восстановления');
    }
  }, []);

  const checkStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(checkStrength(val));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (passwordStrength < 2) {
      setError('Пароль слишком простой');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      // TODO: Добавить endpoint для обновления пароля
      await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления пароля');
    }

    setLoading(false);
  };

  const strengthLabels = ['Очень слабый', 'Слабый', 'Средний', 'Надёжный', 'Отличный'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-emerald-400',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0f]">
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="relative rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-xl">
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

            {success ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Icon name="shield" size={32} className="text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Пароль обновлён!</h1>
                <p className="text-sm text-gray-400 mb-2">Ваш пароль успешно изменён.</p>
                <p className="text-xs text-gray-500 mb-6">
                  Через несколько секунд вы будете перенаправлены на страницу входа.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:underline"
                >
                  Войти сейчас →
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white mb-2">Новый пароль</h1>
                <p className="text-sm text-gray-400">
                  Придумайте надёжный пароль для вашего аккаунта
                </p>
              </>
            )}
          </div>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Новый пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Минимум 8 символов"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  disabled={loading}
                  autoFocus
                />
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {strengthLabels[passwordStrength]} · Минимум 8 символов, заглавная буква,
                      цифра
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Повторите пароль"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
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
                    Обновление...
                  </>
                ) : (
                  <>
                    <Icon name="shield" size={20} />
                    Сохранить пароль
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-400">
                <Link
                  to="/login"
                  className="text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <Icon name="back" size={14} />
                  Вернуться ко входу
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
