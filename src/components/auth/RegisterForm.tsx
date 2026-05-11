import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AppProviders';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  savedEmail: string;
  onSwitchToLogin: () => void;
  onEmailChange: (email: string) => void;
}

export function RegisterForm({ savedEmail, onSwitchToLogin, onEmailChange }: RegisterFormProps) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
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
    console.log('[RegisterForm] Attempting registration for:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      console.error('[RegisterForm] Registration error:', error);
      toast.error(error.message);
      setLoading(false);
      return;
    }

    console.log('[RegisterForm] Registration result:', {
      userId: data?.user?.id,
      email: data?.user?.email,
      hasSession: !!data?.session,
    });

    if (data?.session) {
      console.log('[RegisterForm] Updating AuthContext with user:', data.session.user.id);

      // Обновляем локальное состояние auth
      setUser?.({
        id: data.session.user.id,
        username: username,
        email: data.session.user.email,
        subscription_tier: 'free',
        created_at: data.session.user.created_at,
      });

      toast.success('Аккаунт создан!');

      // Используем navigate вместо window.location
      navigate('/subscribe', { replace: true });
    } else {
      // Если нет сессии, значит нужна email подтверждение
      console.log('[RegisterForm] No session - email confirmation may be required');
      toast.success('Проверьте email для подтверждения аккаунта');
    }

    setLoading(false);
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
