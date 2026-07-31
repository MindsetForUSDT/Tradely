import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, SignOut } from '@phosphor-icons/react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { useAuth } from '@/hooks/useAuth';

export function Logout() {
  const { signOut } = useAuth();
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    void signOut().finally(() => {
      if (active) setFinished(true);
    });
    return () => {
      active = false;
    };
  }, [signOut]);

  return (
    <AuthFrame
      title={finished ? 'Выход выполнен' : 'Завершаем сессию'}
      description={
        finished
          ? 'Вы успешно вышли из аккаунта. Данные рабочего пространства остались защищены.'
          : 'Безопасно закрываем текущую сессию.'
      }
      footer={<Link to="/">Вернуться на главную</Link>}
    >
      <div className="auth-success-state auth-logout-state" aria-live="polite">
        <span>{finished ? <CheckCircle size={28} weight="fill" /> : <SignOut size={25} />}</span>
        <strong>{finished ? 'Сессия завершена' : 'Один момент…'}</strong>
        <p>
          {finished
            ? 'Для продолжения работы войдите снова. Подключённые источники не получают доступ к средствам.'
            : 'Удаляем данные авторизации из этого браузера.'}
        </p>
        {finished ? (
          <Link className="auth-submit auth-logout-action" to="/login">
            <span>Войти снова</span>
            <i>
              <ArrowRight size={18} />
            </i>
          </Link>
        ) : null}
      </div>
    </AuthFrame>
  );
}
