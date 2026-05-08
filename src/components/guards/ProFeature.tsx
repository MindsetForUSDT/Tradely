import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProFeatureProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProFeature({ children, fallback }: ProFeatureProps) {
  const { user } = useAuth();
  const now = new Date();
  const expiresAt = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isPro = user?.subscription_tier === 'pro' && expiresAt && expiresAt > now;

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-8 text-center bg-surface-elevated rounded-xl border border-surface-border">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h3 className="text-lg font-bold mb-2">PRO версия</h3>
      <p className="text-text-secondary text-sm mb-4 max-w-md mx-auto">
        Эта функция доступна только в PRO версии. Получите доступ к продвинутой аналитике, импорту
        сделок и риск-менеджменту.
      </p>
      <Link
        to="/subscribe"
        className="inline-block px-6 py-2.5 bg-accent-green text-surface rounded-xl text-sm font-semibold hover:bg-accent-green-dim transition-colors"
      >
        Перейти на PRO →
      </Link>
    </div>
  );
}
