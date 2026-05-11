import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { PasswordReset } from './PasswordReset';
import { Icon } from '@/components/ui/Icons';

type AuthView = 'login' | 'register' | 'reset';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [savedEmail, setSavedEmail] = useState('');

  const fadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 },
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative"
      >
        {/* Декоративное свечение */}
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan rounded-3xl blur-xl opacity-30 animate-pulse" />

        <div className="relative glass-card rounded-2xl p-1">
          <div className="bg-cyber-900/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-cyber-700/50">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/20 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-4 shadow-neon-cyan"
              >
                <Icon name="chart" size={28} className="text-neon-cyan" />
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {view === 'login' && 'Добро пожаловать'}
                    {view === 'register' && 'Создать аккаунт'}
                    {view === 'reset' && 'Восстановление пароля'}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {view === 'login' && 'Войдите чтобы продолжить анализ сделок'}
                    {view === 'register' && 'Начните вести дневник трейдера бесплатно'}
                    {view === 'reset' && 'Мы отправим ссылку для сброса пароля'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Forms */}
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {view === 'login' && (
                  <LoginForm
                    savedEmail={savedEmail}
                    onSwitchToRegister={() => setView('register')}
                    onSwitchToReset={() => setView('reset')}
                  />
                )}
                {view === 'register' && (
                  <RegisterForm
                    savedEmail={savedEmail}
                    onSwitchToLogin={() => setView('login')}
                    onEmailChange={setSavedEmail}
                  />
                )}
                {view === 'reset' && (
                  <PasswordReset savedEmail={savedEmail} onSwitchToLogin={() => setView('login')} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Security badge */}
            <div className="mt-6 pt-6 border-t border-cyber-700/30">
              <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                <div className="w-4 h-4 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
                  <Icon name="shield" size={10} className="text-neon-green" />
                </div>
                <span>Защищено сквозным шифрованием</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
