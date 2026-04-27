import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProGuardProps {
  children: React.ReactNode;
}

export function ProGuard({ children }: ProGuardProps) {
  const { user, isLoading } = useAuth();

  // Пока загружается — показываем экран загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если пользователь есть, но подписка free — на страницу подписки
  if (user && user.subscription_tier !== 'pro') {
    return <Navigate to="/subscribe" replace />;
  }

  // Если пользователя нет (не авторизован) — AuthGuard уже должен был перехватить
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}