import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Предотвращаем перезагрузку страницы

    if (!username || !email || !password) {
      toast.error('Заполните все поля');
      return;
    }

    if (username.length < 3) {
      toast.error('Имя пользователя минимум 3 символа');
      return;
    }

    if (password.length < 8) {
      toast.error('Пароль минимум 8 символов');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }, // Метаданные пользователя
        },
      });

      if (error) {
        toast.error(error.message === 'User already registered'
          ? 'Пользователь с таким email уже существует'
          : error.message);
        return;
      }

      if (data.user) {
        toast.success('Аккаунт создан!');
        navigate('/dashboard', { replace: true }); // Клиентский переход без перезагрузки
      }
    } catch (err) {
      toast.error('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4" noValidate>
      <div>
        <label htmlFor="register-username" className="sr-only">
          Имя пользователя
        </label>
        <input
          id="register-username"
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          required
          minLength={3}
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
      </div>

      <div>
        <label htmlFor="register-email" className="sr-only">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
      </div>

      <div>
        <label htmlFor="register-password" className="sr-only">
          Пароль
        </label>
        <input
          id="register-password"
          type="password"
          placeholder="Пароль (мин. 8 символов)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Регистрация...' : 'Создать аккаунт'}
      </button>

      <p className="text-center text-sm text-text-muted">
        Уже есть аккаунт?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-accent-green font-medium hover:underline"
        >
          Войти
        </button>
      </p>
    </form>
  );
}