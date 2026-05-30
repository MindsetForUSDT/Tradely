import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  savedEmail: string;
  onSwitchToLogin: () => void;
  onEmailChange: (email: string) => void;
}

interface RegisterResponse {
  user: {
    id: string;
    username: string;
    email: string;
    subscription_tier: 'free' | 'pro';
    created_at: string;
  };
  token: string;
}

function getErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ERR_CONNECTION_REFUSED')
  ) {
    return 'Ошибка соединения с сервером. Проверьте подключение или попробуйте позже.';
  }
  if (msg.includes('already registered') || msg.includes('User already exists')) {
    return 'Пользователь с таким email уже существует. Пожалуйста, войдите.';
  }
  if (msg.includes('Password should be')) {
    return 'Пароль слишком простой. Используйте не менее 6 символов.';
  }
  return msg;
}

export function RegisterForm({ savedEmail, onSwitchToLogin, onEmailChange }: RegisterFormProps) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const clearStore = useStore((s) => s.resetStats);
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
    // Очищаем старые данные перед регистрацией
    localStorage.removeItem('tradeumdiary-user');
    localStorage.removeItem('tradeumdiary-user-id');
    localStorage.removeItem('tradeumdiary-store');
    localStorage.removeItem('sb-token');
    clearStore();

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const data = await api.post<RegisterResponse>('/auth/register', {
        email: normalizedEmail,
        password,
        username,
      });

      const { user, token } = data;

      if (!user || !token) {
        throw new Error('Ошибка регистрации');
      }

      // Устанавливаем токен для API
      api.setTokenProvider(() => Promise.resolve(token));

      setUser?.({
        id: user.id,
        username: user.username,
        email: user.email,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at,
      });

      toast.success('Аккаунт создан!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
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
