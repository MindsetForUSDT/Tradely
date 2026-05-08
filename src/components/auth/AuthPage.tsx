import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { PasswordReset } from './PasswordReset';

type AuthView = 'login' | 'register' | 'reset';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [savedEmail, setSavedEmail] = useState('');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-0.5 rounded-2xl">
        <div className="bg-surface/90 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent-green"
              >
                <path d="M3 17l4-8 4 6 6-10 3 4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">
              {view === 'login' && 'Войти в TradeumDiary'}
              {view === 'register' && 'Создать аккаунт'}
              {view === 'reset' && 'Восстановление пароля'}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {view === 'login' && 'Анализируйте свои сделки как профессионал'}
              {view === 'register' && 'Начните вести дневник сделок бесплатно'}
              {view === 'reset' && 'Отправим ссылку для сброса пароля'}
            </p>
          </div>

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
        </div>
      </div>
      <p className="text-center text-xs text-text-muted mt-4">
        Защищено сквозным шифрованием. Ваши данные только у вас.
      </p>
    </div>
  );
}
