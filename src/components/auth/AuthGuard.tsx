// ============================================================
// TradeumDiary — Защитник авторизации
// Перенаправляет неавторизованных пользователей на лендинг
// ============================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Показываем загрузку только если проверка ещё не завершена
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          {/* Пульсирующий логотип */}
          <div className="w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center animate-glow-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
              <path d="M3 17l4-8 4 6 6-10 3 4" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Сохраняем URL, куда хотел попасть пользователь
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}