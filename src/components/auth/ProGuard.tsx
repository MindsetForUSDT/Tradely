import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

interface ProGuardProps {
  children: ReactNode;
  requirePro?: boolean;
}

export function ProGuard({ children, requirePro = false }: ProGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Не показываем ничего — AuthGuard уже показал загрузку
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const now = new Date();
  const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isTierActive = expiresAt && expiresAt > now;
  const isPro = user.subscription_tier === 'pro' && isTierActive;
  const isTrialActive = user.subscription_tier === 'free' && isTierActive;

  if (requirePro && !isPro) {
    return <Navigate to="/subscribe" replace />;
  }

  if (!isPro && !isTrialActive) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}