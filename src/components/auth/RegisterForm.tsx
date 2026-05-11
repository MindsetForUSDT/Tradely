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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Ошибка соединения с сервером. Проверьте подключение к интернету или попробуйте позже.';
  }
  if (msg.includes('User already registered')) {
    return 'Пользователь с таким email уже зарегистрирован';
  }
  if (msg.includes('Password should be')) {
    return 'Пароль слишком простой. Используйте не менее 6 символов.';
  }
  return msg;
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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      toast.error('Сервис регистрации временно недоступен. Не настроены параметры подключения.');
      return;
    }

    setLoading(true);
    console.log('[RegisterForm] Attempting registration for:', email);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) {
        console.error('[RegisterForm] Registration error:', error);
        toast.error(getErrorMessage(error));
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

        setUser?.({
          id: data.session.user.id,
          username: username,
          email: data.session.user.email,
          subscription_tier: 'free',
          created_at: data.session.user.created_at,
        });

        toast.success('Аккаунт создан!');
        navigate('/subscribe', { replace: true });
      } else {
        console.log('[RegisterForm] No session - email confirmation may be required');
        toast.success('Проверьте email для подтверждения аккаунта');
      }
    } catch (err) {
      console.error('[RegisterForm] Unexpected error:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
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
