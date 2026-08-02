import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from '@phosphor-icons/react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { safeInternalPath } from '@/lib/productExperience';

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
  !value
    ? 'Введите пароль'
    : value.length < 8
      ? 'Минимум 8 символов'
      : !/[0-9]/.test(value)
        ? 'Добавьте хотя бы одну цифру'
        : undefined;
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = localStorage.getItem('selectedPlan');
  const requestedDestination =
    typeof location.state === 'object' && location.state !== null && 'from' in location.state
      ? location.state.from
      : null;
  const returnTo = safeInternalPath(
    requestedDestination,
    selectedPlan === 'pro' ? '/subscribe?selected=pro' : '/dashboard/wallets?onboarding=1'
  );
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
  if (!authLoading && isAuthenticated) return <Navigate to={returnTo} replace />;
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
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (!acceptedTerms) {
      setError('Подтвердите согласие с условиями и политикой конфиденциальности');
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
      }>('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      const { user } = response;
      if (!user) throw new Error('Ошибка регистрации');
      setUser({
        id: user.id,
        username: user.username,
        email: user.email,
        subscription_tier: user.subscription_tier as 'free' | 'pro',
        created_at: user.created_at,
      });
      toast.success('Аккаунт создан!');
      if (selectedPlan !== 'pro') localStorage.removeItem('selectedPlan');
      navigate(returnTo, { replace: true });
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
      {type === 'password' ? (
        <PasswordInput
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
            if (touched[name]) validateField(name, e.target.value);
          }}
          onBlur={() => blur(name, value)}
          placeholder={placeholder}
          disabled={loading}
          autoComplete="new-password"
          aria-invalid={!!fieldErrors[name] && !!touched[name]}
        />
      ) : (
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
      )}
      {fieldErrors[name] && touched[name] && (
        <small className="auth-field-error">{fieldErrors[name]}</small>
      )}
    </label>
  );

  return (
    <AuthFrame
      mode="register"
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
        {field(
          'password',
          'Пароль',
          password,
          setPassword,
          'password',
          'Минимум 8 символов и цифра'
        )}
        <label>
          Подтвердите пароль
          <PasswordInput
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError('');
            }}
            placeholder="Повторите пароль"
            disabled={loading}
            autoComplete="new-password"
            aria-invalid={Boolean(confirmPassword && confirmPassword !== password)}
          />
          {confirmPassword && confirmPassword !== password ? (
            <small className="auth-field-error">Пароли не совпадают</small>
          ) : null}
        </label>
        <label className="auth-check auth-terms-check">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
          />
          <span>
            Я принимаю <Link to="/terms">условия</Link> и{' '}
            <Link to="/privacy">политику конфиденциальности</Link>.
          </span>
        </label>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <button className="auth-submit" type="submit" disabled={loading}>
          <span>{loading ? 'Создаём аккаунт…' : 'Создать аккаунт'}</span>
          <i aria-hidden="true">
            <ArrowRight size={18} />
          </i>
        </button>
      </form>
    </AuthFrame>
  );
}
