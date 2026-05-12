import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/ui/Icons';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Некорректный формат email');
      return;
    }

    setLoading(true);

    try {
      const { error: supaError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (supaError) {
        setError(supaError.message);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки');
    }

    setLoading(false);
  };

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

            {sent ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Icon name="shield" size={32} className="text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Проверьте почту</h1>
                <p className="text-sm text-gray-400 mb-2">
                  Мы отправили ссылку для сброса пароля на
                </p>
                <p className="text-sm text-emerald-400 font-medium mb-6">{email}</p>
                <p className="text-xs text-gray-500 mb-6">
                  Ссылка действительна в течение 1 часа. Если письма нет, проверьте папку "Спам".
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:underline"
                >
                  <Icon name="back" size={16} />
                  Вернуться ко входу
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white mb-2">Восстановление пароля</h1>
                <p className="text-sm text-gray-400">
                  Введите email, и мы отправим ссылку для сброса пароля
                </p>
              </>
            )}
          </div>

          {!sent && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

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
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="shield" size={20} />
                    Отправить ссылку
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
