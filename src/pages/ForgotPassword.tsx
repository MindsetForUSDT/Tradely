import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { api } from '@/lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Введите email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Некорректный формат email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ developmentResetUrl?: string }>('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setDevelopmentResetUrl(response.developmentResetUrl || '');
      setSent(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title={sent ? 'Проверьте почту' : 'Восстановить доступ'}
      description={
        sent
          ? `Ссылка для сброса отправлена на ${email}.`
          : 'Отправим одноразовую ссылку. Она будет действовать в течение часа.'
      }
      footer={
        <>
          <span>Вспомнили пароль?</span> <Link to="/login">Вернуться ко входу</Link>
        </>
      }
    >
      {sent ? (
        <div className="auth-success-state">
          <span>
            <CheckCircle size={28} weight="fill" />
          </span>
          <strong>Письмо уже в пути</strong>
          <p>Если его нет во входящих, проверьте «Спам» и правильность адреса.</p>
          {developmentResetUrl ? (
            <a href={developmentResetUrl}>Открыть тестовую ссылку восстановления</a>
          ) : null}
          <Link className="auth-secondary-action" to="/login">
            Вернуться ко входу <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleReset}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              placeholder="name@domain.com"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </label>
          {error ? (
            <div className="auth-error" role="alert">
              {error}
            </div>
          ) : null}
          <button className="auth-submit" type="submit" disabled={loading}>
            <span>{loading ? 'Отправляем…' : 'Отправить ссылку'}</span>
            <i aria-hidden="true">
              <ArrowRight size={18} />
            </i>
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
