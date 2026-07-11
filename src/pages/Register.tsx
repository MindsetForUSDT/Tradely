import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface ValidationErrors {
  email?: string;
  password?: string;
  username?: string;
}
const validateEmail = (value: string) =>
  !value
    ? 'Введите email'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? 'Некорректный формат email'
      : undefined;
const validatePassword = (value: string) =>
  !value ? 'Введите пароль' : value.length < 6 ? 'Минимум 6 символов' : undefined;
const validateUsername = (value: string) =>
  !value ? 'Введите имя пользователя' : value.length < 2 ? 'Минимум 2 символа' : undefined;
function getErrorMessage(err: unknown) {
  return err instanceof Error
    ? err.message
    : typeof err === 'string'
      ? err
      : 'Ошибка при регистрации';
}

export function Register() {
  const { isAuthenticated, isLoading: authLoading, setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const validateField = useCallback((name: keyof ValidationErrors, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () =>
        setFieldErrors((prev) => ({
          ...prev,
          [name]:
            name === 'email'
              ? validateEmail(value)
              : name === 'password'
                ? validatePassword(value)
                : validateUsername(value),
        })),
      250
    );
  }, []);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );
  if (!authLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (authLoading)
    return (
      <div className="auth-loading">
        <span />
      </div>
    );
  const blur = (name: keyof ValidationErrors, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    setTouched({ username: true, email: true, password: true });
    if (errors.username || errors.email || errors.password) {
      setError('Проверьте введённые данные');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post<{
        success: boolean;
        user: {
          id: string;
          email: string;
          username: string;
          subscription_tier: string;
          created_at: string;
        };
        token: string;
      }>('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      const { user, token } = response;
      if (!user || !token) throw new Error('Ошибка регистрации');
      api.setTokenProvider(() => Promise.resolve(token));
      setUser(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          subscription_tier: user.subscription_tier as 'free' | 'pro',
          created_at: user.created_at,
        },
        token
      );
      toast.success('Аккаунт создан!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const field = (
    name: keyof ValidationErrors,
    label: string,
    value: string,
    setValue: (value: string) => void,
    type = 'text',
    placeholder = ''
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
          if (touched[name]) validateField(name, e.target.value);
        }}
        onBlur={() => blur(name, value)}
        placeholder={placeholder}
        disabled={loading}
        aria-invalid={!!fieldErrors[name] && !!touched[name]}
      />
      {fieldErrors[name] && touched[name] && (
        <small className="auth-field-error">{fieldErrors[name]}</small>
      )}
    </label>
  );

  return (
    <AuthFrame
      title="Создайте торговый дневник"
      description="Бесплатно, без карты. Первые данные появятся после подключения источника."
      footer={
        <>
          <span>Уже есть аккаунт?</span> <Link to="/login">Войти</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleRegister}>
        {field('username', 'Имя пользователя', username, setUsername, 'text', 'trader_01')}
        {field('email', 'Email', email, setEmail, 'email', 'trader@example.com')}
        {field('password', 'Пароль', password, setPassword, 'password', 'Минимум 6 символов')}
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </button>
        <p className="auth-terms">
          Продолжая, вы соглашаетесь с <Link to="/terms">условиями</Link> и{' '}
          <Link to="/privacy">политикой конфиденциальности</Link>.
        </p>
      </form>
    </AuthFrame>
  );
}
