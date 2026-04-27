import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallets';

interface ProGuardProps {
  children: ReactNode;
  requirePro?: boolean; // true = только PRO, false = PRO или триал
}

export function ProGuard({ children, requirePro = false }: ProGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { wallets, isLoading: walletsLoading } = useWallets();

  // Единый loading state
  if (authLoading || walletsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Не авторизован
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const now = new Date();
  const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isTierActive = expiresAt && expiresAt > now;
  const isPro = user.subscription_tier === 'pro' && isTierActive;
  const isTrialActive = user.subscription_tier === 'free' && isTierActive;

  // Если требуется строго PRO — проверяем
  if (requirePro && !isPro) {
    return <Navigate to="/subscribe" replace />;
  }

  // Если PRO или активный триал — пускаем
  if (isPro || isTrialActive) {
    // Проверка: есть ли кошелёк?
    if (!wallets || wallets.length === 0) {
      return <Navigate to="/dashboard/wallets?required=true" replace />;
    }
    return <>{children}</>;
  }

  // Триал истёк
  return <Navigate to="/subscribe" replace />;
}