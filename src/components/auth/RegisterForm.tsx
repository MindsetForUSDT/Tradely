import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  savedEmail: string;
  onSwitchToLogin: () => void;
  onEmailChange: (email: string) => void;
}

export function RegisterForm({ savedEmail, onSwitchToLogin, onEmailChange }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      toast.error('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      toast.error('Пароль минимум 6 символов');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data?.session) {
      localStorage.setItem(
        'tradeumdiary-auth',
        JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: data.session.user,
        })
      );
      toast.success('Аккаунт создан!');
      window.location.replace('/subscribe');
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Имя пользователя"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        className="input-field"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          onEmailChange(e.target.value);
        }}
        autoComplete="email"
        className="input-field"
      />
      <input
        type="password"
        placeholder="Пароль (мин. 6 символов)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        className="input-field"
      />
      <button onClick={handleRegister} disabled={loading} className="btn-primary w-full">
        {loading ? 'Регистрация...' : 'Создать аккаунт'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Уже есть аккаунт?{' '}
        <button onClick={onSwitchToLogin} className="text-accent-green font-medium hover:underline">
          Войти
        </button>
      </p>
    </div>
  );
}
