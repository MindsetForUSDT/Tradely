// ============================================================
// TradeumDiary — Защитник PRO-подписки
// Перенаправляет free-пользователей на страницу подписки
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProGuardProps {
  children: React.ReactNode;
}

export function ProGuard({ children }: ProGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center animate-glow-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
            <path d="M3 17l4-8 4 6 6-10 3 4" />
          </svg>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Проверяем статус подписки
  const isPro = user.subscription_tier === 'pro';
  const isSubscriptionValid = isPro && user.subscription_expires_at
    ? new Date(user.subscription_expires_at) > new Date()
    : false;

  if (!isPro || !isSubscriptionValid) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}