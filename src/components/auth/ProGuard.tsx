import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProGuardProps {
  children: React.ReactNode;
}

export function ProGuard({ children }: ProGuardProps) {
  const { user, isLoading } = useAuth();

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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const now = new Date();
  const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isTierActive = expiresAt && expiresAt > now;
  const isPro = user.subscription_tier === 'pro' && isTierActive;
  const isTrialActive = user.subscription_tier === 'free' && isTierActive;

  if (isPro || isTrialActive) {
    return <>{children}</>;
  }

  return <Navigate to="/subscribe" replace />;
}