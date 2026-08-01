import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { api } from '@/lib/api';

function passwordScore(password: string) {
  return [
    password.length >= 8,
    /[A-ZА-Я]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-zА-Яа-я0-9]/.test(password),
  ].filter(Boolean).length;
}

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), []);
  const strength = passwordScore(password);

  useEffect(() => {
    if (!token) setError('Недействительная ссылка восстановления');
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Недействительная ссылка восстановления');
      return;
    }
    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (strength < 2) {
      setError('Добавьте цифру, заглавную букву или специальный символ');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      window.setTimeout(() => navigate('/login'), 3000);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка обновления пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      mode="update"
      title={success ? 'Пароль обновлён' : 'Создайте новый пароль'}
      description={
        success
          ? 'Теперь можно безопасно вернуться в рабочее пространство.'
          : 'Используйте минимум восемь символов и не повторяйте пароль от биржи.'
      }
      footer={
        <>
          <span>Изменили решение?</span> <Link to="/login">Вернуться ко входу</Link>
        </>
      }
    >
      {success ? (
        <div className="auth-success-state">
          <span>
            <CheckCircle size={28} weight="fill" />
          </span>
          <strong>Доступ восстановлен</strong>
          <p>Через несколько секунд вы будете перенаправлены на страницу входа.</p>
          <Link className="auth-secondary-action" to="/login">
            Войти сейчас <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Новый пароль
            <PasswordInput
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder="Минимум 8 символов"
              disabled={loading}
              autoComplete="new-password"
              autoFocus
            />
            {password ? (
              <span className="auth-strength">
                <i style={{ width: `${Math.max(1, strength) * 25}%` }} />
                <small>{strength >= 3 ? 'Надёжный пароль' : 'Можно сделать надёжнее'}</small>
              </span>
            ) : null}
          </label>
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
            />
          </label>
          {error ? (
            <div className="auth-error" role="alert">
              {error}
            </div>
          ) : null}
          <button
            className="auth-submit"
            type="submit"
            disabled={loading || !password || !confirmPassword}
          >
            <span>{loading ? 'Сохраняем…' : 'Сохранить пароль'}</span>
            <i aria-hidden="true">
              <ArrowRight size={18} />
            </i>
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
